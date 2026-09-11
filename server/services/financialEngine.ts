import { prisma } from '../db.js';
import { ParsedCardTransactions, ExtractedInvoiceItem } from './parsers/InvoiceParserInterface.js';

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

export function classifyItemType(description: string, amount: number): 'PURCHASE' | 'FEE' | 'FINE' | 'INTEREST' | 'TAX' | 'CREDIT' {
  if (amount < 0 || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(description)) {
    return 'CREDIT';
  }
  const upper = (description || '').toUpperCase();
  if (upper.includes('MULTA')) {
    return 'FINE';
  }
  // IOF primero: "IOF do rotativo" es TAX, no INTEREST
  if (upper.includes('IOF') || upper.includes('IMPOSTO') || upper.includes('TRIBUTO')) {
    return 'TAX';
  }
  if (upper.includes('JUROS') || upper.includes('MORA') || upper.includes('ROTATIVO') || upper.includes('ENCARGO') || upper.includes('ENCARGOS') || upper.includes('REFINANCIAMENTO')) {
    return 'INTEREST';
  }
  if (
    upper.includes('TARIFA') ||
    upper.includes('ANUIDADE') ||
    upper.includes('TAXA') ||
    upper.includes('SEGURO') ||
    upper.includes('PROTEÇÃO') ||
    upper.includes('PROTECAO') ||
    upper.includes('SERVIÇO') ||
    upper.includes('SERVICO') ||
    upper.includes('COBRANÇA') ||
    upper.includes('COBRANCA')
  ) {
    return 'FEE';
  }
  return 'PURCHASE';
}

export function addMonthsToYearMonth(yearMonth: string, monthDelta: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  date.setMonth(date.getMonth() + monthDelta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
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

      // 4. Recalcular o valor total e o desmembramento das faturas deste cartão no MySQL
      const allInvoices = await tx.invoice.findMany({
        where: { cardId: card.id },
        include: { items: true, fees: true },
      });

      for (const inv of allInvoices) {
        let purchasesSum = 0;
        let fineSum = 0;
        let interestSum = 0;
        let taxesSum = 0;
        let feesSum = 0;
        let creditsSum = 0;

        for (const it of inv.items) {
          const val = Number(it.originalAmount);
          const type = (it as any).itemType || classifyItemType(it.description, val);
          if (type === 'FINE') fineSum += val;
          else if (type === 'INTEREST') interestSum += val;
          else if (type === 'TAX') taxesSum += val;
          else if (type === 'FEE') feesSum += val;
          else if (type === 'CREDIT') creditsSum += val;
          else purchasesSum += val;
        }

        // Incluir quaisquer taxas salvas em invoice_fees que eventualmente não estejam em items
        if (inv.fees && inv.fees.length > 0) {
          for (const fee of inv.fees) {
            const fVal = Number(fee.amount);
            const alreadyInItems = inv.items.some(
              (it) => it.description === fee.description && Math.abs(Number(it.originalAmount) - fVal) < 0.001
            );
            if (!alreadyInItems) {
              const fType = fee.feeType || classifyItemType(fee.description, fVal);
              if (fType === 'FINE') fineSum += fVal;
              else if (fType === 'INTEREST') interestSum += fVal;
              else if (fType === 'TAX') taxesSum += fVal;
              else feesSum += fVal;
            }
          }
        }

        // O valor total da fatura é a soma dos itens + soma das taxas/multas/juros/impostos + créditos
        const calculatedTotal = purchasesSum + fineSum + interestSum + taxesSum + feesSum + creditsSum;

        // Para a fatura do mês de referência, usar el total líquido enviado pelo modal
        // (cardData.totalAmount = compras + taxas - créditos seleccionados).
        // Para faturas proyectadas (parcelas), mantener el recálculo desde items.
        const finalTotal =
          inv.monthYear === monthReferenced && cardData.totalAmount !== undefined
            ? cardData.totalAmount
            : Math.round(calculatedTotal * 100) / 100;

        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            totalAmount: Math.round(finalTotal * 100) / 100,
            purchasesAmount: Math.round(purchasesSum * 100) / 100,
            fineAmount: Math.round(fineSum * 100) / 100,
            interestAmount: Math.round(interestSum * 100) / 100,
            taxesAmount: Math.round(taxesSum * 100) / 100,
            feesAmount: Math.round(feesSum * 100) / 100,
            creditsAmount: Math.round(creditsSum * 100) / 100,
          },
        });
      }

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
