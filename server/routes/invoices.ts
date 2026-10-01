import { Router } from 'express';
import { prisma } from '../db.js';
import type { Prisma } from '@prisma/client';
import { classifyItemType } from '../services/cardTotals.js';
import { getErrorMessage, prismaErrorStatus } from '../utils/errors.js';
import { respondError } from '../utils/logger.js';
import { z } from 'zod';

export const invoicesRouter = Router();

const ITEM_TYPES = ['PURCHASE', 'FEE', 'FINE', 'INTEREST', 'TAX', 'CREDIT'];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Listar faturas com filtros por cartão, mês específico ou ano
const listQuerySchema = z.object({
  cardId: z.string().optional(),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  status: z.enum(['paid', 'unpaid', 'pending', 'overdue']).optional(),
});

const MAX_TAKE = 500;

invoicesRouter.get('/', async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return respondError(res, 400, 'Parâmetros de query inválidos: ' + parsed.error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`).join('; '));
    }
    const { cardId, monthYear, year, status } = parsed.data;

    const where: Prisma.InvoiceWhereInput = {};
    if (cardId && typeof cardId === 'string' && cardId !== 'all') {
      if (cardId.includes(',')) {
        where.cardId = { in: cardId.split(',') };
      } else {
        where.cardId = cardId;
      }
    }
    if (monthYear && typeof monthYear === 'string' && monthYear !== 'all') {
      where.monthYear = monthYear;
    } else if (year && typeof year === 'string' && year !== 'all') {
      where.monthYear = { startsWith: year };
    }

    if (status) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      if (status === 'paid') {
        where.isPaid = true;
      } else if (status === 'unpaid') {
        where.isPaid = false;
      } else if (status === 'pending') {
        where.isPaid = false;
        where.OR = [
          { dueDate: { gte: todayStart } },
          { dueDate: null },
        ];
      } else if (status === 'overdue') {
        where.isPaid = false;
        where.dueDate = { lt: todayStart };
      }
    }

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        include: {
          card: true,
          items: true,
          fees: true,
        },
        orderBy: { monthYear: 'desc' },
        take: MAX_TAKE,
      }),
      prisma.invoice.count({ where }),
    ]);

    return res.json({ success: true, invoices, meta: { total, take: MAX_TAKE } });
  } catch (error) {
    respondError(res, 500, 'Erro ao listar faturas: ' + getErrorMessage(error));
    return;
  }
});

// Detalhes de uma fatura específica
invoicesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        card: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
        fees: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    return res.json({ success: true, invoice });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao detalhar fatura: ' + getErrorMessage(error) });
  }
});

// Excluir uma fatura específica (com deleção em cascata de itens e taxas via FK)
invoicesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.invoice.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Fatura excluída com sucesso.',
      invoice: deleted,
    });
  } catch (error) {
    const status = prismaErrorStatus(error) || 500;
    return res.status(status).json({ error: 'Erro ao excluir fatura: ' + getErrorMessage(error) });
  }
});

// Exclusão em lote de múltiplas faturas (com deleção em cascata de itens e taxas)
const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

invoicesRouter.post('/bulk-delete', async (req, res) => {
  try {
    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, 400, 'Body inválido: ids deve ser um array não vazio de IDs.');
    }
    const { ids } = parsed.data;

    const deletedResult = await prisma.invoice.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return res.json({
      success: true,
      message: `${deletedResult.count} faturas excluídas com sucesso.`,
      count: deletedResult.count,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro na exclusão em lote de faturas: ' + getErrorMessage(error) });
  }
});

// Pagamento em lote: marca várias faturas como pago/não pago (updateMany; isPaid não afeta totals)
const bulkPaySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  isPaid: z.boolean(),
});

invoicesRouter.post('/bulk-pay', async (req, res) => {
  try {
    const parsed = bulkPaySchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, 400, 'Body inválido: ids deve ser array não vazio e isPaid boolean.');
    }
    const { ids, isPaid } = parsed.data;

    const result = await prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: { isPaid },
    });

    return res.json({
      success: true,
      message: `${result.count} fatura(s) marcada(s) como ${isPaid ? 'pagas' : 'não pagas'}.`,
      count: result.count,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro no pagamento em lote: ' + getErrorMessage(error) });
  }
});

// Alterar status Pago -> Não Pago de uma fatura
const togglePaidSchema = z.object({ isPaid: z.boolean().optional() });

invoicesRouter.patch('/:id/toggle-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = togglePaidSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return respondError(res, 400, 'Body inválido: isPaid deve ser boolean.');
    }
    const { isPaid } = parsed.data;

    const current = await prisma.invoice.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    const nextIsPaid = typeof isPaid === 'boolean' ? isPaid : !current.isPaid;

    const updated = await prisma.invoice.update({
      where: { id },
      data: { isPaid: nextIsPaid },
      include: {
        card: true,
      },
    });

    return res.json({
      success: true,
      message: `Fatura marcada como ${nextIsPaid ? 'Pago' : 'Não Pago'}.`,
      invoice: updated,
    });
  } catch (error) {
    const status = prismaErrorStatus(error) || 500;
    return res.status(status).json({ error: 'Erro ao atualizar status da fatura: ' + getErrorMessage(error) });
  }
});

// Editar fatura: substituir items (delete + recreate) e recalcular totals
invoicesRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items é obrigatório e deve ser um array.' });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    for (const item of items) {
      if (!item || typeof item.description !== 'string' || !item.description.trim()) {
        return res.status(400).json({ error: 'Cada item deve ter uma descripción válida.' });
      }
      if (typeof item.amount !== 'number' || Number.isNaN(item.amount) || item.amount === 0) {
        return res.status(400).json({ error: 'Cada item deve ter um amount numérico diferente de zero.' });
      }
      if (item.currentInstallment !== undefined && (typeof item.currentInstallment !== 'number' || item.currentInstallment < 1)) {
        return res.status(400).json({ error: 'Cada item deve ter currentInstallment >= 1.' });
      }
      if (item.totalInstallments !== undefined && (typeof item.totalInstallments !== 'number' || item.totalInstallments < 1)) {
        return res.status(400).json({ error: 'Cada item deve ter totalInstallments >= 1.' });
      }
      if (item.itemType !== undefined && !ITEM_TYPES.includes(item.itemType)) {
        return res.status(400).json({ error: `itemType inválido. Permitidos: ${ITEM_TYPES.join(', ')}.` });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      for (const item of items) {
        const itemType = item.itemType || classifyItemType(item.description, item.amount);
        await tx.invoiceItem.create({
          data: {
            invoiceId: id,
            description: item.description.trim(),
            originalAmount: item.amount,
            currentInstallment: item.currentInstallment ?? 1,
            totalInstallments: item.totalInstallments ?? 1,
            itemType,
            extractedBy: 'ai',
          },
        });
      }

      // Recalcular totals desde items (mismo criterio que recalculateCardTotals)
      let purchasesSum = 0;
      let feesSum = 0;
      let creditsSum = 0;

      const all = await tx.invoiceItem.findMany({ where: { invoiceId: id } });
      for (const it of all) {
        const type = it.itemType || classifyItemType(it.description, Number(it.originalAmount));
        const val = Number(it.originalAmount);
        if (type === 'CREDIT') creditsSum += val;
        else if (type === 'FEE' || type === 'FINE' || type === 'INTEREST' || type === 'TAX') feesSum += val;
        else purchasesSum += val;
      }

      await tx.invoice.update({
        where: { id },
        data: {
          totalAmount: round2(purchasesSum + feesSum + creditsSum),
          purchasesAmount: round2(purchasesSum),
          feesAmount: round2(feesSum),
          creditsAmount: round2(creditsSum),
        },
      });
    });

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: {
        card: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
        fees: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Fatura atualizada com sucesso.',
      invoice: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar fatura: ' + getErrorMessage(error) });
  }
});
