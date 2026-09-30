import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { processInvoiceConfirmation } from '../services/financialEngine.js';
import { prisma } from '../db.js';

/**
 * E2E (MySQL real): valida multi-cartão + projeção de parcelas do
 * processInvoiceConfirmation (mesma cobertura do antigo server/test_parser.ts,
 * agora integrado ao runner node:test com cleanup).
 */
describe('financialEngine E2E', () => {
  const BANK = 'Nubank';
  const LAST4 = '8899';
  const REF = '2026-09';

  before(async () => {
    // Isolar: remover resíduos de execuções anteriores do mesmo fixture
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });

  after(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });

  it('processa fatura multi-cartão e projeta parcelas futuras', async () => {
    const result = await processInvoiceConfirmation({
      monthReferenced: REF,
      cards: [
        {
          bankName: BANK,
          brand: 'Mastercard',
          last4Digits: LAST4,
          totalAmount: 475.5,
          items: [
            { description: 'Amazon Eletrônicos', amount: 250, currentInstallment: 2, totalInstallments: 5 },
            { description: 'Supermercado Pão de Açúcar', amount: 180.5, currentInstallment: 1, totalInstallments: 1 },
            { description: 'Drogaria São Paulo', amount: 45, currentInstallment: 1, totalInstallments: 3 },
          ],
          } satisfies {
          bankName: string;
          brand: string;
          last4Digits: string;
          totalAmount: number;
          items: { description: string; amount: number; currentInstallment: number; totalInstallments: number }[];
        },
      ],
    });

    const cardResult = result.processedCardsResult[0];
    assert.equal(cardResult.card.bankName, BANK);
    assert.equal(cardResult.card.last4Digits, LAST4);

    const invoices = await prisma.invoice.findMany({
      where: { cardId: cardResult.card.id },
      include: { items: true },
      orderBy: { monthYear: 'asc' },
    });

    // Parcelas 2/5 de 2026-09 → meses 2026-08..2026-12; 1/3 de 2026-09 → 2026-09..2026-11
    const months = invoices.map((i) => i.monthYear).sort();
    assert.ok(months.includes('2026-08'));
    assert.ok(months.includes('2026-12'));
    assert.equal(invoices.length >= 5, true);

    const invSep = invoices.find((i) => i.monthYear === '2026-09');
    assert.ok(invSep);
    // 3 itens no mês de referência: Amazon (2/5), Pão de Açúcar (1/1), Drogaria (1/3)
    assert.equal(invSep.items.length >= 3, true);
  });
});