import { Router } from 'express';
import { prisma } from '../db.js';
import { getErrorMessage, prismaErrorStatus } from '../utils/errors.js';
import { respondError } from '../utils/logger.js';

export const cardsRouter = Router();

// Listar todos os cartões cadastrados
cardsRouter.get('/', async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });
    return res.json({ success: true, cards });
  } catch (error) {
    respondError(res, 500, 'Erro ao listar cartões: ' + getErrorMessage(error));
    return;
  }
});

// Remover cartão e suas faturas
cardsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.card.delete({
      where: { id },
    });
    return res.json({ success: true, message: 'Cartão removido com sucesso.' });
  } catch (error) {
    const status = prismaErrorStatus(error) || 500;
    respondError(res, status, 'Erro ao remover cartão: ' + getErrorMessage(error));
    return;
  }
});
