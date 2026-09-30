import type { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export function addMonthsToYearMonth(yearMonth: string, monthDelta: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  date.setMonth(date.getMonth() + monthDelta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function classifyItemType(description: string, amount: number, totalInstallments: number = 1, bankName?: string): 'PURCHASE' | 'FEE' | 'FINE' | 'INTEREST' | 'TAX' | 'CREDIT' {
  if (bankName === 'Atacadão' && totalInstallments > 1) {
    return 'PURCHASE';
  }
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

export type TotalsDb = PrismaClient | Prisma.TransactionClient;

export interface RecalculateOptions {
  monthReferenced?: string; // "YYYY-MM" — mes cuyo total usa override
  totalAmountOverride?: number; // total líquido enviado pelo modal de confirmación
}

export async function recalculateCardTotals(
  cardId: string,
  db: TotalsDb = prisma,
  opts: RecalculateOptions = {}
): Promise<void> {
  const allInvoices = await db.invoice.findMany({
    where: { cardId },
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

    const calculatedTotal = purchasesSum + fineSum + interestSum + taxesSum + feesSum + creditsSum;

    // Para a fatura do mês de referência, usar el total líquido enviado pelo modal
    // (totalAmountOverride = compras + taxas - créditos seleccionados).
    // Para faturas proyectadas (parcelas), mantener el recálculo desde items.
    const finalTotal =
      opts.monthReferenced !== undefined &&
      inv.monthYear === opts.monthReferenced &&
      opts.totalAmountOverride !== undefined
        ? opts.totalAmountOverride
        : Math.round(calculatedTotal * 100) / 100;

    await db.invoice.update({
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
}