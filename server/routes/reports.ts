import { Router } from 'express';
import { prisma } from '../db.js';
import type { Prisma } from '@prisma/client';
import { addMonthsToYearMonth, classifyItemType } from '../services/financialEngine.js';
import { getErrorMessage } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const reportsRouter = Router();

interface RecurringReportItem {
  id: string;
  description: string;
  amount: number;
  recurringItemId: string | null;
  invoiceId: string | null;
  cardId: string;
  isPaid: boolean;
  projected: boolean;
}

reportsRouter.get('/predictability', async (req, res) => {
  try {
    const { cardIds, from, to, status, banks } = req.query;

    // Filter by multiple cards (if provided)
    let selectedCardIds: string[] = [];
    if (cardIds && typeof cardIds === 'string' && cardIds.trim().length > 0) {
      selectedCardIds = cardIds.split(',').map((s) => s.trim());
    }

    // Filter by bank names: resolve cards by bankName and combine with cardIds
    // via intersection (when both are provided). No matching cards -> empty result.
    if (banks && typeof banks === 'string' && banks.trim().length > 0) {
      const bankNames = banks.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      if (bankNames.length > 0) {
        const bankCards = await prisma.card.findMany({
          where: { bankName: { in: bankNames } },
          select: { id: true },
        });
        const bankCardIds = bankCards.map((c) => c.id);
        if (selectedCardIds.length > 0) {
          const cardIdSet = new Set(selectedCardIds);
          selectedCardIds = bankCardIds.filter((id) => cardIdSet.has(id));
        } else {
          selectedCardIds = bankCardIds;
        }
        // Banks provided but no cards match -> force empty result (avoid returning everything)
        if (selectedCardIds.length === 0) {
          selectedCardIds = ['__no_card_matches__'];
        }
      }
    }

    const whereCard: Prisma.InvoiceWhereInput = {};
    if (selectedCardIds.length > 0) {
      whereCard.cardId = { in: selectedCardIds };
    }

    // Filtro por status de pagamento (isPaid)
    if (status === 'paid') {
      whereCard.isPaid = true;
    } else if (status === 'unpaid') {
      whereCard.isPaid = false;
    }

    // Filtro por período (YYYY-MM) — afeta timeline e métricas
    let periodFrom: string | null = null;
    let periodTo: string | null = null;
    if (from && typeof from === 'string' && /^\d{4}-\d{2}$/.test(from)) periodFrom = from;
    if (to && typeof to === 'string' && /^\d{4}-\d{2}$/.test(to)) periodTo = to;

    if (periodFrom && periodTo) {
      whereCard.monthYear = { gte: periodFrom, lte: periodTo };
    } else if (periodFrom) {
      whereCard.monthYear = { gte: periodFrom };
    } else if (periodTo) {
      whereCard.monthYear = { lte: periodTo };
    }

    // Buscar todas as faturas dos cartões selecionados
    const invoices = await prisma.invoice.findMany({
      where: whereCard,
      include: {
        card: true,
        items: true,
        fees: true,
      },
      orderBy: { monthYear: 'asc' },
    });

    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const nextMonth = addMonthsToYearMonth(currentMonth, 1);

    // Gerar timeline: se filtro de período informado, cobre o intervalo; senão, 12 meses a partir do corrente
    const timelineMonths: string[] = [];
    if (periodFrom && periodTo) {
      let cursor = periodFrom;
      while (cursor <= periodTo) {
        timelineMonths.push(cursor);
        cursor = addMonthsToYearMonth(cursor, 1);
      }
    } else {
      for (let i = -2; i <= 9; i++) { // 2 meses passados para histórico + 10 meses futuros
        timelineMonths.push(addMonthsToYearMonth(currentMonth, i));
      }
    }

    // Estruturar dados por mês
    const monthlySummary = timelineMonths.map((m) => {
      const invoicesInMonth = invoices.filter((inv) => inv.monthYear === m);

      let purchasesTotal = 0;
      let feesTotal = 0;
      let creditsTotal = 0;
      let total = 0;

      // Divisão por cartão e por banco
      const byCard: Record<string, number> = {};
      const byBank: Record<string, number> = {};

      for (const inv of invoicesInMonth) {
        let pAmount = Number(inv.purchasesAmount || 0);
        let fAmount = Number(inv.feesAmount || 0) + Number(inv.fineAmount || 0) + Number(inv.interestAmount || 0) + Number(inv.taxesAmount || 0);
        let cAmount = Number(inv.creditsAmount || 0);
        let invTotal = Number(inv.totalAmount || 0);

        // Se inv.purchasesAmount e inv.feesAmount não estiverem populados, fallback nos itens
        let itemsFallbackUsed = false;
        if (pAmount === 0 && fAmount === 0 && inv.items && inv.items.length > 0) {
          itemsFallbackUsed = true;
          for (const item of inv.items) {
            const val = Number(item.originalAmount || 0);
            const type = item.itemType || classifyItemType(item.description, val);
            if (type === 'FINE' || type === 'INTEREST' || type === 'TAX' || type === 'FEE') {
              fAmount += val;
            } else if (type === 'CREDIT') {
              cAmount += val;
            } else {
              pAmount += val;
            }
          }
        }

        // Se fAmount for 0, não houve fallback de items e existem taxas na relação `fees`, somá-las
        // (evita dupla contagem: os items já incluem taxas quando o fallback de items rodó)
        if (fAmount === 0 && !itemsFallbackUsed && inv.fees && inv.fees.length > 0) {
          fAmount = inv.fees.reduce((sum, f) => sum + Number(f.amount), 0);
        }

        // Se invTotal estiver zerado mas existirem itens/taxas, recalcula invTotal
        if (invTotal === 0 && (pAmount !== 0 || fAmount !== 0 || cAmount !== 0)) {
          invTotal = pAmount + fAmount + cAmount;
        }

        purchasesTotal += pAmount;
        feesTotal += fAmount;
        creditsTotal += cAmount;
        total += invTotal;

        const cardKey = `${inv.card.bankName} •••• ${inv.card.last4Digits}`;
        byCard[cardKey] = (byCard[cardKey] || 0) + invTotal;

        const bankKey = inv.card.bankName;
        byBank[bankKey] = (byBank[bankKey] || 0) + invTotal;
      }

      return {
        monthYear: m,
        total: Math.round(total * 100) / 100,
        purchasesTotal: Math.round(purchasesTotal * 100) / 100,
        feesTotal: Math.round(feesTotal * 100) / 100,
        creditsTotal: Math.round(creditsTotal * 100) / 100,
        byCard,
        byBank,
        invoiceCount: invoicesInMonth.length,
      };
    });

    // Métricas principais (KPIs)
    const currentMonthData = monthlySummary.find((m) => m.monthYear === currentMonth);
    const nextMonthData = monthlySummary.find((m) => m.monthYear === nextMonth);

    const futureMonths = monthlySummary.filter((m) => m.monthYear >= currentMonth);
    const totalCommittedFuture = futureMonths.reduce((sum, m) => sum + m.total, 0);
    const averageMonthly = futureMonths.length > 0 ? totalCommittedFuture / futureMonths.length : 0;

    return res.json({
      success: true,
      metrics: {
        currentMonthTotal: currentMonthData ? currentMonthData.total : 0,
        nextMonthTotal: nextMonthData ? nextMonthData.total : 0,
        totalCommittedFuture: Math.round(totalCommittedFuture * 100) / 100,
        averageMonthly: Math.round(averageMonthly * 100) / 100,
      },
      monthlySummary,
      selectedCardIds,
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro no relatório de previsibilidade');
    return res.status(500).json({ error: 'Erro ao gerar relatório: ' + getErrorMessage(error) });
  }
});

// Relatório de compras recorrentes: materializado (isRecurring=true) + projetado (active en rango sin fatura)
reportsRouter.get('/recurring', async (req, res) => {
  try {
    const { cardIds, from, to, banks } = req.query;

    // Filter by multiple cards (if provided)
    let selectedCardIds: string[] = [];
    if (cardIds && typeof cardIds === 'string' && cardIds.trim().length > 0) {
      selectedCardIds = cardIds.split(',').map((s) => s.trim());
    }

    // Filter by bank names: resolve cards by bankName and combine with cardIds
    // via intersection (when both are provided). No matching cards -> empty result.
    if (banks && typeof banks === 'string' && banks.trim().length > 0) {
      const bankNames = banks.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      if (bankNames.length > 0) {
        const bankCards = await prisma.card.findMany({
          where: { bankName: { in: bankNames } },
          select: { id: true },
        });
        const bankCardIds = bankCards.map((c) => c.id);
        if (selectedCardIds.length > 0) {
          const cardIdSet = new Set(selectedCardIds);
          selectedCardIds = bankCardIds.filter((id) => cardIdSet.has(id));
        } else {
          selectedCardIds = bankCardIds;
        }
        // Banks provided but no cards match -> force empty result (avoid returning everything)
        if (selectedCardIds.length === 0) {
          selectedCardIds = ['__no_card_matches__'];
        }
      }
    }

    // Filtro por período (YYYY-MM)
    let periodFrom: string | null = null;
    let periodTo: string | null = null;
    if (from && typeof from === 'string' && /^\d{4}-\d{2}$/.test(from)) periodFrom = from;
    if (to && typeof to === 'string' && /^\d{4}-\d{2}$/.test(to)) periodTo = to;

    const cardFilter: Prisma.InvoiceItemWhereInput = {};
    if (selectedCardIds.length > 0) {
      // InvoiceItem has no direct cardId — filter through the invoice relation
      cardFilter.invoice = { cardId: { in: selectedCardIds } };
    }

    // --- Materializado: items marcados como recorrentes en faturas existentes ---
    const materializedItems = await prisma.invoiceItem.findMany({
      where: {
        isRecurring: true,
        ...cardFilter,
        ...(periodFrom || periodTo
          ? { invoice: { monthYear: { gte: periodFrom || undefined, lte: periodTo || undefined } } }
          : {}),
      },
      include: {
        invoice: { select: { id: true, monthYear: true, isPaid: true, cardId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // --- Projetado: recorrentes activos en el rango sin fatura materializada ---
    const recurringFilter: Prisma.RecurringItemWhereInput = {
      active: true,
      ...(selectedCardIds.length > 0 ? { cardId: { in: selectedCardIds } } : {}),
    };
    if (periodFrom) {
      recurringFilter.startMonthYear = { lte: periodTo || '9999-12' };
    }
    if (periodTo) {
      recurringFilter.OR = [
        { endMonthYear: null },
        { endMonthYear: { gte: periodFrom || '0000-01' } },
      ];
    }
    const recurrings = await prisma.recurringItem.findMany({
      where: recurringFilter,
      include: {
        card: { select: { id: true, bankName: true, brand: true, last4Digits: true } },
      },
    });

    // Meses del rango (o 12 meses desde el actual si no hay filtro)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const months: string[] = [];
    if (periodFrom && periodTo) {
      let cursor = periodFrom;
      while (cursor <= periodTo) {
        months.push(cursor);
        cursor = addMonthsToYearMonth(cursor, 1);
      }
    } else {
      for (let i = -2; i <= 9; i++) {
        months.push(addMonthsToYearMonth(currentMonth, i));
      }
    }

    const monthSet = new Set(months);
    const materializedByMonth: Record<string, RecurringReportItem[]> = {};
    for (const item of materializedItems) {
      if (!monthSet.has(item.invoice.monthYear)) continue;
      (materializedByMonth[item.invoice.monthYear] = materializedByMonth[item.invoice.monthYear] || []).push({
        id: item.id,
        description: item.description,
        amount: Number(item.originalAmount),
        recurringItemId: item.recurringItemId,
        invoiceId: item.invoice.id,
        cardId: item.invoice.cardId,
        isPaid: item.invoice.isPaid,
        projected: false,
      });
    }

    const materializedIds = new Set(
      materializedItems.filter((i) => i.recurringItemId).map((i) => i.recurringItemId!)
    );

    // Faturas existentes por card+mes para saber qué proyectar
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        ...(selectedCardIds.length > 0 ? { cardId: { in: selectedCardIds } } : {}),
        monthYear: { in: months },
      },
      select: { cardId: true, monthYear: true },
    });
    const existingKeySet = new Set(existingInvoices.map((inv) => `${inv.cardId}|${inv.monthYear}`));

    const projectedByMonth: Record<string, RecurringReportItem[]> = {};
    for (const rec of recurrings) {
      if (materializedIds.has(rec.id)) continue; // ya materializado, no duplicar
      let cursor = rec.startMonthYear;
      while (cursor <= (rec.endMonthYear || '9999-12') && (!periodTo || cursor <= periodTo)) {
        if (monthSet.has(cursor)) {
          const key = `${rec.cardId}|${cursor}`;
          // Proyectar solo si no hay fatura materializada para ese mes (la fatura real ya lo cubre)
          if (!existingKeySet.has(key)) {
            (projectedByMonth[cursor] = projectedByMonth[cursor] || []).push({
              id: `proj_${rec.id}_${cursor}`,
              description: rec.description,
              amount: Number(rec.amount),
              recurringItemId: rec.id,
              invoiceId: null,
              cardId: rec.cardId,
              isPaid: false,
              projected: true,
            });
          }
        }
        cursor = addMonthsToYearMonth(cursor, 1);
      }
    }

    const monthsResult = months.map((m) => {
      const materialized = materializedByMonth[m] || [];
      const projected = projectedByMonth[m] || [];
      const total = Math.round(
        (materialized.reduce((s, item) => s + item.amount, 0) +
          projected.reduce((s, item) => s + item.amount, 0)) * 100
      ) / 100;
      return {
        monthYear: m,
        total,
        isProjected: materialized.length === 0 && projected.length > 0,
        materialized,
        projected,
        items: [...materialized, ...projected],
      };
    });

    // Métricas agregadas para el cliente (contrato app/composables/useReports.ts)
    const realMonths = monthsResult.filter((m) => !m.isProjected);
    const projectedMonths = monthsResult.filter((m) => m.isProjected);
    const monthlyAverage =
      realMonths.length > 0
        ? Math.round((realMonths.reduce((sum, m) => sum + m.total, 0) / realMonths.length) * 100) / 100
        : 0;
    // Próximo mes: primer mes proyectado (sin fatura materializada), o el último del timeline
    const nextMonthTotal = projectedMonths.length > 0
      ? projectedMonths[0].total
      : monthsResult.length > 0 ? monthsResult[monthsResult.length - 1].total : 0;

    const summary = {
      totalMaterialized: materializedItems.length,
      totalProjected: Object.values(projectedByMonth).reduce((sum, arr) => sum + arr.length, 0),
      activeRecurrings: recurrings.length,
      projectedMonthlyAmount: Object.values(projectedByMonth).reduce(
        (sum, arr) => sum + arr.reduce((s, item) => s + item.amount, 0),
        0
      ),
      // Campos consumidos por RecurringChart.vue
      monthlyAverage,
      nextMonthTotal,
      activeCount: recurrings.length,
      projectedMonths: projectedMonths.length,
    };

    return res.json({
      success: true,
      months: monthsResult,
      summary,
      selectedCardIds,
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro no relatório de recorrentes');
    return res.status(500).json({ error: 'Erro ao gerar relatório de recorrentes: ' + getErrorMessage(error) });
  }
});

