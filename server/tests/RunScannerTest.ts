import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMercadoPagoText } from './ScannerTest.js';

const multiLineText = `
MERCADO PAGO BRASIL
Vencimento: 17/08/2026
Total a pagar R$ 1.987,88

Cartão Visa [************4422]
11/03
MERCADOLIVRE 2 PRODUTOS
Parcela 17 de 21
R$ 131,94
15/12
MPALETAONLINE
Parcela 8 de 8
R$ 18,41
17/02
SHOPEE "HypeRoots
Parcela 6 de 10
R$ 5,76
14/07
MP MELIMAIS
R$ 19,90
Total R$ 2.035,71

Cartão Visa [************2207]
25/07
VAREJAO LRC
R$ 58,65
25/07
SUPERMERCADOS BH
R$ 29,00
Total R$ 87,65
`;

describe('MercadoPago scanner multi-line', () => {
  const res = parseMercadoPagoText(multiLineText);

  it('extrai mês de referência do vencimento', () => {
    assert.equal(res.monthReferenced, '2026-08');
  });

  it('extrai 2 cartões com totais impressos', () => {
    assert.equal(res.cards.length, 2);
    const c2207 = res.cards.find((c) => c.last4Digits === '2207')!;
    assert.ok(c2207);
    assert.equal(c2207.totalAmount, 87.65);
    const c4422 = res.cards.find((c) => c.last4Digits === '4422')!;
    assert.ok(c4422);
    assert.equal(c4422.totalAmount, 2035.71);
  });

  it('extrai itens com parcelas corretas', () => {
    const c4422 = res.cards.find((c) => c.last4Digits === '4422')!;
    assert.equal(c4422.items.length, 4);
    assert.equal(c4422.items[0].description, 'MERCADOLIVRE 2 PRODUTOS');
    assert.equal(c4422.items[0].currentInstallment, 17);
    assert.equal(c4422.items[0].totalInstallments, 21);
    assert.equal(c4422.items[0].amount, 131.94);
    const c2207 = res.cards.find((c) => c.last4Digits === '2207')!;
    assert.equal(c2207.items.length, 2);
    assert.equal(c2207.items[0].description, 'VAREJAO LRC');
    assert.equal(c2207.items[0].amount, 58.65);
  });
});