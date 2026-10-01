import ExcelJS from 'exceljs';
import { collectExportPayload, type ExportParams } from './exportPayload.js';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatMonthLabel(monthYear: string): string {
  const [y, m] = monthYear.split('-');
  return `${MONTH_NAMES[Math.max(0, Number(m) - 1) || 0]}/${y}`;
}

export async function buildExcelExport(params: ExportParams): Promise<Buffer> {
  const payload = await collectExportPayload(params);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Invoice Track';

  // Aba 1: base de dados
  const dataSheet = wb.addWorksheet('Parcelas Futuras', { views: [{ state: 'frozen', ySplit: 1 }] });
  dataSheet.columns = [
    { header: 'Compra', key: 'd', width: 38 },
    { header: 'Banco / Instituição', key: 'b', width: 18 },
    { header: 'Parcela Total', key: 'tt', width: 13 },
    { header: 'Número da Parcela', key: 'cn', width: 17 },
    { header: 'Mês da Parcela', key: 'ml', width: 16 },
    { header: 'Valor da Parcela', key: 'a', width: 15 },
  ];
  for (const row of payload.installments) {
    dataSheet.addRow({
      d: row.description,
      b: row.bankName,
      tt: row.totalInstallments,
      cn: row.currentInstallment,
      ml: formatMonthLabel(row.monthYear),
      a: row.amount,
    });
  }
  dataSheet.getColumn(6).numFmt = '#,##0.00';

  // Aba 2: Dashboard (fórmulas vivas + dropdown + gráfico)
  const dash = wb.addWorksheet('Dashboard');
  dash.getColumn('A').width = 18;
  dash.getColumn('B').width = 18;

  dash.mergeCells('A1:B1');
  const title = dash.getCell('A1');
  title.value = 'DASHBOARD DE PREVISIBILIDADE E EVOLUÇÃO DAS DÍVIDAS';
  title.font = { bold: true, size: 13, color: { argb: 'FF1D6BF3' } };

  dash.getCell('A3').value = 'Selecione o Banco / Instituição:';
  const bankOptions = ['TODOS', ...new Set(payload.installments.map((r) => r.bankName))];
  const sel = dash.getCell('B3');
  sel.value = 'TODOS';
  sel.dataValidation = { type: 'list', allowBlank: false, formulae: [`"${bankOptions.join(',')}"`] };
  sel.font = { bold: true };

  dash.getCell('A5').value = 'Mês';
  dash.getCell('B5').value = 'Valor Filtrado';
  dash.getCell('A5').font = { bold: true };
  dash.getCell('B5').font = { bold: true };

  const months = [...new Set(payload.installments.map((r) => r.monthYear))].sort();
  const LAST = Math.max(payload.installments.length + 1, 2);
  let r = 6;
  const firstRow = r;
  for (const monthYear of months) {
    dash.getCell(`A${r}`).value = formatMonthLabel(monthYear);
    dash.getCell(`B${r}`).value = {
      formula:
        `IF($B$3="TODOS",` +
        `SUMIF('Parcelas Futuras'!$E$2:$E$${LAST},$A${r},'Parcelas Futuras'!$F$2:$F$${LAST}),` +
        `SUMIFS('Parcelas Futuras'!$F$2:$F$${LAST},'Parcelas Futuras'!$E$2:$E$${LAST},$A${r},'Parcelas Futuras'!$B$2:$B$${LAST},$B$3))`,
    };
    dash.getCell(`B${r}`).numFmt = '#,##0.00';
    r++;
  }
  const lastMonthRow = r - 1;

  // Nota: exceljs OSS não expõe addChart — gráfico não vai nativo.
  // Dados + fórmulas vivas cobrem o dashboard; gráfico = inserir sobre a tabela (2 cliques).

  return Buffer.from(await wb.xlsx.writeBuffer());
}