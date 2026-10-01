import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db.js';
import { processInvoiceConfirmation } from '../services/financialEngine.js';
import { buildExcelExport } from '../services/exportService.js';
import { buildPdfReport } from '../services/exportPdf.js';

/**
 * Fixture escopada (NUNCA deleteMany global). IA/Puppeteer reais — PDF pode
 * falhar por cota; assert Excel é determinístico.
 */
describe('export dashboard', () => {
  const BANK = 'TesteExportOnly';
  const LAST4 = '7720';

  before(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });
  after(async () => {
    await prisma.card.deleteMany({ where: { bankName: BANK, last4Digits: LAST4 } });
  });

  it('xlsx: 2 abas, linhas de parcelas corretas', async () => {
    await processInvoiceConfirmation({
      monthReferenced: '2026-10',
      overwriteExisting: true,
      cards: [{
        bankName: BANK,
        brand: 'Visa',
        last4Digits: LAST4,
        totalAmount: 170,
        items: [
          { description: 'Notebook Export', amount: 120, currentInstallment: 2, totalInstallments: 4 },
        ],
      }],
    });

    const buffer = await buildExcelExport({ banks: [BANK] });
    assert.ok(buffer.length > 1000);
    assert.ok(buffer.slice(0, 2).toString('latin1').startsWith('PK')); // zip magic

    // valida conteúdo via exceljs read (CJS — namespace default em dynamic import)
    const exceljsMod = (await import('exceljs')) as unknown as { default: typeof import('exceljs') };
    const wb = new (exceljsMod.default ?? (exceljsMod as unknown as typeof import('exceljs'))).Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const dataSheet = wb.getWorksheet('Parcelas Futuras');
    assert.ok(dataSheet);
    // 2/4 em 2026-10 → parcelas 2026-09..2026-12; futuras >= 2026-10 = 3 linhas
    const rows = dataSheet.actualRowCount;
    assert.ok(rows >= 3, `esperado >=3 linhas de dados, veio ${rows}`);
    const dash = wb.getWorksheet('Dashboard');
    assert.ok(dash);
    assert.ok(String(dash.getCell('B6').value).includes('SUMIF'));
  });

  it('pdf: buffer começa com %PDF', async () => {
    try {
      const buffer = await buildPdfReport({ banks: [BANK] });
      assert.ok(buffer.slice(0, 5).toString('latin1').startsWith('%PDF'));
    } catch (e) {
      if (/IA|quota|Chrome|Failed to launch/i.test(e instanceof Error ? e.message : '')) {
        console.log('SKIP (IA/browser indisponível):', (e as Error).message.slice(0, 80));
        return;
      }
      throw e;
    }
  });
});