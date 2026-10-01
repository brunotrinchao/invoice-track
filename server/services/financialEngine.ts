import { prisma } from '../db.js';
import type { Prisma } from '@prisma/client';
import { ParsedCardTransactions, ExtractedInvoiceItem } from './parsers/InvoiceParserInterface.js';
import { addMonthsToYearMonth, classifyItemType, recalculateCardTotals } from './cardTotals.js';
import { applyRecurringToInvoice, createRecurring } from './recurringService.js';
import { normalizeBankName } from './bankUtils.js';
import { logger } from '../utils/logger.js';

// Re-export para compatibilidade con rutas existentes (reports.ts)
export { addMonthsToYearMonth, classifyItemType };

const CARD_GRADIENTS: Record<string, string> = {
  Nubank: 'from-purple-700 via-purple-900 to-slate-900',
  Itaú: 'from-orange-600 via-amber-700 to-slate-900',
  Bradesco: 'from-red-600 via-rose-800 to-slate-900',
  Santander: 'from-red-700 via-red-950 to-slate-900',
  'Banco Inter': 'from-amber-500 via-orange-600 to-slate-900',
  'C6 Bank': 'from-gray-700 via-slate-800 to-black',
  'XP Bank': 'from-zinc-800 via-slate-900 to-black',
  'BTG Pactual': 'from-blue-800 via-indigo-950 to-black',
  PicPay: 'from-emerald-700 via-teal-900 to-slate-900',
};

export function getCardGradient(bankName: string): string {
  return CARD_GRADIENTS[bankName] || 'from-blue-600 via-slate-800 to-slate-900';
}

export interface ConfirmInvoicePayload {
  monthReferenced: string; // "YYYY-MM"
  dueDate?: string; // "YYYY-MM-DD"
  cards?: ParsedCardTransactions[];
  // Campos legados para suporte retrocompatível a cartão único
  bankName?: string;
  brand?: string;
  last4Digits?: string;
  items?: ExtractedInvoiceItem[];
  overwriteExisting?: boolean;
  overwriteMode?: 'all' | 'differences' | 'none';
  pdfPassword?: string;
  declaredInvoiceTotal?: number; // Total a pagar declarado no boleto/PDF
  isPaid?: boolean; // Marca a fatura do mês de referência como já paga
}

export function computeDueDateForMonthYear(monthYear: string, baseDueDate?: string | Date | null): Date {
  const [y, m] = monthYear.split('-').map(Number);
  let day = 10;
  if (baseDueDate) {
    const d = new Date(baseDueDate);
    if (!isNaN(d.getTime())) {
      day = d.getUTCDate();
    }
  }
  const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const validDay = Math.min(day, lastDayOfMonth);
  return new Date(Date.UTC(y, m - 1, validDay, 12, 0, 0));
}

export async function processInvoiceConfirmation(payload: ConfirmInvoicePayload) {
  const { monthReferenced, overwriteExisting, overwriteMode, pdfPassword, declaredInvoiceTotal, isPaid } = payload;
  const effectiveMode: 'all' | 'differences' | 'none' =
    overwriteMode || (overwriteExisting ? 'all' : 'none');

  // Normalizar lista de cartões (seja multi-cartão ou cartão único)
  let cardsList: ParsedCardTransactions[] = [];

  if (payload.cards && payload.cards.length > 0) {
    cardsList = payload.cards;
  } else if (payload.bankName && payload.brand && payload.last4Digits && payload.items) {
    cardsList = [
      {
        bankName: payload.bankName,
        brand: payload.brand,
        last4Digits: payload.last4Digits,
        totalAmount: payload.items.reduce((sum, i) => sum + Number(i.amount), 0),
        items: payload.items,
      },
    ];
  }

  return await prisma.$transaction(async (tx) => {
    const processedCardsResult = [];
    // Itens marcados como recorrentes na revisão — criados APÓS a transação
    // (createRecurring usa conexão própria; criando dentro do tx o backfill
    // não veria o item recém-criado e duplicaria).
    const recurringCreations: {
      cardId: string;
      description: string;
      amount: number;
      startMonthYear: string;
    }[] = [];

    for (const cardData of cardsList) {
      const bankName = normalizeBankName(cardData.bankName);
      const { brand, last4Digits, items } = cardData;

      // 1. Obter ou Criar o Cartão de Crédito no MySQL
      let card = await tx.card.findUnique({
        where: {
          bankName_brand_last4Digits: {
            bankName,
            brand,
            last4Digits,
          },
        },
      });

      if (!card) {
        card = await tx.card.create({
          data: {
            bankName,
            brand,
            last4Digits,
            colorGradient: getCardGradient(bankName),
            pdfPassword: pdfPassword || null,
          },
        });
        logger.info(`[Financial Engine] Novo cartão criado no MySQL: ${bankName} (${last4Digits})`);
      } else if (pdfPassword && card.pdfPassword !== pdfPassword) {
        card = await tx.card.update({
          where: { id: card.id },
          data: { pdfPassword },
        });
      }

      // 2. Substituir ou mesclar itens do mês de referência
      const existingInvoice = await tx.invoice.findUnique({
        where: {
          cardId_monthYear: {
            cardId: card.id,
            monthYear: monthReferenced,
          },
        },
        include: { _count: { select: { items: true } } },
      });

      if (existingInvoice && existingInvoice._count.items > 0 && effectiveMode === 'none') {
        throw new Error(
          `A fatura de ${monthReferenced} para o cartão ${bankName} (final ${last4Digits}) já foi importada no sistema. Escolha se deseja mesclar as diferenças ou sobrescrever.`
        );
      }

      if (existingInvoice && effectiveMode === 'all') {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: existingInvoice.id },
        });
        await tx.invoiceFee.deleteMany({
          where: { invoiceId: existingInvoice.id },
        });
      }

      let createdItemsCount = 0;
      let projectedInvoicesCount = 0;

      const affectedMonths = new Set<string>();
      affectedMonths.add(monthReferenced);

      // 3. Processar itens do cartão e projetar parcelas
      for (const item of items) {
        const { description, amount, currentInstallment, totalInstallments } = item;
        const itemType = item.itemType || classifyItemType(description, amount, totalInstallments, bankName);

        // Recorrente: só compra à vista positiva (modelo = 1/1 mensal)
        if (item.recurring && totalInstallments === 1 && amount > 0) {
          recurringCreations.push({
            cardId: card.id,
            description,
            amount,
            startMonthYear: monthReferenced,
          });
        }

        const monthStartOffset = -(currentInstallment - 1);
        const firstMonth = addMonthsToYearMonth(monthReferenced, monthStartOffset);

        for (let k = 1; k <= totalInstallments; k++) {
          const targetMonth = addMonthsToYearMonth(firstMonth, k - 1);
          affectedMonths.add(targetMonth);

          let invoice = await tx.invoice.findUnique({
            where: {
              cardId_monthYear: {
                cardId: card.id,
                monthYear: targetMonth,
              },
            },
          });

          if (!invoice) {
            invoice = await tx.invoice.create({
              data: {
                cardId: card.id,
                monthYear: targetMonth,
                dueDate: computeDueDateForMonthYear(targetMonth, payload.dueDate),
                totalAmount: 0,
                // Faturas anteriores (parcelas retroativas) também nascem pagas: o dinheiro
                // delas já saiu — estava na fatura anterior que o usuário pagou.
                isPaid: Boolean(isPaid) && targetMonth <= monthReferenced,
                declaredAmount: targetMonth === monthReferenced && declaredInvoiceTotal ? declaredInvoiceTotal : null,
              },
            });
            projectedInvoicesCount++;
          } else {
            const updateData: Prisma.InvoiceUpdateInput = {};
            if (targetMonth === monthReferenced && declaredInvoiceTotal) {
              updateData.declaredAmount = declaredInvoiceTotal;
            }
            if (targetMonth === monthReferenced && isPaid) {
              updateData.isPaid = true;
            }
            if (payload.dueDate) {
              updateData.dueDate = computeDueDateForMonthYear(targetMonth, payload.dueDate);
            }
            if (Object.keys(updateData).length > 0) {
              invoice = await tx.invoice.update({
                where: { id: invoice.id },
                data: updateData,
              });
            }
          }

          // Se estiver alocando o item na fatura do mês de referência com modo de mesclagem de diferenças
          if (targetMonth === monthReferenced && effectiveMode === 'differences' && existingInvoice) {
            const matchingItem = await tx.invoiceItem.findFirst({
              where: {
                invoiceId: invoice.id,
                description,
                currentInstallment: k,
                totalInstallments,
              },
            });

            if (matchingItem) {
              if (Math.abs(Number(matchingItem.originalAmount) - amount) >= 0.01) {
                await tx.invoiceItem.update({
                  where: { id: matchingItem.id },
                  data: { originalAmount: amount, itemType },
                });
              }
              continue;
            }
          }

          // Para o mês de referência ou meses projetados, verificar se o item da parcela já existe
          const existingItem = await tx.invoiceItem.findFirst({
            where: {
              invoiceId: invoice.id,
              description,
              currentInstallment: k,
              totalInstallments,
            },
          });

          if (!existingItem) {
            await tx.invoiceItem.create({
              data: {
                invoiceId: invoice.id,
                description,
                originalAmount: amount,
                currentInstallment: k,
                totalInstallments,
                itemType,
                extractedBy: 'ai' as const,
              },
            });
            createdItemsCount++;
          }

          // Se for encargo, tarifa, multa, juros ou tributo, popula a tabela dedicada invoice_fees
          if (itemType !== 'PURCHASE' && itemType !== 'CREDIT') {
            const existingFee = await tx.invoiceFee.findFirst({
              where: {
                invoiceId: invoice.id,
                description,
                amount,
              },
            });
            if (!existingFee) {
              await tx.invoiceFee.create({
                data: {
                  invoiceId: invoice.id,
                  description,
                  amount,
                  feeType: itemType,
                },
              });
            }
          }
        }
      }

      // 3.5 Aplicar recorrentes ativos a TODOS os meses criados/afetados deste cartão ANTES do recálculo de totals
      for (const monthYear of affectedMonths) {
        await applyRecurringToInvoice(card.id, monthYear, tx);
      }

      // 4. Recalcular o valor total e o desmembramento das faturas deste cartão no MySQL
      await recalculateCardTotals(card.id, tx, {
        monthReferenced,
        totalAmountOverride: cardData.totalAmount,
      });

      processedCardsResult.push({
        card,
        createdItemsCount,
        projectedInvoicesCount,
        recurringCreations,
      });
    }

    return {
      processedCardsResult,
      targetMonth: monthReferenced,
      recurringCreations,
    };
  }).then(async (result) => {
    // Pós-transação: regras recorrentes marcadas na revisão da fatura
    for (const r of result.recurringCreations) {
      try {
        await createRecurring(r);
        logger.info({ description: r.description }, 'Recorrente criado a partir da revisão');
      } catch (e) {
        logger.warn({ err: e, description: r.description }, 'Falha ao criar recorrente (fatura salva normalmente)');
      }
    }
    return result;
  });
}
