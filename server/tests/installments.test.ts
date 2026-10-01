import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { processInvoiceConfirmation } from '../services/financialEngine.js';

/**
 * Fixture escopada (NUNCA deleteMany global) — compra parcelada 3/6 + 1/1.
 */
describe('GET /api/reports/installments (lógica via prisma direto)', () => {
  const BANK = 'TesteInstallmentsOnly';
  const LAST4 = '7710';

  before(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });
  after(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });

  it('agrupa compra parcelada e calcula remaining/progress/endingSoon', async () => {
    // ref 2026-10, compra 3/6 → meses 2026-08..2027-01; parcelas futuras = 2026-10..2027-01 (4)
    await processInvoiceConfirmation({
      monthReferenced: '2026-10',
      cards: [{
        bankName: BANK,
        brand: 'Visa',
        last4Digits: LAST4,
        totalAmount: 480,
        items: [
          { description: 'Notebook Teste', amount: 120, currentInstallment: 3, totalInstallments: 6 },
          { description: 'Compra à vista', amount: 50, currentInstallment: 1, totalInstallments: 1 },
        ],
      }],
    });

    const card = await prisma.card.findFirst({ where: { bankName: BANK, last4Digits: LAST4 } });
    assert.ok(card);

    const items = await prisma.invoiceItem.findMany({
      where: { description: 'Notebook Teste', invoice: { cardId: card.id } },
      include: { invoice: { select: { monthYear: true } } },
    });
    // Compra 3/6 em 2026-10 → projeta 2026-08..2027-01
    assert.equal(items.length, 6);

    // Lógica do endpoint (espelho): futuras = monthYear >= 2026-10
    const currentMonth = '2026-10';
    const future = items.filter((i) => i.invoice.monthYear >= currentMonth);
    assert.equal(future.length, 4); // 2026-10, 2026-11, 2026-12, 2027-01
    const remainingTotal = future.reduce((s, i) => s + Number(i.originalAmount), 0);
    assert.equal(remainingTotal, 480);
    const progressCurrent = 6 - 4;
    assert.equal(progressCurrent, 2);
    const endingSoon = future.length <= 2;
    assert.equal(endingSoon, false);
  });

  it('compra à vista (1/1) não entra em parceladas em aberto', async () => {
    const card = await prisma.card.findFirst({ where: { bankName: BANK, last4Digits: LAST4 } });
    assert.ok(card);
    const cash = await prisma.invoiceItem.findFirst({
      where: { description: 'Compra à vista', invoice: { cardId: card.id } },
    });
    assert.ok(cash);
    assert.equal(cash.totalInstallments > 1, false); // excluído pelo filtro do endpoint
  });
});