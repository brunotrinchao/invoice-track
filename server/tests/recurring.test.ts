import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import {
  createRecurring,
  createRecurringFromItem,
  updateRecurring,
  deleteRecurring,
  applyRecurringToInvoice,
  backfill,
  validateRecurringRange,
} from '../services/recurringService.js';

// Test IDs para limpieza
const TEST_CARD_ID = 'test-card-recurring';
const TEST_CARD_ID_2 = 'test-card-recurring-2';

async function cleanup() {
  await prisma.recurringItem.deleteMany({ where: { cardId: { in: [TEST_CARD_ID, TEST_CARD_ID_2] } } });
  await prisma.invoice.deleteMany({ where: { cardId: { in: [TEST_CARD_ID, TEST_CARD_ID_2] } } });
  await prisma.card.deleteMany({ where: { id: { in: [TEST_CARD_ID, TEST_CARD_ID_2] } } });
}

async function setupCard(id: string, bankName = 'Test Bank') {
  await prisma.card.create({
    data: {
      id,
      bankName,
      brand: 'VISA',
      last4Digits: `99${id.slice(-2)}`,
      colorGradient: 'from-gray-700 via-slate-800 to-black',
    },
  });
}

async function setupInvoice(cardId: string, monthYear: string, isPaid = false) {
  return prisma.invoice.create({
    data: {
      cardId,
      monthYear,
      totalAmount: 0,
      isPaid,
    },
  });
}

async function setupItem(invoiceId: string, description: string, amount: number, extra: any = {}) {
  return prisma.invoiceItem.create({
    data: {
      invoiceId,
      description,
      originalAmount: amount,
      currentInstallment: 1,
      totalInstallments: 1,
      itemType: 'PURCHASE',
      extractedBy: 'ai',
      ...extra,
    },
  });
}

describe('recurringService', () => {
  before(async () => {
    await cleanup();
    await setupCard(TEST_CARD_ID);
    await setupCard(TEST_CARD_ID_2);
    // Faturas 2026-01..2026-04 (no pagas)
    for (const m of ['2026-01', '2026-02', '2026-03', '2026-04']) {
      await setupInvoice(TEST_CARD_ID, m);
    }
  });

  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test('createRecurring valida start > end', async () => {
    const err = await validateRecurringRange(TEST_CARD_ID, '2026-05', '2026-03');
    assert.ok(err, 'debería devolver error');
    assert.match(err!, /não pode ser anterior/);
  });

  test('createRecurring valida start antes de primera fatura no paga', async () => {
    const err = await validateRecurringRange(TEST_CARD_ID, '2025-12', null);
    assert.ok(err, 'debería devolver error');
    assert.match(err!, /não pode começar antes/);
  });

  test('createRecurring crea registro y backfill en faturas del rango', async () => {
    const result = await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'Netflix',
      amount: 21.99,
      startMonthYear: '2026-01',
      endMonthYear: '2026-03',
    });

    assert.ok(result.recurring.id);
    assert.equal(result.created, 3, 'debería crear 3 instancias (ene, feb, mar)');
    assert.equal(result.adopted, 0);

    const instances = await prisma.invoiceItem.findMany({
      where: { recurringItemId: result.recurring.id },
      include: { invoice: true },
    });
    assert.equal(instances.length, 3);
    for (const inst of instances) {
      assert.equal(inst.isRecurring, true);
      assert.equal(inst.extractedBy, 'recurring');
      assert.equal(inst.totalInstallments, 1);
      assert.equal(inst.currentInstallment, 1);
      assert.equal(inst.itemType, 'PURCHASE');
      assert.equal(Number(inst.originalAmount), 21.99);
    }
    const months = instances.map((i) => i.invoice.monthYear).sort();
    assert.deepEqual(months, ['2026-01', '2026-02', '2026-03']);
  });

  test('backfill dedup: no duplica instancias del mismo recurringItemId', async () => {
    // Re-ejecutar backfill sobre el MISMO recurrente: todo skip
    const existing = await prisma.recurringItem.findFirst({
      where: { cardId: TEST_CARD_ID, description: 'Netflix' },
    });
    assert.ok(existing, 'recurrente Netflix existe del test anterior');

    const result = await backfill(existing!.id, TEST_CARD_ID, '2026-01', '2026-03');

    assert.equal(result.created, 0);
    assert.equal(result.skipped, 3);

    const count = await prisma.invoiceItem.count({
      where: { recurringItemId: existing!.id },
    });
    assert.equal(count, 3);
  });

  test('backfill ADOPTA item existente con misma descripción (case-insensitive) + amount', async () => {
    // Item real del PDF en 2026-04, sin marcar
    const invApr = await prisma.invoice.findUnique({
      where: { cardId_monthYear: { cardId: TEST_CARD_ID, monthYear: '2026-04' } },
    });
    await setupItem(invApr!.id, 'SPOTIFY AB', 10.99);

    const result = await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'spotify ab', // minúsculas a propósito
      amount: 10.99,
      startMonthYear: '2026-04',
      endMonthYear: '2026-04',
    });

    assert.equal(result.adopted, 1, 'debería adoptar el item real');
    assert.equal(result.created, 0);

    const adopted = await prisma.invoiceItem.findFirst({
      where: { invoiceId: invApr!.id, description: 'SPOTIFY AB' },
    });
    assert.equal(adopted!.isRecurring, true);
    assert.equal(adopted!.recurringItemId, result.recurring.id);
  });

  test('backfill crea instancia separada si amount difiere', async () => {
    // Item real con amount distinto al recurrente
    const invApr = await prisma.invoice.findUnique({
      where: { cardId_monthYear: { cardId: TEST_CARD_ID, monthYear: '2026-04' } },
    });
    await setupItem(invApr!.id, 'HBO MAX', 13.99);

    const result = await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'HBO MAX',
      amount: 15.99, // distinto
      startMonthYear: '2026-04',
      endMonthYear: '2026-04',
    });

    assert.equal(result.created, 1, 'debería crear instancia nueva');
    assert.equal(result.adopted, 0);

    // El item real queda sin marcar
    const real = await prisma.invoiceItem.findFirst({
      where: { invoiceId: invApr!.id, description: 'HBO MAX', originalAmount: 13.99 },
    });
    assert.equal(real!.isRecurring, false);
    assert.equal(real!.recurringItemId, null);
  });

  test('createRecurringFromItem adopta el item origen', async () => {
    const invFeb = await prisma.invoice.findUnique({
      where: { cardId_monthYear: { cardId: TEST_CARD_ID, monthYear: '2026-02' } },
    });
    const origin = await setupItem(invFeb!.id, 'DISNEY+', 9.99);

    const result = await createRecurringFromItem(origin.id, {
      cardId: TEST_CARD_ID,
      description: 'DISNEY+',
      amount: 9.99,
      startMonthYear: '2026-02',
      endMonthYear: '2026-04',
    });

    assert.ok(result.recurring.id);
    assert.equal(result.recurring.description, 'DISNEY+');
    assert.equal(Number(result.recurring.amount), 9.99);

    const adopted = await prisma.invoiceItem.findUnique({ where: { id: origin.id } });
    assert.equal(adopted!.isRecurring, true);
    assert.equal(adopted!.recurringItemId, result.recurring.id);

    // Instancias en feb/mar/abr (feb adoptada + mar/abr creadas)
    assert.equal(result.created, 2);
  });

  test('deleteRecurring conserva instancias de faturas pagadas y borra las no pagas', async () => {
    // Crear recorrência primero (todas las faturas aún no pagas) y luego marcar ene como paga
    const result = await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'Prime Video',
      amount: 8.99,
      startMonthYear: '2026-01',
      endMonthYear: '2026-04',
    });

    const invJan = await prisma.invoice.findUnique({
      where: { cardId_monthYear: { cardId: TEST_CARD_ID, monthYear: '2026-01' } },
    });
    await prisma.invoice.update({ where: { id: invJan!.id }, data: { isPaid: true } });

    const beforeDelete = await prisma.invoiceItem.count({
      where: { recurringItemId: result.recurring.id },
    });
    assert.equal(beforeDelete, 4, 'ene+ feb+mar+abr');

    const del = await deleteRecurring(result.recurring.id);
    assert.equal(del.deletedInstances, 3, 'borra feb, mar, abr (no pagas)');

    // La instancia de la fatura pagada (ene) se conserva; con onDelete:SetNull queda huérfana (recurringItemId=NULL)
    const remaining = await prisma.invoiceItem.findMany({
      where: { invoiceId: invJan!.id, description: 'Prime Video' },
      include: { invoice: true },
    });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].invoice.isPaid, true);
    assert.equal(remaining[0].recurringItemId, null, 'SetNull al borrar el registro');

    // Registro eliminado
    const rec = await prisma.recurringItem.findUnique({ where: { id: result.recurring.id } });
    assert.equal(rec, null);
  });

  test('updateRecurring adiciona meses nuevos y remueve instancias no pagas fuera del rango', async () => {
    const result = await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'Gym',
      amount: 30,
      startMonthYear: '2026-02',
      endMonthYear: '2026-03',
    });

    // Extender a abr
    const updated = await updateRecurring(result.recurring.id, { endMonthYear: '2026-04' });
    assert.equal(updated.created, 1, 'crea instancia en abr');

    // Acortar a feb (remove mar/abr no pagas)
    const shortened = await updateRecurring(result.recurring.id, { endMonthYear: '2026-02' });
    assert.ok(shortened.recurring.endMonthYear === '2026-02');

    const remaining = await prisma.invoiceItem.findMany({
      where: { recurringItemId: result.recurring.id },
      include: { invoice: true },
    });
    // feb queda (y mar/abr fueron removidas)
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].invoice.monthYear, '2026-02');
  });

  test('applyRecurringToInvoice materializa en fatura concreta (dedup)', async () => {
    await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'Internet Fibra',
      amount: 49.9,
      startMonthYear: '2026-02',
      endMonthYear: '2026-04',
    });

    // Fatura 2026-04 ya tiene instancia (backfill la creó). apply no debe duplicar.
    const invApr = await prisma.invoice.findUnique({
      where: { cardId_monthYear: { cardId: TEST_CARD_ID, monthYear: '2026-04' } },
    });
    const countBefore = await prisma.invoiceItem.count({
      where: { invoiceId: invApr!.id, description: 'Internet Fibra' },
    });

    const result = await applyRecurringToInvoice(TEST_CARD_ID, '2026-04');
    assert.equal(result.created, 0, 'no debe duplicar');

    const countAfter = await prisma.invoiceItem.count({
      where: { invoiceId: invApr!.id, description: 'Internet Fibra' },
    });
    assert.equal(countAfter, countBefore);
  });

  test('recalculateCardTotals actualiza totals tras propagación', async () => {
    // Fatura 2026-03: tras crear recurrente, el total debe reflejar la suma exacta de items
    const invMar = await prisma.invoice.findUnique({
      where: { cardId_monthYear: { cardId: TEST_CARD_ID, monthYear: '2026-03' } },
    });
    await prisma.invoice.update({ where: { id: invMar!.id }, data: { totalAmount: 0 } });

    await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'Seguro Auto',
      amount: 120,
      startMonthYear: '2026-03',
      endMonthYear: '2026-03',
    });

    const refreshed = await prisma.invoice.findUnique({ where: { id: invMar!.id } });
    const itemsSum = await prisma.invoiceItem.aggregate({
      where: { invoiceId: invMar!.id },
      _sum: { originalAmount: true },
    });
    const expected = Math.round(Number(itemsSum._sum.originalAmount) * 100) / 100;
    assert.equal(Number(refreshed!.totalAmount), expected);
    assert.ok(Number(refreshed!.totalAmount) >= 120, 'incluye el recurrente');
  });

  test('createRecurring no propaga más allá de la última fatura existente', async () => {
    const result = await createRecurring({
      cardId: TEST_CARD_ID,
      description: 'Cloud Hosting',
      amount: 5,
      startMonthYear: '2026-02',
      endMonthYear: '2026-12', // más allá de la última fatura (abr)
    });

    assert.equal(result.created, 3, 'solo feb..abr (faturas existentes no pagas)');
    const instances = await prisma.invoiceItem.findMany({
      where: { recurringItemId: result.recurring.id },
      include: { invoice: true },
    });
    const maxMonth = instances.map((i) => i.invoice.monthYear).sort().pop();
    assert.equal(maxMonth, '2026-04');
  });

  test('recorrentes de otro cartón no se mezclan', async () => {
    await setupInvoice(TEST_CARD_ID_2, '2026-02');

    const result = await createRecurring({
      cardId: TEST_CARD_ID_2,
      description: 'Netflix',
      amount: 21.99,
      startMonthYear: '2026-02',
      endMonthYear: '2026-02',
    });

    const onCard1 = await prisma.invoiceItem.count({
      where: { recurringItemId: result.recurring.id, invoice: { cardId: TEST_CARD_ID } },
    });
    assert.equal(onCard1, 0, 'no debe tocar faturas del otro cartón');
  });
});