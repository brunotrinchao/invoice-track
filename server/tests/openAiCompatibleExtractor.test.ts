import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWithFallbackPdfDirect, extractWithFallbackText } from '../services/openAiCompatibleExtractor.js';

describe('openAiCompatibleExtractor (fallback genérico)', () => {
  it('retorna null sem FALLBACK_* configurado (provider desativado)', async () => {
    const saved = { url: process.env.FALLBACK_BASE_URL, key: process.env.FALLBACK_API_KEY };
    delete process.env.FALLBACK_BASE_URL;
    delete process.env.FALLBACK_API_KEY;
    try {
      assert.equal(await extractWithFallbackPdfDirect(Buffer.from('pdf')), null);
      assert.equal(await extractWithFallbackText('texto'), null);
    } finally {
      if (saved.url) process.env.FALLBACK_BASE_URL = saved.url;
      if (saved.key) process.env.FALLBACK_API_KEY = saved.key;
    }
  });

  it('falha limpa (null) com key inválida — sem lançar ao caller', async () => {
    process.env.FALLBACK_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.FALLBACK_API_KEY = 'sk-or-invalid-test';
    const saved = { url: process.env.FALLBACK_BASE_URL, key: process.env.FALLBACK_API_KEY };
    try {
      const r = await extractWithFallbackPdfDirect(Buffer.from('%PDF-1.4 fake'));
      assert.equal(r, null);
    } finally {
      if (saved.url) process.env.FALLBACK_BASE_URL = saved.url;
      else delete process.env.FALLBACK_BASE_URL;
      if (saved.key) process.env.FALLBACK_API_KEY = saved.key;
      else delete process.env.FALLBACK_API_KEY;
    }
  });
});