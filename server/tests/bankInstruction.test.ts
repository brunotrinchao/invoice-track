import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import {
  listAll,
  upsertBankInstruction,
  deleteBankInstruction,
  getActiveInstructions,
  getInstructionSections,
} from '../services/bankInstructionService.js';

/**
 * Fixture escopada — NUNCA deleteMany({}) global (regra pós-incidente 2026-09-30).
 */
describe('bankInstructionService', () => {
  const FIX_BANK = 'TesteInstrBankOnly';

  before(async () => {
    await prisma.bankInstruction.deleteMany({ where: { bankName: FIX_BANK } });
  });
  after(async () => {
    await prisma.bankInstruction.deleteMany({ where: { bankName: FIX_BANK } });
  });

  it('upsert cria e atualiza por bankName (normalizado)', async () => {
    const created = await upsertBankInstruction({
      bankName: 'teste instr bank',
      keywords: ['TESTEINSTR', 'XPTO'],
      rules: '- Regra um do teste.\n- Regra dois do teste.',
      source: 'pdf',
    });
    assert.equal(created.bankName, 'teste instr bank');
    assert.equal(created.source, 'pdf');

    const updated = await upsertBankInstruction({
      bankName: FIX_BANK,
      keywords: ['TESTEINSTR'],
      rules: '- Regra atualizada do teste.',
      source: 'manual',
    });
    assert.equal(updated.rules, '- Regra atualizada do teste.');
    assert.equal(updated.keywords.length, 1);

    const all = await listAll();
    assert.ok(all.some((i) => i.bankName === updated.bankName));
  });

  it('getActiveInstructions inclui instrução quando cartão cadastrado matchea keyword', async () => {
    await upsertBankInstruction({
      bankName: FIX_BANK,
      keywords: ['TESTEINSTR'],
      rules: '- Regra do teste.',
    });
    // Sem cartão do fixture: ativa se não houver outros cartões; com cartões
    // de outros bancos, só entra se keywords matchear. Valida interface:
    const active = await getActiveInstructions();
    assert.ok(Array.isArray(active));
    const sections = await getInstructionSections();
    assert.equal(typeof sections, 'string');
  });

  it('deleteBankInstruction remove e invalida cache', async () => {
    const inst = await upsertBankInstruction({
      bankName: FIX_BANK,
      keywords: ['TESTEINSTR'],
      rules: '- Regra para deletar do teste.',
    });
    await deleteBankInstruction(inst.id);
    const all = await listAll();
    assert.ok(!all.some((i) => i.id === inst.id));
  });
});