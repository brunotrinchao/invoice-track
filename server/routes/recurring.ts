import { Router } from 'express';
import { prisma } from '../db.js';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  createRecurring,
  createRecurringFromItem,
  updateRecurring,
  deleteRecurring,
} from '../services/recurringService.js';
import { getErrorMessage } from '../utils/errors.js';
import { respondError } from '../utils/logger.js';

const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_TAKE = 500;

export const recurringRouter = Router();

// Listar recorrentes, opcionalmente filtrados por cartão
recurringRouter.get('/', async (req, res) => {
  try {
    const { cardId } = req.query;
    const where: Prisma.RecurringItemWhereInput = {};
    if (cardId && typeof cardId === 'string' && cardId.trim().length > 0 && cardId !== 'all') {
      where.cardId = cardId;
    }

    const [recurringItems, total] = await prisma.$transaction([
      prisma.recurringItem.findMany({
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
        take: MAX_TAKE,
      }),
      prisma.recurringItem.count({ where }),
    ]);

    return res.json({ success: true, recurringItems, meta: { total, take: MAX_TAKE } });
  } catch (error) {
    respondError(res, 500, 'Erro ao listar recorrentes: ' + getErrorMessage(error));
    return;
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
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao detalhar recorrente: ' + getErrorMessage(error) });
  }
});

// Criar recorrente (e propagar a faturas existentes)
const createSchema = z.object({
  cardId: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().refine((v) => v !== 0, 'amount não pode ser zero'),
  startMonthYear: z.string().regex(MONTH_RE),
  endMonthYear: z.string().regex(MONTH_RE).nullable().optional(),
});

recurringRouter.post('/', async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, 400, 'Campos obrigatórios: cardId, description, amount, startMonthYear (YYYY-MM).');
    }
    const { cardId, description, amount, startMonthYear, endMonthYear } = parsed.data;

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
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg && /inválido|não pode|recorrência/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: 'Erro ao criar recorrente: ' + getErrorMessage(error) });
  }
});

// Criar recorrente a partir de um item existente (adopta o item origem)
const fromItemSchema = z.object({
  itemId: z.string().min(1),
  cardId: z.string().min(1),
  description: z.string().min(1).optional(),
  amount: z.number().refine((v) => v !== 0, 'amount não pode ser zero').optional(),
  startMonthYear: z.string().regex(MONTH_RE),
  endMonthYear: z.string().regex(MONTH_RE).nullable().optional(),
});

recurringRouter.post('/from-item', async (req, res) => {
  try {
    const parsed = fromItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, 400, 'Campos obrigatórios: itemId, cardId, startMonthYear (YYYY-MM).');
    }
    const { itemId, cardId, description, amount, startMonthYear, endMonthYear } = parsed.data;

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
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg && /inválido|não pode|recorrência|Item não/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: 'Erro ao criar recorrente a partir do item: ' + msg });
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
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg && /inválido|não pode|recorrência|Recorrente não/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: 'Erro ao atualizar recorrente: ' + getErrorMessage(error) });
  }
});

// Eliminar recorrente (remueve instancias no pagas, conserva pagadas)
recurringRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteRecurring(id);

    return res.json({ success: true, message: 'Recorrente eliminado com sucesso.', ...result });
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg && /Recorrente não/i.test(msg)) {
      return res.status(404).json({ error: msg });
    }
    return res.status(500).json({ error: 'Erro ao eliminar recorrente: ' + msg });
  }
});