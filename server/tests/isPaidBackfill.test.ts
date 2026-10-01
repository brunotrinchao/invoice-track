import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { processInvoiceConfirmation } from '../services/financialEngine.js';

describe('isPaid backfill', () => {
  const BANK = 'TesteBackfillOnly';
  const LAST4 = '4400';

  before(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });
  after(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });

  it('isPaid=true marca faturas retroativas criadas como pagas', async () => {
    await processInvoiceConfirmation({
      monthReferenced: '2026-11',
      isPaid: true,
      overwriteExisting: true,
      cards: [{
        bankName: BANK,
        brand: 'Visa',
        last4Digits: LAST4,
        totalAmount: 300,
        items: [{ description: 'Compra Backfill', amount: 100, currentInstallment: 3, totalInstallments: 3 }],
      }],
    });
    const card = await prisma.card.findUnique({ where: { bankName_brand_last4Digits: { bankName: BANK, brand: 'Visa', last4Digits: LAST4 } } });
    const invoices = await prisma.invoice.findMany({ where: { cardId: card!.id } });
    const byMonth = Object.fromEntries(invoices.map(i => [i.monthYear, i.isPaid]));
    assert.equal(byMonth['2026-09'], true);
    assert.equal(byMonth['2026-10'], true);
    assert.equal(byMonth['2026-11'], true);
  });
});
