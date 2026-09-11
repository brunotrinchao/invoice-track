import { Router } from 'express';
import { prisma } from '../db.js';

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
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao listar cartões: ' + error.message });
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
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao remover cartão: ' + error.message });
  }
});
