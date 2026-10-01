import { prisma } from '../db.js';
import type { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

/** Coleta de dados compartilhada p/ Excel e PDF do export. */

export interface ExportParams {
  banks?: string[];
  from?: string;
  to?: string;
  status?: string;
}

export interface InstallmentRow {
  description: string;
  bankName: string;
  last4Digits: string;
  totalInstallments: number;
  currentInstallment: number;
  monthYear: string;
  amount: number;
}

export interface SummaryMonth {
  monthYear: string;
  total: number;
  purchasesTotal: number;
  feesTotal: number;
  creditsTotal: number;
  byBank: Record<string, number>;
}

export interface ExportPayload {
  installments: InstallmentRow[];
  metrics: {
    currentMonthTotal: number;
    nextMonthTotal: number;
    totalCommittedFuture: number;
    averageMonthly: number;
  };
  monthlySummary: SummaryMonth[];
}

/** Parcelas futuras + métricas/mensal (mesma semântica dos relatórios). */
export async function collectExportPayload(params: ExportParams): Promise<ExportPayload> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  let cardIds: string[] = [];
  if (params.banks?.length) {
    const bankCards = await prisma.card.findMany({ where: { bankName: { in: params.banks } }, select: { id: true } });
    cardIds = bankCards.map((c) => c.id);
  }

  const monthFilter = params.from
    ? { gte: params.from, ...(params.to ? { lte: params.to } : {}) }
    : { gte: currentMonth };

  const statusFilter =
    params.status === 'paid' ? { isPaid: true } : params.status === 'unpaid' ? { isPaid: false } : {};

  const futureItems = await prisma.invoiceItem.findMany({
    where: {
      itemType: 'PURCHASE',
      totalInstallments: { gt: 1 },
      invoice: {
        monthYear: monthFilter,
        ...(cardIds.length > 0 ? { cardId: { in: cardIds } } : {}),
        ...statusFilter,
      },
    },
    select: {
      description: true,
      originalAmount: true,
      currentInstallment: true,
      totalInstallments: true,
      invoice: { select: { monthYear: true, card: { select: { bankName: true, last4Digits: true } } } },
    },
    orderBy: { invoice: { monthYear: 'asc' } },
  });

  const installments: InstallmentRow[] = futureItems.map((item) => ({
    description: item.description,
    bankName: item.invoice.card.bankName,
    last4Digits: item.invoice.card.last4Digits,
    totalInstallments: item.totalInstallments,
    currentInstallment: item.currentInstallment,
    monthYear: item.invoice.monthYear,
    amount: Number(item.originalAmount),
  }));

  const predictInvoices = await prisma.invoice.findMany({
    where: {
      ...(cardIds.length > 0 ? { cardId: { in: cardIds } } : {}),
      ...statusFilter,
      monthYear: monthFilter,
    },
    include: { card: true, items: true, fees: true },
    orderBy: { monthYear: 'asc' },
  });

  const monthlySummary = summarizeMonths(predictInvoices, currentMonth);
  const metrics = computeMetrics(monthlySummary, currentMonth);
  logger.info({ rows: installments.length, months: monthlySummary.length }, 'Export payload coletado');
  return { installments, metrics, monthlySummary };
}

function summarizeMonths(invoices: Awaited<ReturnType<typeof prisma.invoice.findMany>>, currentMonth: string): SummaryMonth[] {
  const byMonth = new Map<string, SummaryMonth>();
  for (const inv of invoices) {
    let row = byMonth.get(inv.monthYear);
    if (!row) {
      row = { monthYear: inv.monthYear, total: 0, purchasesTotal: 0, feesTotal: 0, creditsTotal: 0, byBank: {} };
      byMonth.set(inv.monthYear, row);
    }
    const bankKey = inv.card.bankName;
    const invTotal = Number(inv.totalAmount || 0);
    row.purchasesTotal += Number(inv.purchasesAmount || 0);
    row.feesTotal += Number(inv.feesAmount || 0);
    row.creditsTotal += Number(inv.creditsAmount || 0);
    row.total += invTotal;
    row.byBank[bankKey] = Math.round(((row.byBank[bankKey] || 0) + invTotal) * 100) / 100;
  }
  return Array.from(byMonth.values()).sort((a, b) => a.monthYear.localeCompare(b.monthYear));
}

function computeMetrics(summary: SummaryMonth[], currentMonth: string): ExportPayload['metrics'] {
  const future = summary.filter((m) => m.monthYear >= currentMonth);
  const total = future.reduce((s, m) => s + m.total, 0);
  return {
    currentMonthTotal: summary.find((m) => m.monthYear === currentMonth)?.total ?? 0,
    nextMonthTotal: summary.find((m) => m.monthYear === addMonths(currentMonth, 1))?.total ?? 0,
    totalCommittedFuture: Math.round(total * 100) / 100,
    averageMonthly: future.length ? Math.round((total / future.length) * 100) / 100 : 0,
  };
}

function addMonths(monthYear: string, n: number): string {
  const [y, m] = monthYear.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
