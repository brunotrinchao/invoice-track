import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MercadoPagoInvoiceParser } from '../services/parsers/MercadoPagoParser.js';
import { InvoiceParserFactory } from '../services/parsers/InvoiceParserFactory.js';

// Fixture extraída do PDF real MarcadoPAgo_Fatura_20260817_unlocked.pdf
const MERCADO_PAGO_FIXTURE = `
Bruno Jose Souza Trinchao
Emitida em: 13/08/2026
Olá, Bruno Jose
Essa é sua fatura de agosto
Total a pagar
R$ 1.987,88
Vence em
17/08/2026
Limite total
R$ 17.000,00

Informações complementares
Resumo da fatura
Consumos de 13/07 a 12/08 R$ 2.123,36
Tarifas e encargos R$ 7,24
Multas por atraso R$ 51,05
Total da fatura de julho R$ 1.782,73
Juros do mês anterior R$ 44,17
Pagamentos e créditos devolvidos R$ 2.020,67
Total R$ 1.987,88

Bruno Jose Souza Trinchao
Vencimento: 17/08/2026
Detalhes de consumo
Movimentações na fatura
Data Movimentações Valor em R$
15/07 Crédito concedido R$ 30,28
21/07 Pagamento da fatura de julho/2026 R$ 1.752,45
23/07 Crédito concedido R$ 63,81
23/07 Crédito concedido R$ 31,22
09/08 Crédito concedido R$ 142,91
13/08 IOF do rotativo R$ 7,24
13/08 Juros do rotativo R$ 41,83
13/08 Multa por atraso R$ 51,05
13/08 Juros de mora R$ 2,34

Bruno Jose Souza Trinchao
Vencimento: 17/08/2026
Cartão Visa [************4422]
Data Movimentações Valor em R$
17/02 MERCADOLIVRE*2PRODUTOS Parcela 6 de 10 R$ 20,80
08/07 MP*MAXXNASUACASAP Parcela 10 de 10 R$ 3,02
25/07 MERCADOLIVRE*MERCADOLIVRE Parcela 1 de 21 R$ 143,00
14/07 MP*MELIMAIS R$ 19,90
Total R$ 2.035,71

Bruno Jose Souza Trinchao
Vencimento: 17/08/2026
Cartão Visa [************2207]
Data Movimentações Valor em R$
25/07 VAREJAO LRC R$ 58,65
25/07 SUPERMERCADOS BH R$ 29,00
Total R$ 87,65
`;

describe('MercadoPagoInvoiceParser', () => {
  const parser = new MercadoPagoInvoiceParser();

  test('canParse identifica fatura Mercado Pago', () => {
    assert.equal(parser.canParse(MERCADO_PAGO_FIXTURE), true);
  });

  test('monthReferenced = mês do vencimento', () => {
    const result = parser.parse(MERCADO_PAGO_FIXTURE);
    assert.equal(result.monthReferenced, '2026-08');
  });

  test('declaredInvoiceTotal captura o total do boleto', () => {
    const result = parser.parse(MERCADO_PAGO_FIXTURE);
    assert.equal(result.declaredInvoiceTotal, 1987.88);
  });

  test('totalAmount = soma real dos items (compras + taxas + créditos)', () => {
    const result = parser.parse(MERCADO_PAGO_FIXTURE);
    const card4422 = result.cards.find((c) => c.last4Digits === '4422');
    assert.ok(card4422, 'card 4422 presente');

    const expectedSum = card4422.items.reduce((s, i) => s + i.amount, 0);
    assert.equal(card4422.totalAmount, Math.round(expectedSum * 100) / 100);
    // Não usa o total declarado do PDF (que exclui taxas) como override
    assert.notEqual(card4422.totalAmount, 2035.71);
  });

  test('taxas e créditos recebem itemType', () => {
    const result = parser.parse(MERCADO_PAGO_FIXTURE);
    const card4422 = result.cards.find((c) => c.last4Digits === '4422')!;

    const iof = card4422.items.find((i) => i.description.includes('IOF'));
    assert.ok(iof, 'IOF presente');
    assert.equal(iof.itemType, 'TAX');

    const juros = card4422.items.find((i) => i.description.includes('Juros do rotativo'));
    assert.ok(juros, 'Juros do rotativo presente');
    assert.equal(juros.itemType, 'INTEREST');

    const multa = card4422.items.find((i) => i.description.includes('Multa'));
    assert.ok(multa, 'Multa presente');
    assert.equal(multa.itemType, 'FINE');

    const credito = card4422.items.find((i) => i.description.includes('Crédito concedido'));
    assert.ok(credito, 'Crédito concedido presente');
    assert.equal(credito.itemType, 'CREDIT');
    assert.ok(credito.amount < 0, 'crédito com valor negativo');
  });

  test('créditos da movimentação geral anexados ao cartão principal', () => {
    const result = parser.parse(MERCADO_PAGO_FIXTURE);
    const card4422 = result.cards.find((c) => c.last4Digits === '4422')!;
    const credits = card4422.items.filter((i) => i.itemType === 'CREDIT');
    assert.ok(credits.length >= 4, `esperado >= 4 créditos, obteve ${credits.length}`);
  });

  test('totalAmount do cartão inclui taxas e créditos (não só compras)', () => {
    const result = parser.parse(MERCADO_PAGO_FIXTURE);
    const card4422 = result.cards.find((c) => c.last4Digits === '4422')!;
    const sumAll = card4422.items.reduce((s, i) => s + i.amount, 0);
    const sumPurchases = card4422.items
      .filter((i) => i.amount > 0 && !/MULTA|JUROS|IOF|ENCARGO/i.test(i.description))
      .reduce((s, i) => s + i.amount, 0);
    // totalAmount = soma de tudo, que difere da soma só de compras quando há taxas/créditos
    assert.notEqual(card4422.totalAmount, Math.round(sumPurchases * 100) / 100);
    assert.equal(card4422.totalAmount, Math.round(sumAll * 100) / 100);
  });
});

import { AtacadaoInvoiceParser } from '../services/parsers/AtacadaoParser.js';

describe('AtacadaoInvoiceParser', () => {
  test('canParse e extração de anuidade parcelada (11/12)', () => {
    const parser = new AtacadaoInvoiceParser();
    const text = `
      FATURA MENSAL CARTÃO MASTERCARD GOLD
      543882******5176
      VENCIMENTO 26/09/2026
      10/08 Anuidade Diferenciada 11/12
      15,90
    `;
    assert.equal(parser.canParse(text), true);
    const result = parser.parse(text);
    assert.equal(result.monthReferenced, '2026-09');
    assert.equal(result.dueDate, '2026-09-26');
    const card = result.cards[0];
    const anuidade = card.items.find((i: any) => i.description.includes('Anuidade'));
    assert.ok(anuidade, 'Anuidade extraída');
    assert.equal(anuidade.currentInstallment, 11);
    assert.equal(anuidade.totalInstallments, 12);
  });
});

import { PicPayInvoiceParser } from '../services/parsers/PicPayParser.js';

describe('PicPayInvoiceParser', () => {
  test('canParse e extração automática do vencimento PicPay', () => {
    const parser = new PicPayInvoiceParser();
    const text = `
      Bruno Trinchão,
      R DAS GAIVOTAS, 646, IMBUI, APT 904, 41720070 SALVADOR - BA
      Vencimento: 15/09/2026 | Fechamento: 09/09/2026
      PicPay Mastercard® GOLD
      PicPay Card final 8056
      19/08 SUPERMERCADO PARC 1/2 R$ 120,00
    `;
    assert.equal(parser.canParse(text), true);
    const result = parser.parse(text);
    assert.equal(result.monthReferenced, '2026-09');
    assert.equal(result.dueDate, '2026-09-15');
    assert.equal(result.cards[0].last4Digits, '8056');
  });
});

describe('InvoiceParserFactory', () => {
  test('seleciona Mercado Pago para fatura do MP', () => {
    const parser = InvoiceParserFactory.getParser(MERCADO_PAGO_FIXTURE);
    assert.equal(parser.name, 'Mercado Pago');
  });

  test('fallback genérico para texto desconhecido', () => {
    const parser = InvoiceParserFactory.getParser('texto aleatório sem banco conhecido');
    assert.equal(parser.name, 'Generic');
  });
});