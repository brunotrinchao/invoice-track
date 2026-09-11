import { Router } from 'express';
import { prisma } from '../db.js';

export const invoicesRouter = Router();

// Listar faturas com filtros por cartão, mês específico ou ano
invoicesRouter.get('/', async (req, res) => {
  try {
    const { cardId, monthYear, year } = req.query;

    const where: any = {};
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

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        card: true,
        items: true,
        fees: true,
      },
      orderBy: { monthYear: 'desc' },
    });

    return res.json({ success: true, invoices });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao listar faturas: ' + error.message });
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
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao detalhar fatura: ' + error.message });
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
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao excluir fatura: ' + error.message });
  }
});

// Exclusão em lote de múltiplas faturas (com deleção em cascata de itens e taxas)
invoicesRouter.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID de fatura fornecido para exclusão.' });
    }

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
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro na exclusão em lote de faturas: ' + error.message });
  }
});

// Alterar status Pago -> Não Pago de uma fatura
invoicesRouter.patch('/:id/toggle-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaid } = req.body;

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
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar status da fatura: ' + error.message });
  }
});
