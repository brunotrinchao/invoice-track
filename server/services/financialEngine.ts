import { prisma } from '../db.js';
import { ParsedCardTransactions, ExtractedInvoiceItem } from './parsers/InvoiceParserInterface.js';
import { addMonthsToYearMonth, classifyItemType, recalculateCardTotals } from './cardTotals.js';
import { applyRecurringToInvoice } from './recurringService.js';

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
  cards?: ParsedCardTransactions[];
  // Campos legados para suporte retrocompatível a cartão único
  bankName?: string;
  brand?: string;
  last4Digits?: string;
  items?: ExtractedInvoiceItem[];
  overwriteExisting?: boolean;
  pdfPassword?: string;
  declaredInvoiceTotal?: number; // Total a pagar declarado no boleto/PDF
}

export async function processInvoiceConfirmation(payload: ConfirmInvoicePayload) {
  const { monthReferenced, overwriteExisting, pdfPassword, declaredInvoiceTotal } = payload;

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

    for (const cardData of cardsList) {
      const { bankName, brand, last4Digits, items } = cardData;

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
        console.log(`[Financial Engine] Novo cartão criado no MySQL: ${bankName} (${last4Digits})`);
      } else if (pdfPassword && card.pdfPassword !== pdfPassword) {
        card = await tx.card.update({
          where: { id: card.id },
          data: { pdfPassword },
        });
      }

      // 2. Substituir/limpar os itens e taxas do mês de referência ao confirmar uma fatura
      // (só quando overwriteExisting=true, ou quando não há fatura prévia — evita perda de dados em re-confirmación acidental)
      const existingInvoice = await tx.invoice.findUnique({
        where: {
          cardId_monthYear: {
            cardId: card.id,
            monthYear: monthReferenced,
          },
        },
      });
      if (existingInvoice && overwriteExisting) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: existingInvoice.id },
        });
        await tx.invoiceFee.deleteMany({
          where: { invoiceId: existingInvoice.id },
        });
      }

      let createdItemsCount = 0;
      let projectedInvoicesCount = 0;

      // 3. Processar itens do cartão e projetar parcelas
      // (skip total quando a fatura já existe e overwrite=false — evita duplicar itens)
      const skipCurrentMonthItems = existingInvoice !== null && !overwriteExisting;

      for (const item of items) {
        const { description, amount, currentInstallment, totalInstallments } = item;
        const itemType = (item as any).itemType || classifyItemType(description, amount);

        const monthStartOffset = -(currentInstallment - 1);
        const firstMonth = addMonthsToYearMonth(monthReferenced, monthStartOffset);

        for (let k = 1; k <= totalInstallments; k++) {
          const targetMonth = addMonthsToYearMonth(firstMonth, k - 1);

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
                totalAmount: 0,
                declaredAmount: targetMonth === monthReferenced && declaredInvoiceTotal ? declaredInvoiceTotal : null,
              },
            });
            projectedInvoicesCount++;
          } else if (targetMonth === monthReferenced && declaredInvoiceTotal) {
            invoice = await tx.invoice.update({
              where: { id: invoice.id },
              data: { declaredAmount: declaredInvoiceTotal },
            });
          }

          // Se fatura atual existe e não há overwrite, não duplicar items do mês atual
          if (skipCurrentMonthItems && targetMonth === monthReferenced) {
            continue;
          }

          // Se estiver alocando o item na fatura do mês de referência sendo confirmada, crie um novo item individual.
          if (targetMonth === monthReferenced) {
            await tx.invoiceItem.create({
              data: {
                invoiceId: invoice.id,
                description,
                originalAmount: amount,
                currentInstallment: k,
                totalInstallments,
                itemType,
                extractedBy: (item as any).extractedBy || 'ai',
              },
            });
            createdItemsCount++;

            // Se for encargo, tarifa, multa, juros ou tributo, popula a tabela dedicada invoice_fees
            if (itemType !== 'PURCHASE' && itemType !== 'CREDIT') {
              await tx.invoiceFee.create({
                data: {
                  invoiceId: invoice.id,
                  description,
                  amount,
                  feeType: itemType,
                },
              });
            }
          } else {
            const existingItem = await tx.invoiceItem.findFirst({
              where: {
                invoiceId: invoice.id,
                description,
                currentInstallment: k,
                totalInstallments,
                originalAmount: amount,
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
                  extractedBy: 'ai',
                },
              });
              createdItemsCount++;
            }
          }
        }
      }

      // 3.5 Aplicar recorrentes ativos ao mês referenciado ANTES do recálculo de totals
      await applyRecurringToInvoice(card.id, monthReferenced, tx);

      // 4. Recalcular o valor total e o desmembramento das faturas deste cartão no MySQL
      await recalculateCardTotals(card.id, tx, {
        monthReferenced,
        totalAmountOverride: cardData.totalAmount,
      });

      processedCardsResult.push({
        card,
        createdItemsCount,
        projectedInvoicesCount,
      });
    }

    return {
      processedCardsResult,
      targetMonth: monthReferenced,
    };
  });
}
