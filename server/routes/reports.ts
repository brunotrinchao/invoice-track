import { Router } from 'express';
import { prisma } from '../db.js';
import { addMonthsToYearMonth, classifyItemType } from '../services/financialEngine.js';

export const reportsRouter = Router();

reportsRouter.get('/predictability', async (req, res) => {
  try {
    const { cardIds, from, to, status } = req.query;

    // Filtro por múltiplos cartões (se fornecido)
    let selectedCardIds: string[] = [];
    if (cardIds && typeof cardIds === 'string' && cardIds.trim().length > 0) {
      selectedCardIds = cardIds.split(',').map((s) => s.trim());
    }

    const whereCard: any = {};
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
            const type = (item as any).itemType || classifyItemType(item.description, val);
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
  } catch (error: any) {
    console.error('Erro no relatório de previsibilidade:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório: ' + error.message });
  }
});

