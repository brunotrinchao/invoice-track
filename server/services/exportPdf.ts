import puppeteer from 'puppeteer-core';
import { createRequire } from 'module';
import { logger } from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collectExportPayload, type ExportPayload, type ExportParams } from './exportPayload.js';

/**
 * echarts via createRequire (CJS) — o resolver do tsx (moduleResolution:
 * "bundler") não encontra o pacote ESM a partir deste arquivo.
 */
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const echarts = require('echarts') as typeof import('echarts');

/** PDF: relatório IA (Gemini→OpenRouter) + gráficos ECharts SSR→PNG + Puppeteer. */

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONEY = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

function fmt(monthYear: string): string {
  const [y, m] = monthYear.split('-');
  return `${MONTHS[Math.max(0, Number(m) - 1) || 0]}/${y}`;
}

// ===== IA: relatório narrativo =====

const REPORT_PROMPT = (json: string) => `Você é um consultor financeiro pessoal. Dados do usuário (JSON de faturas de cartão):
${json}

Escreva um relatório de previsibilidade financeira em PT-BR com EXATAMENTE estas seções:
## Panorama
2-3 frases sobre a situação atual (comprometimento futuro, média mensal).
## Previsibilidade de redução de custo
2-4 frases sobre o que termina quando (use as compras parceladas), liberando quanto de orçamento por mês.
## Alertas
2-3 frases sobre riscos: faturas pesadas próximas, concentração em um banco, parcelas longas.
## Recomendações para melhorar a vida financeira
3-5 bullets ("• ") acionáveis e específicos com base nos números.
Use apenas os números fornecidos — NÃO invente valores. Máximo 400 palavras.`;

interface ProviderResult { text: string; provider: string }

async function generateReportText(payload: ExportPayload): Promise<ProviderResult> {
  const compact = {
    metrics: payload.metrics,
    monthly: payload.monthlySummary.map((m) => ({ mes: m.monthYear, total: m.total, compras: m.purchasesTotal, taxas: m.feesTotal })),
    parcelas_futuras: payload.installments.reduce((map, r) => {
      const key = r.description;
      (map[key] ??= { banco: r.bankName, parcelas_restantes: 0, valor_parcela: r.amount, meses: [] });
      map[key].parcelas_restantes++;
      if (!map[key].meses.includes(fmt(r.monthYear))) map[key].meses.push(fmt(r.monthYear));
      return map;
    }, {} as Record<string, { banco: string; parcelas_restantes: number; valor_parcela: number; meses: string[] }>),
  };

  const json = JSON.stringify(compact).slice(0, 8000);
  const prompt = REPORT_PROMPT(json);
  const attempts: string[] = [];
  let lastError: unknown = null;

  // Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    for (const model of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const g = genAI.getGenerativeModel({ model, generationConfig: { responseMimeType: 'text/plain' } });
        const res = await g.generateContent(prompt);
        return { text: res.response.text(), provider: model };
      } catch (e) {
        lastError = e;
        if (/429|quota/i.test(getErr(e))) break;
      }
    }
  }

  // OpenRouter (texto puro, sem multimodal)
  const gptKey = process.env.FALLBACK_API_KEY;
  if (gptKey) {
    for (const model of process.env.FALLBACK_MODEL
      ? [process.env.FALLBACK_MODEL]
      : ['dots-studio/dots-3-note-preview:free', 'qwen/qwen3.8-27b:free']) {
      try {
        const baseUrl = (process.env.FALLBACK_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gptKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Invoice Track',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
        if (!res.ok) throw new Error(j.error?.message || `HTTP ${res.status}`);
        const content = j.choices?.[0]?.message?.content;
        if (content) return { text: content, provider: model };
      } catch (e) {
        lastError = e;
      }
    }
  }

  logger.warn({ attempts }, 'IA indisponível p/ relatório — usando fallback determinístico');
  // Fallback determinístico (IA falhou): texto gerado localmente
  return { text: buildDeterministicReport(payload), provider: 'local' };
}

function getErr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Relatório local (sem IA) — números reais, texto template. */
function buildDeterministicReport(payload: ExportPayload): string {
  const last = payload.installments.slice().sort((a, b) => a.monthYear.localeCompare(b.monthYear)).pop();
  return [
    '## Panorama',
    `Comprometimento futuro: ${MONEY(payload.metrics.totalCommittedFuture)} em ${payload.monthlySummary.filter((m) => m.monthYear >= new Date().toISOString().slice(0, 7)).length} meses (média ${MONEY(payload.metrics.averageMonthly)}/mês).`,
    '',
    '## Previsibilidade de redução de custo',
    last
      ? `A última parcela em aberto termina em ${fmt(last.monthYear)} (${last.description}). Cada compra que termina libera a parcela daquela compra do orçamento mensal.`
      : 'Nenhuma parcela futura em aberto.',
    '',
    '## Alertas',
    `- Média mensal de ${MONEY(payload.metrics.averageMonthly)} — compare com sua renda líquida.`,
    '',
    '## Recomendações para melhorar a vida financeira',
    `• Priorize quitar compras com menos parcelas restantes para liberar fluxo mensal mais cedo.`,
    `• Acompanhe a média mensal — reduzi-la é o caminho para liberar orçamento.`,
    `• Evite novas parcelas longas até o comprometimento futuro cair abaixo de ${MONEY(payload.metrics.averageMonthly * 3)}.`,
  ].join('\n');
}

// ===== Gráfico SSR → PNG =====

async function chartToPng(option: object, width = 720, height = 320): Promise<string> {
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width, height });
  chart.setOption({ animation: false, ...option } as Parameters<typeof chart.setOption>[0]);
  const svg = chart.renderToSVGString();
  chart.dispose();

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><body style="margin:0;background:#fff">${svg}</body>`, { waitUntil: 'networkidle0' });
  const el = await page.$('svg');
  const png = (await el!.screenshot({ encoding: 'binary' })) as Buffer;
  await page.close();
  return `data:image/png;base64,${png.toString('base64')}`;
}

let browserPromise: Promise<puppeteer.Browser> | null = null;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--headless=new'],
    }).catch((e) => {
      browserPromise = null;
      throw e;
    });
  }
  return browserPromise;
}

// ===== HTML + PDF =====

function buildHtml(payload: ExportPayload, curvePng: string, bankPng: string, reportText: string, provider: string): string {
  const now = new Date().toLocaleString('pt-BR');
  const filtros = [
    payload.banks?.length ? `Bancos: ${payload.banks.join(', ')}` : null,
    payload.from ? `De ${fmt(payload.from)}` : null,
    payload.to ? `até ${fmt(payload.to)}` : null,
    payload.status ? `Status: ${payload.status === 'paid' ? 'pagas' : 'não pagas'}` : null,
  ].filter(Boolean).join(' · ') || 'Sem filtros (todos os dados)';

  const rows = payload.installments
    .slice()
    .sort((a, b) => a.monthYear.localeCompare(b.monthYear))
    .slice(0, 10)
    .map((r) => `
      <tr>
        <td>${r.description}</td>
        <td>${r.bankName} •••• ${r.last4Digits}</td>
        <td>${fmt(r.monthYear)}</td>
        <td class="num">${MONEY(r.amount)}</td>
      </tr>`).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; }
    .header { border-bottom: 3px solid #1d6bf3; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { font-size: 22px; margin: 0; letter-spacing: -0.02em; }
    .meta { color: #64748b; font-size: 11px; margin-top: 4px; }
    h2 { font-size: 14px; color: #1d6bf3; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
    .kpi b { display: block; font-size: 17px; }
    .kpi span { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; border-bottom: 2px solid #1d6bf3; padding: 6px 8px; font-size: 10px; text-transform: uppercase; color: #64748b; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .chart { width: 100%; margin: 8px 0; }
    .report { font-size: 12px; line-height: 1.6; }
    .report h2 { color: #1d6bf3; }
    footer { margin-top: 24px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print { .chart { max-width: 100%; } }
  </style></head><body>
    <div class="header">
      <h1>Relatório de Previsibilidade Financeira</h1>
      <p class="meta">${now} · ${filtros}</p>
    </div>

    <div class="kpis">
      <div class="kpi"><span>Mês atual</span><b>${MONEY(payload.metrics.currentMonthTotal)}</b></div>
      <div class="kpi"><span>Próximo mês</span><b>${MONEY(payload.metrics.nextMonthTotal)}</b></div>
      <div class="kpi"><span>Compromisso futuro</span><b>${MONEY(payload.metrics.totalCommittedFuture)}</b></div>
      <div class="kpi"><span>Média mensal</span><b>${MONEY(payload.metrics.averageMonthly)}</b></div>
    </div>

    <img class="chart" src="${curvePng}" alt="Curva de previsibilidade" />
    <img class="chart" src="${bankPng}" alt="Total por banco" />

    <div class="report">${reportText.replace(/## (Panorama|Previsibilidade de redução de custo|Alertas|Recomendações para melhorar a vida financeira)/g, '<h2>$1</h2>').replace(/\n/g, '<br/>')}</div>

    <h2>Parcelas futuras (próximas a terminar)</h2>
    <table>
      <thead><tr><th>Compra</th><th>Cartão</th><th>Mês</th><th>Valor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <footer>Invoice Track · Relatório gerado por ${provider === 'local' ? 'módulo local (IA indisponível no momento)' : 'IA (' + provider + ')'}</footer>
  </body></html>`;
}

export async function buildPdfReport(params: ExportParams): Promise<Buffer> {
  const started = Date.now();
  const payload = await collectExportPayload(params);

  // Gráficos
  const curvePng = await chartToPng({
    xAxis: { type: 'category', data: payload.monthlySummary.map((m) => fmt(m.monthYear)) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => MONEY(v) } },
    series: [{ type: 'line', smooth: true, areaStyle: { opacity: 0.12 }, data: payload.monthlySummary.map((m) => m.total) }],
  });
  const bankPng = await chartToPng({
    xAxis: { type: 'category', data: payload.monthlySummary.map((m) => fmt(m.monthYear)) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => MONEY(v) } },
    series: Object.keys(payload.monthlySummary[0]?.byBank ?? {}).slice(0, 6).map((bank) => ({
      type: 'line' as const,
      name: bank,
      data: payload.monthlySummary.map((m) => m.byBank[bank] || 0),
    })),
  }, 720, 340);

  // IA
  const report = await generateReportText(payload);

  const html = buildHtml(payload, curvePng, bankPng, report.text, report.provider);
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
  });
  await page.close();
  logger.info({ ms: Date.now() - started, provider: report.provider }, 'PDF relatório gerado');
  // Puppeteer v25 retorna Uint8Array — normalizar p/ Buffer (contract dos callers)
  return Buffer.from(pdf as unknown as ArrayBuffer);
}