import { extractWithAI, extractWithAIPdfDirect } from './aiExtractor.js';
import { extractWithFallbackPdfDirect, extractWithFallbackText } from './openAiCompatibleExtractor.js';
import { getInstructionSections } from './bankInstructionService.js';
import { PdfPasswordRequiredError, extractWithRegex } from './regexExtractor.js';
import { ExtractedInvoiceResult } from './parsers/InvoiceParserInterface.js';
import { getErrorMessage, isAiRateLimitError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import pdfParse from 'pdf-parse';

/**
 * Re-lança erros de senha de PDF (para a UI solicitar senha ao usuário);
 * outros erros caem para o próximo estágio do pipeline.
 */
function throwIfPdfPasswordError(err: unknown): void {
  const errMsg = getErrorMessage(err).toLowerCase();
  if (
    err instanceof PdfPasswordRequiredError ||
    errMsg.includes('senha') ||
    errMsg.includes('password') ||
    errMsg.includes('encrypted') ||
    errMsg.includes('protected') ||
    (err instanceof Error && err.name === 'PasswordException')
  ) {
    throw err;
  }
}

/** Mensagem amigável para cota excedida, com o tempo de retry quando conhecido. */
function rateLimitMessage(provider: string, err: unknown): string {
  const sec = isAiRateLimitError(err) ? err.retryAfterSec : 0;
  const wait = sec > 0 ? ` Tente novamente em ~${sec}s.` : '';
  return `${provider}: cota excedida.${wait}`;
}

/**
 * Pipeline de extração (apenas IA — extração local regex desativada):
 *   0. Gemini — PDF binário direto (multimodal inline)
 *   1. Gemini — texto via pdf-parse (até 3 tentativas)
 *   2. ChatGPT (OpenAI) — PDF binário direto (fallback)
 *   3. ChatGPT — texto via pdf-parse (fallback)
 * Cota/modelo indisponível em um provider → passa ao próximo; aborta só
 * quando todos falham, com os motivos de cada um.
 */
export async function parsePdfInvoice(pdfBuffer: Buffer, apiKey?: string, password?: string): Promise<ExtractedInvoiceResult> {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY || null;
  const hasFallback = Boolean(process.env.FALLBACK_BASE_URL && process.env.FALLBACK_API_KEY);
  const reasons: string[] = [];

  if (!geminiKey && !hasFallback) {
    logger.error('[PDF Parser] Nenhuma IA configurada: defina GEMINI_API_KEY ou FALLBACK_BASE_URL+FALLBACK_API_KEY.');
    throw new Error('Nenhuma IA configurada no servidor: defina GEMINI_API_KEY (Gemini) ou FALLBACK_BASE_URL + FALLBACK_API_KEY (OpenRouter/compatível).');
  }

  // Instruções dinâmicas por banco: extrai amostra do texto (pdf-parse é
  // barato e não precisa de senha p/ ver keywords — failure-safe)
  let sampleText = '';
  try {
    const probe = await pdfParse(pdfBuffer);
    sampleText = (probe.text || '').slice(0, 8000);
  } catch {
    /* PDF cifrado/ilegível: fallback das vias de matching */
  }
  const bankSections = await getInstructionSections(sampleText);
  logger.info(
    { sections: bankSections ? 'ok' : 'nenhuma', sampleLen: sampleText.length },
    'Instruções dinâmicas por banco carregadas',
  );

  // ===== Etapa 0: Gemini — PDF binário direto =====
  if (geminiKey) {
    try {
      logger.info('[PDF Parser] Etapa 0: enviando PDF binário direto ao Gemini (multimodal)...');
      const directResult = await extractWithAIPdfDirect(pdfBuffer, geminiKey, bankSections);

      if (directResult && directResult.cards && directResult.cards.some((c) => c.items && c.items.length > 0)) {
        logger.info(`[PDF Parser] Extração via PDF direto concluída! (${directResult.cards.length} cartão(ões)).`);
        return directResult;
      }
      reasons.push('Gemini (PDF direto): resposta sem itens utilizáveis');
      logger.warn('[PDF Parser] PDF direto não retornou dados válidos. Continuando para fluxo texto→IA.');
    } catch (err) {
      throwIfPdfPasswordError(err);
      if (isAiRateLimitError(err)) {
        reasons.push(rateLimitMessage('Gemini (PDF direto)', err));
      } else {
        reasons.push(`Gemini (PDF direto) falhou: ${getErrorMessage(err).slice(0, 150)}`);
        logger.warn(`[PDF Parser] PDF direto falhou: ${getErrorMessage(err)}`);
      }
    }
  }

  // ===== Etapa 1: Gemini — texto extraído via pdf-parse =====
  if (geminiKey) {
    logger.info('[PDF Parser] Ordem de extração: Solicitando IA (Gemini) em primeiro lugar (até 3 tentativas)...');

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`[PDF Parser] Tentativa IA ${attempt}/3...`);
        const aiResult = await extractWithAI(pdfBuffer, geminiKey, password, bankSections);

        if (aiResult && aiResult.cards && aiResult.cards.some((c) => c.items && c.items.length > 0)) {
          logger.info(`[PDF Parser] Extração via IA concluída com sucesso na tentativa ${attempt}! (${aiResult.cards.length} cartão(ões)).`);
          return aiResult;
        }
        logger.warn(`[PDF Parser Warning] Tentativa IA ${attempt}/3 não retornou dados válidos.`);
      } catch (err) {
        throwIfPdfPasswordError(err);
        if (isAiRateLimitError(err)) {
          reasons.push(rateLimitMessage('Gemini (texto)', err));
          break; // cota por modelo/dia — tentativas seguintes falham igual
        }
        logger.warn(`[PDF Parser Warning] Erro na chamada da IA (tentativa ${attempt}/3): ${getErrorMessage(err)}`);
      }
    }
    if (!reasons.some((r) => r.startsWith('Gemini (texto)'))) {
      reasons.push('Gemini (texto): sem resposta utilizável em 3 tentativas');
    }
  }

  // ===== Etapa 2: Fallback OpenAI-compatible — PDF binário direto =====
  if (hasFallback) {
    try {
      logger.info('[PDF Parser] Etapa 2: fallback — enviando PDF direto ao provider de contingência...');
      const fbDirect = await extractWithFallbackPdfDirect(pdfBuffer, bankSections);

      if (fbDirect && fbDirect.cards && fbDirect.cards.some((c) => c.items && c.items.length > 0)) {
        logger.info(`[PDF Parser] Extração via fallback (PDF direto) concluída! (${fbDirect.cards.length} cartão(ões)).`);
        return fbDirect;
      }
      reasons.push('Fallback (PDF direto): resposta sem itens utilizáveis');
    } catch (err) {
      throwIfPdfPasswordError(err);
      if (isAiRateLimitError(err)) {
        reasons.push(rateLimitMessage('Fallback (PDF direto)', err));
      } else {
        reasons.push(`Fallback (PDF direto) falhou: ${getErrorMessage(err).slice(0, 150)}`);
      }
    }
  }

  // ===== Etapa 3: Fallback OpenAI-compatible — texto extraído =====
  if (hasFallback) {
    try {
      logger.info('[PDF Parser] Etapa 3: fallback — enviando texto extraído ao provider de contingência...');
      const options = (password ? { password } : {}) as unknown as Parameters<typeof pdfParse>[1];
      const parsedPdf = await pdfParse(pdfBuffer, options);
      const text = parsedPdf.text || '';

      const fbText = await extractWithFallbackText(text, bankSections);
      if (fbText && fbText.cards && fbText.cards.some((c) => c.items && c.items.length > 0)) {
        logger.info(`[PDF Parser] Extração via fallback (texto) concluída! (${fbText.cards.length} cartão(ões)).`);
        return fbText;
      }
      reasons.push('Fallback (texto): resposta sem itens utilizáveis');
    } catch (err) {
      throwIfPdfPasswordError(err);
      if (isAiRateLimitError(err)) {
        reasons.push(rateLimitMessage('Fallback (texto)', err));
      } else {
        reasons.push(`Fallback (texto) falhou: ${getErrorMessage(err).slice(0, 150)}`);
      }
    }
  }

  // ===== Todos os providers falharam =====
  logger.error({ reasons }, 'Extração via IA falhou em todas as etapas');
  throw new Error(
    'Não foi possível extrair os dados da fatura via IA. Motivos: ' +
    `${reasons.join('; ') || 'sem resposta utilizável'}. ` +
    'Verifique se o PDF é uma fatura de cartão legível e tente novamente.',
  );
}

// Extração local (regex) preservada em services/regexExtractor.js + parsers/
// para reativação pontual via extractWithRegex(pdfBuffer, password).
void extractWithRegex;