import { prisma } from './db.js';
async function main() {
  const out: string[] = [];
  const cards = await prisma.card.findMany({ where: { bankName: { contains: 'Bradesco' } }, include: { invoices: { orderBy: { monthYear: 'asc' }, include: { _count: { select: { items: true } } } } } });
  for (const c of cards) out.push(`CARD ${c.id} ${c.bankName} ${c.last4Digits} created=${c.createdAt.toISOString().slice(0,16)} faturas=${c.invoices.length}`);
  const recent = await prisma.invoiceItem.findMany({ where: { createdAt: { gte: new Date('2026-10-01T14:20:00') } }, orderBy: { createdAt: 'asc' }, take: 30, include: { invoice: { include: { card: true } } } });
  const byCard = new Map<string, string[]>();
  for (const it of recent) {
    const k = `${it.invoice.card.bankName} ${it.invoice.card.last4Digits} (${it.invoice.card.id.slice(-6)})`;
    const arr = byCard.get(k) ?? [];
    arr.push(`${it.invoice.monthYear} ${it.description.slice(0,30)} ${it.currentInstallment}/${it.totalInstallments}`);
    byCard.set(k, arr);
  }
  for (const [k, rows] of byCard) { out.push(`RECENT-ITEMS→ ${k}`); for (const r of rows) out.push('   ' + r); }
  await prisma.$disconnect();
  (await import('fs')).writeFileSync('/tmp/diag-out.txt', out.join('\n'));
}
main();
