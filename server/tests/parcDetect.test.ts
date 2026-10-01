import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectInstallmentsFromDescription } from '../services/aiExtractor.js';

describe('detectInstallmentsFromDescription', () => {
  it('TATPARC11/12 compacto PicPay → 11/12', () => {
    assert.deepEqual(detectInstallmentsFromDescription('50.926.924 TATPARC11/12', 1, 1), { currentInstallment: 11, totalInstallments: 12 });
  });
  it('PARC.05/12 com ponto', () => {
    assert.deepEqual(detectInstallmentsFromDescription('LOJA PARC.05/12', 1, 1), { currentInstallment: 5, totalInstallments: 12 });
  });
  it('PARC 3/10 com espaço', () => {
    assert.deepEqual(detectInstallmentsFromDescription('Compra PARC 3/10', 1, 1), { currentInstallment: 3, totalInstallments: 10 });
  });
  it('datas dd/mm/yyyy ignoradas', () => {
    assert.equal(detectInstallmentsFromDescription('Nota 05/10/2026', 1, 1), null);
  });
  it('mês/ano 9/26 ignorado', () => {
    assert.equal(detectInstallmentsFromDescription('Fatura 9/26', 1, 1), null);
  });
  it('já parcelado não mexe', () => {
    assert.equal(detectInstallmentsFromDescription('Compra', 3, 10), null);
  });
  it('total > 48 rejeitado', () => {
    assert.equal(detectInstallmentsFromDescription('PARC 1/99', 1, 1), null);
  });
});
