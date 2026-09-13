import { Router } from 'express';
import { prisma } from '../db.js';
import {
  createRecurring,
  createRecurringFromItem,
  updateRecurring,
  deleteRecurring,
} from '../services/recurringService.js';

export const recurringRouter = Router();

// Listar recorrentes, opcionalmente filtrados por cartão
recurringRouter.get('/', async (req, res) => {
  try {
    const { cardId } = req.query;
    const where: any = {};
    if (cardId && typeof cardId === 'string' && cardId.trim().length > 0 && cardId !== 'all') {
      where.cardId = cardId;
    }

    const recurringItems = await prisma.recurringItem.findMany({
      where,
      include: {
        card: {
          select: { id: true, bankName: true, brand: true, last4Digits: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, recurringItems });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao listar recorrentes: ' + error.message });
  }
});

// Detalhes de um recorrente
recurringRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recurringItem = await prisma.recurringItem.findUnique({
      where: { id },
      include: {
        card: {
          select: { id: true, bankName: true, brand: true, last4Digits: true },
        },
        items: {
          include: { invoice: { select: { id: true, monthYear: true, isPaid: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!recurringItem) {
      return res.status(404).json({ error: 'Recorrente não encontrado.' });
    }

    return res.json({ success: true, recurringItem });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao detalhar recorrente: ' + error.message });
  }
});

// Criar recorrente (e propagar a faturas existentes)
recurringRouter.post('/', async (req, res) => {
  try {
    const { cardId, description, amount, startMonthYear, endMonthYear } = req.body;

    if (!cardId || !description || amount === undefined || !startMonthYear) {
      return res.status(400).json({ error: 'Campos obrigatórios: cardId, description, amount, startMonthYear.' });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return res.status(404).json({ error: 'Cartão não encontrado.' });
    }

    const result = await createRecurring({
      cardId,
      description,
      amount: Number(amount),
      startMonthYear,
      endMonthYear: endMonthYear || null,
    });

    return res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    if (error.message && /inválido|não pode|recorrência/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao criar recorrente: ' + error.message });
  }
});

// Criar recorrente a partir de um item existente (adopta o item origem)
recurringRouter.post('/from-item', async (req, res) => {
  try {
    const { itemId, cardId, description, amount, startMonthYear, endMonthYear } = req.body;

    if (!itemId || !cardId || !startMonthYear) {
      return res.status(400).json({ error: 'Campos obrigatórios: itemId, cardId, startMonthYear.' });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return res.status(404).json({ error: 'Cartão não encontrado.' });
    }

    const result = await createRecurringFromItem(itemId, {
      cardId,
      description: description || undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      startMonthYear,
      endMonthYear: endMonthYear || null,
    });

    return res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    if (error.message && /inválido|não pode|recorrência|Item não/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao criar recorrente a partir do item: ' + error.message });
  }
});

// Atualizar recorrente (re-propaga a faturas existentes)
recurringRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, startMonthYear, endMonthYear, active } = req.body;

    const result = await updateRecurring(id, {
      description: description !== undefined ? description : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      startMonthYear: startMonthYear || undefined,
      endMonthYear: endMonthYear !== undefined ? endMonthYear : undefined,
      active: active !== undefined ? Boolean(active) : undefined,
    });

    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message && /inválido|não pode|recorrência|Recorrente não/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao atualizar recorrente: ' + error.message });
  }
});

// Eliminar recorrente (remueve instancias no pagas, conserva pagadas)
recurringRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteRecurring(id);

    return res.json({ success: true, message: 'Recorrente eliminado com sucesso.', ...result });
  } catch (error: any) {
    if (error.message && /Recorrente não/i.test(error.message)) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao eliminar recorrente: ' + error.message });
  }
});