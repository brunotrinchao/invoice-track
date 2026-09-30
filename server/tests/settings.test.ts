import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { processInvoiceConfirmation } from '../services/financialEngine.js';

/**
 * ⚠️ Regra: testes E2E NUNCA usam deleteMany({}) global — só fixtures
 * escopadas (bankName/last4Digits únicos do teste). Este teste já causou
 * perda de dados reais em 2026-09-30; fica como exemplar negativo.
 */
describe('settings clear-data (escopado)', () => {
  const FIXTURE_BANK = 'TesteBankSettingsOnly';
  const FIXTURE_LAST4 = '7700';

  before(async () => {
    // Isolar: remover apenas resíduos do MESMO fixture
    await prisma.card.deleteMany({ where: { bankName: FIXTURE_BANK, last4Digits: FIXTURE_LAST4 } });
  });

  after(async () => {
    await prisma.card.deleteMany({ where: { bankName: FIXTURE_BANK, last4Digits: FIXTURE_LAST4 } });
  });

  it('cascata remove faturas/itens ao deletar cartão do fixture', async () => {
    await processInvoiceConfirmation({
      monthReferenced: '2026-09',
      cards: [{
        bankName: FIXTURE_BANK,
        brand: 'Visa',
        last4Digits: FIXTURE_LAST4,
        totalAmount: 100,
        items: [{ description: 'Compra A', amount: 100, currentInstallment: 1, totalInstallments: 2 }],
      }],
    });

    const created = await prisma.card.findFirst({ where: { bankName: FIXTURE_BANK, last4Digits: FIXTURE_LAST4 } });
    assert.ok(created);

    // DELETE /api/settings/data usa deleteMany({}) — NÃO reproduzir aqui;
    // validar cascata via delete do cartão do fixture apenas:
    await prisma.card.delete({ where: { id: created.id } });

    const invoicesLeft = await prisma.invoice.count({ where: { cardId: created.id } });
    assert.equal(invoicesLeft, 0);
  });
});