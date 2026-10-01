import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { processInvoiceConfirmation } from '../services/financialEngine.js';

describe('recurring na revisão da fatura', () => {
  const BANK = 'TesteRevRecOnly';
  const LAST4 = '9911';

  before(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });
  after(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });

  it('cria RecurringItem e adota o item (sem duplicar)', async () => {
    await processInvoiceConfirmation({
      monthReferenced: '2026-10',
      overwriteExisting: true,
      cards: [{
        bankName: BANK,
        brand: 'Visa',
        last4Digits: LAST4,
        totalAmount: 44.9,
        items: [
          { description: 'Netflix', amount: 44.9, currentInstallment: 1, totalInstallments: 1, recurring: true },
          { description: 'Pão', amount: 10, currentInstallment: 1, totalInstallments: 1 },
        ],
      }],
    });

    const recurring = await prisma.recurringItem.findMany({ where: { description: 'Netflix' } });
    assert.equal(recurring.length, 1);
    assert.equal(Number(recurring[0].amount), 44.9);
    assert.equal(recurring[0].startMonthYear, '2026-10');

    // ADOPT: só 1 item Netflix, com recurringItemId + isRecurring
    const items = await prisma.invoiceItem.findMany({ where: { description: 'Netflix' } });
    assert.equal(items.length, 1);
    assert.equal(items[0].recurringItemId, recurring[0].id);
    assert.equal(items[0].isRecurring, true);

    // compra normal não vira recorrente
    const pao = await prisma.invoiceItem.findMany({ where: { description: 'Pão' } });
    assert.equal(pao[0].recurringItemId, null);

    // parcelada com flag não cria recorrente
    await processInvoiceConfirmation({
      monthReferenced: '2026-10',
      overwriteExisting: true,
      cards: [{
        bankName: BANK, brand: 'Visa', last4Digits: LAST4, totalAmount: 10,
        items: [{ description: 'Notebook', amount: 100, currentInstallment: 1, totalInstallments: 10, recurring: true }],
      }],
    });
    const nb = await prisma.recurringItem.findMany({ where: { description: 'Notebook' } });
    assert.equal(nb.length, 0);
  });
});
