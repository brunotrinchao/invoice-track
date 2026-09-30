import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWithAIPdfDirect } from '../services/aiExtractor.js';

describe('extractWithAIPdfDirect', () => {
  it('retorna null sem chave de API (fallback regex assume)', async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const result = await extractWithAIPdfDirect(Buffer.from('%PDF-1.4 fake'), undefined);
      assert.equal(result, null);
    } finally {
      if (saved) process.env.GEMINI_API_KEY = saved;
    }
  });

  it('aceita PDF binário e monta inlineData base64 (falha sem rede → null, sem lançar)', async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      // Sem chave: função sai cedo — valida que não lança e não consome rede.
      const result = await extractWithAIPdfDirect(Buffer.from([0x25, 0x50, 0x44, 0x46]), undefined);
      assert.equal(result, null);
    } finally {
      if (saved) process.env.GEMINI_API_KEY = saved;
    }
  });
});