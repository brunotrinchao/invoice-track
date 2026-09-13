import { prisma } from '../db.js';
import { addMonthsToYearMonth, recalculateCardTotals, TotalsDb } from './cardTotals.js';

export interface CreateRecurringInput {
  cardId: string;
  description: string;
  amount: number;
  startMonthYear: string; // "YYYY-MM"
  endMonthYear?: string | null;
}

export interface CreateRecurringFromItemInput {
  cardId: string;
  description?: string; // fallback: description del item origen
  amount?: number; // fallback: amount del item origen
  startMonthYear: string;
  endMonthYear?: string | null;
}

export interface UpdateRecurringInput {
  description?: string;
  amount?: number;
  startMonthYear?: string;
  endMonthYear?: string | null;
  active?: boolean;
}

/**
 * Valida que start <= end y que start >= primera fatura no paga del cartón.
 * Devuelve un mensaje de error en PT-BR o null si es válido.
 */
export async function validateRecurringRange(
  cardId: string,
  startMonthYear: string,
  endMonthYear?: string | null,
  db: TotalsDb = prisma
): Promise<string | null> {
  if (!/^\d{4}-\d{2}$/.test(startMonthYear)) {
    return 'Mês de início inválido. Formato esperado: YYYY-MM.';
  }
  if (endMonthYear) {
    if (!/^\d{4}-\d{2}$/.test(endMonthYear)) {
      return 'Mês de término inválido. Formato esperado: YYYY-MM.';
    }
    if (endMonthYear < startMonthYear) {
      return 'O mês de término não pode ser anterior ao mês de início.';
    }
  }

  const firstUnpaid = await db.invoice.findFirst({
    where: { cardId, isPaid: false },
    orderBy: { monthYear: 'asc' },
    select: { monthYear: true },
  });
  if (firstUnpaid && startMonthYear < firstUnpaid.monthYear) {
    return `A recorrência não pode começar antes da primeira fatura não paga (${firstUnpaid.monthYear}).`;
  }
  return null;
}

/**
 * Para cada fatura del cartón en [start, min(end, última fatura)]:
 * - skip si existe item con mismo recurringItemId
 * - ADOPTAR si existe item con misma descripción (case-insensitive) + mismo amount y recurringItemId IS NULL
 * - sino crear InvoiceItem (itemType='PURCHASE', extractedBy='recurring', totalInstallments=1, currentInstallment=1)
 */
export async function backfill(
  recurringItemId: string,
  cardId: string,
  startMonthYear: string,
  endMonthYear?: string | null,
  db: TotalsDb = prisma
): Promise<{ adopted: number; created: number; skipped: number }> {
  const recurring = await db.recurringItem.findUnique({
    where: { id: recurringItemId },
    select: { description: true, amount: true },
  });
  if (!recurring) {
    throw new Error('Recurrente não encontrado.');
  }

  const invoices = await db.invoice.findMany({
    where: {
      cardId,
      monthYear: { gte: startMonthYear },
    },
    orderBy: { monthYear: 'asc' },
    select: { id: true, monthYear: true },
  });

  const lastInvoiceMonth = invoices.length > 0 ? invoices[invoices.length - 1].monthYear : null;
  const effectiveEnd = endMonthYear && lastInvoiceMonth
    ? (endMonthYear < lastInvoiceMonth ? endMonthYear : lastInvoiceMonth)
    : endMonthYear || lastInvoiceMonth;

  let adopted = 0;
  let created = 0;
  let skipped = 0;

  for (const inv of invoices) {
    if (effectiveEnd && inv.monthYear > effectiveEnd) break;

    const existing = await db.invoiceItem.findFirst({
      where: {
        invoiceId: inv.id,
        recurringItemId,
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // ADOPTAR: item real del PDF con misma descripción (MySQL: collation ya es case-insensitive) + mismo amount
    const candidate = await db.invoiceItem.findFirst({
      where: {
        invoiceId: inv.id,
        recurringItemId: null,
        description: recurring.description,
        originalAmount: recurring.amount,
      },
      select: { id: true },
    });
    if (candidate) {
      await db.invoiceItem.update({
        where: { id: candidate.id },
        data: {
          isRecurring: true,
          recurringItemId,
        },
      });
      adopted++;
      continue;
    }

    await db.invoiceItem.create({
      data: {
        invoiceId: inv.id,
        description: recurring.description,
        originalAmount: recurring.amount,
        currentInstallment: 1,
        totalInstallments: 1,
        itemType: 'PURCHASE',
        extractedBy: 'recurring',
        isRecurring: true,
        recurringItemId,
      },
    });
    created++;
  }

  return { adopted, created, skipped };
}

/**
 * Crea un recurrente y propaga sus instancias a las faturas existentes.
 */
export async function createRecurring(input: CreateRecurringInput) {
  const validationError = await validateRecurringRange(input.cardId, input.startMonthYear, input.endMonthYear);
  if (validationError) {
    throw new Error(validationError);
  }

  return await prisma.$transaction(async (tx) => {
    const recurring = await tx.recurringItem.create({
      data: {
        cardId: input.cardId,
        description: input.description,
        amount: input.amount,
        startMonthYear: input.startMonthYear,
        endMonthYear: input.endMonthYear || null,
        active: true,
      },
    });

    const result = await backfill(recurring.id, input.cardId, input.startMonthYear, input.endMonthYear, tx);
    await recalculateCardTotals(input.cardId, tx);

    return { recurring, ...result };
  });
}

/**
 * Crea un recurrente a partir de un item existente, adoptando el item origen.
 */
export async function createRecurringFromItem(itemId: string, input: CreateRecurringFromItemInput) {
  const validationError = await validateRecurringRange(input.cardId, input.startMonthYear, input.endMonthYear);
  if (validationError) {
    throw new Error(validationError);
  }

  return await prisma.$transaction(async (tx) => {
    const item = await tx.invoiceItem.findUnique({
      where: { id: itemId },
      select: { id: true, description: true, originalAmount: true, invoiceId: true },
    });
    if (!item) {
      throw new Error('Item não encontrado.');
    }

    const description = input.description || item.description;
    const amount = input.amount !== undefined ? input.amount : Number(item.originalAmount);

    const recurring = await tx.recurringItem.create({
      data: {
        cardId: input.cardId,
        description,
        amount,
        startMonthYear: input.startMonthYear,
        endMonthYear: input.endMonthYear || null,
        active: true,
      },
    });

    // Adoptar el item origen
    await tx.invoiceItem.update({
      where: { id: item.id },
      data: {
        isRecurring: true,
        recurringItemId: recurring.id,
      },
    });

    const result = await backfill(recurring.id, input.cardId, input.startMonthYear, input.endMonthYear, tx);
    await recalculateCardTotals(input.cardId, tx);

    return { recurring, ...result };
  });
}

/**
 * Actualiza un recurrente: re-propaga (adiciona meses nuevos, remueve instancias no pagas fuera del nuevo rango).
 */
export async function updateRecurring(id: string, input: UpdateRecurringInput) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.recurringItem.findUnique({
      where: { id },
      select: { id: true, cardId: true, description: true, amount: true, startMonthYear: true, endMonthYear: true },
    });
    if (!existing) {
      throw new Error('Recurrente não encontrado.');
    }

    const startMonthYear = input.startMonthYear || existing.startMonthYear;
    const endMonthYear = input.endMonthYear !== undefined ? input.endMonthYear : existing.endMonthYear;

    const validationError = await validateRecurringRange(existing.cardId, startMonthYear, endMonthYear, tx);
    if (validationError) {
      throw new Error(validationError);
    }

    const recurring = await tx.recurringItem.update({
      where: { id },
      data: {
        description: input.description ?? existing.description,
        amount: input.amount ?? existing.amount,
        startMonthYear,
        endMonthYear,
        active: input.active ?? true,
      },
    });

    // Remover instancias de faturas NO PAGAS fuera del nuevo intervalo
    await tx.invoiceItem.deleteMany({
      where: {
        recurringItemId: id,
        isRecurring: true,
        invoice: {
          isPaid: false,
          OR: [
            { monthYear: { lt: startMonthYear } },
            ...(endMonthYear ? [{ monthYear: { gt: endMonthYear } } as any] : []),
          ],
        },
      },
    });

    const result = await backfill(id, existing.cardId, startMonthYear, endMonthYear, tx);
    await recalculateCardTotals(existing.cardId, tx);

    return { recurring, ...result };
  });
}

/**
 * Borra las instancias con recurringItemId=id en faturas NO PAGAS.
 * Las faturas pagadas se conservan. Elimina el registro recurrente.
 */
export async function deleteRecurring(id: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.recurringItem.findUnique({
      where: { id },
      select: { id: true, cardId: true },
    });
    if (!existing) {
      throw new Error('Recurrente não encontrado.');
    }

    const deleted = await tx.invoiceItem.deleteMany({
      where: {
        recurringItemId: id,
        invoice: {
          isPaid: false,
        },
      },
    });

    await tx.recurringItem.delete({ where: { id } });

    await recalculateCardTotals(existing.cardId, tx);

    return {
      deletedInstances: deleted.count,
      keptPaidInstances: true,
    };
  });
}

/**
 * Aplica recorrentes ativos a una fatura concreta (misma lógica de dedup que backfill).
 * Llamada por financialEngine tras confirmar una fatura.
 */
export async function applyRecurringToInvoice(
  cardId: string,
  monthYear: string,
  db: TotalsDb = prisma
): Promise<{ adopted: number; created: number; skipped: number }> {
  const invoice = await db.invoice.findUnique({
    where: { cardId_monthYear: { cardId, monthYear } },
    select: { id: true },
  });
  if (!invoice) {
    return { adopted: 0, created: 0, skipped: 0 };
  }

  const recurrings = await db.recurringItem.findMany({
    where: {
      cardId,
      active: true,
      startMonthYear: { lte: monthYear },
      OR: [{ endMonthYear: null }, { endMonthYear: { gte: monthYear } }],
    },
    select: { id: true, description: true, amount: true },
  });

  let adopted = 0;
  let created = 0;
  let skipped = 0;

  for (const rec of recurrings) {
    const existing = await db.invoiceItem.findFirst({
      where: { invoiceId: invoice.id, recurringItemId: rec.id },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const candidate = await db.invoiceItem.findFirst({
      where: {
        invoiceId: invoice.id,
        recurringItemId: null,
        description: rec.description,
        originalAmount: rec.amount,
      },
      select: { id: true },
    });
    if (candidate) {
      await db.invoiceItem.update({
        where: { id: candidate.id },
        data: { isRecurring: true, recurringItemId: rec.id },
      });
      adopted++;
      continue;
    }

    await db.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: rec.description,
        originalAmount: rec.amount,
        currentInstallment: 1,
        totalInstallments: 1,
        itemType: 'PURCHASE',
        extractedBy: 'recurring',
        isRecurring: true,
        recurringItemId: rec.id,
      },
    });
    created++;
  }

  return { adopted, created, skipped };
}