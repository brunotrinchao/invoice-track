import { prisma } from '../db.js';
import { upsertBankInstruction } from '../services/bankInstructionService.js';

/**
 * Seed idempotente das instruções por banco (upsert por bankName).
 * Fonte: seções hardcoded do prompt anterior + Atacadão validada com PDF real.
 */

const INSTRUCTIONS: { bankName: string; keywords: string[]; rules: string; source: 'seed' }[] = [
  {
    bankName: 'Atacadão',
    source: 'seed',
    keywords: ['ATACADAO', 'ATACADÃO', 'CSF', 'Banco CSF', 'Atacadão'],
    rules: `Para o Atacadão (Banco CSF):
- A fatura tem título "FATURA MENSAL CARTÃO MASTERCARD GOLD" — use bankName "Atacadão", brand "Mastercard".
- O número do cartão aparece como "CARTÃO: 543882******5176" (asteriscos). Extraia os 4 ÚLTIMOS dígitos (ex: "5176"). NUNCA "5438".
- O texto extraído é quebrado: data colada à descrição ("26/06ATACADAO 672 CONTAGEM SHO - 3/3") e valor na linha seguinte ("119,20") — associe por ORDEM de leitura.
- Parcelas como sufixo na descrição: " - 3/3" → currentInstallment 3, totalInstallments 3. Sem sufixo → 1/1.
- "Pagamento Banco CSF" (valor com hífen no FIM, ex: "136,20-") é crédito da fatura anterior → OMITA como compra.
- "ANUIDADE ..." (ex: "ANUIDADE Diferenciada - 12/12") é tarifa: inclua como item (amount positivo) — feeType FEE.
- "SALDO FATURA ANTERIOR" não é lançamento: omita.
- IGNORE: boleto/ficha de compensação, "PARCELE FÁCIL" (tabelas de parcelamento), "PAGAMENTO MÍNIMO" e tabelas de taxas de juros (Taxa A.M./A.A./CET).
- Total: linha "TOTAL DA SUA FATURA R$ ..." ou "TOTAL DA FATURAR$ ..." (colada) → declaredInvoiceTotal.
- monthReferenced: mês de vencimento (ex: venc. 26/09/2026 → "2026-09"); dueDate "2026-09-26".`,
  },
  {
    bankName: 'Bradesco',
    source: 'seed',
    keywords: ['BRADESCO', 'BANCO BRADESCO', 'Bradesco'],
    rules: `- Lançamentos na seção "LANÇAMENTOS" (data DD/MM, descrição, valor).
- Parcelas: "PARC 02/06" na descrição ou "PARCELA 2 DE 5".
- Créditos: pagamentos/"Pagamento recebido" com valor negativo — omitir como compra.
- Tarifas/IOF/anuidade: incluir como item (amount positivo).
- Total na linha "TOTAL DO CARTÃO R$ ..." ou "TOTAL DA FATURA".
- IGNORE: tabelas de taxas, anúncios, cabeçalhos repetidos por titular.`,
  },
  {
    bankName: 'Banco Inter',
    source: 'seed',
    keywords: ['INTER', 'Banco Inter', 'INTER S/A'],
    rules: `- Lançamentos com data DD/MM/YYYY ou DD/MM.
- ATENÇÃO: o hífen '-' na coluna Beneficiário do Inter é separador padrão, NUNCA considere como crédito.
- Compras normais são valores POSITIVOS. Somente lançamentos com sinal '+' antes do valor (ou palavras como Cashback, Estorno, Reembolso) são créditos (amount negativo).
- Parcelas "PARCELA 02/05" ou "02/05".
- Tarifas/IOF: incluir como item (amount positivo).
- Total: linha "TOTAL ... R$ ..."; monthReferenced pelo mês de vencimento.`,
  },
  {
    bankName: 'PicPay',
    source: 'seed',
    keywords: ['PICPAY', 'PIC PAY', 'PicPay Card'],
    rules: `- Seção "Transações com o Cartão PicPay".
- Parcelas "PARCELA 01/02" ou "01 DE 02".
- Créditos/estornos com amount negativo.
- Tarifas/IOF: incluir como item (amount positivo).
- Total: seção "Resumo da fatura"; monthReferenced pelo mês de vencimento.`,
  },
  {
    bankName: 'Mercado Pago',
    source: 'seed',
    keywords: ['MERCADO PAGO', 'MERCADOLIVRE', 'MP *', 'PAG*'],
    rules: `- Cartões rotulados com mascaramento ex: "Cartão Visa [************4422]" ou "[************2207]". Extraia os 4 ÚLTIMOS dígitos ("4422", "2207"). NUNCA crie cartões falsos para anos ('2025') ou 'Fatu'/'Resumo'.
- Cada cartão possui total próprio impresso ("Total R$ 2.035,71") → "totalAmount" daquele cartão.
- Padrões: "DD/MM | DESCRICAO | Parcela X de Y | R$ XX,XX" ou "DD/MM DESCRICAO X/Y R$ XX,XX".
- Nomes de lojas iniciam com "MP *", "ML *", "PAG*", "MERCADOLIVRE" — mantenha a descrição limpa.
- A seção "Movimentações na fatura" contém taxas, multas, juros e créditos concedidos ("IOF do rotativo", "Juros do rotativo", "Multa por atraso", "Crédito concedido"): extraia TODOS como items do cartão principal (créditos com amount negativo). NUNCA omita.
- Totais por cartão impressos; "Total a pagar R$ ..." → declaredInvoiceTotal.`,
  },
];

async function main() {
  for (const inst of INSTRUCTIONS) {
    const saved = await upsertBankInstruction(inst);
    console.log(`✓ ${saved.bankName} (${saved.keywords.length} keywords, source=${saved.source})`);
  }
  console.log(`Seed concluído: ${INSTRUCTIONS.length} instruções.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});