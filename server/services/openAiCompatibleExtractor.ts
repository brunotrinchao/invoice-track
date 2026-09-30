import {
  EXTRACTION_PROMPT_CORE,
  EXTRACTION_JSON_SCHEMA,
  buildExtractionPrompt,
  processAiJson,
} from './aiExtractor.js';
import { ExtractedInvoiceResult } from './parsers/InvoiceParserInterface.js';
import { getErrorMessage, throwIfAiRateLimit } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Provider genérico OpenAI-compatible para o fallback de extração:
 * OpenRouter, Groq, Mistral, Together, etc. — base URL + key via env.
 * Reusa prompt/JSON schema/processAiJson do aiExtractor (zero duplicação).
 *
 * env:
 *   FALLBACK_BASE_URL  (ex: https://openrouter.ai/api/v1)
 *   FALLBACK_API_KEY   (ex: sk-or-v1-...)
 *   FALLBACK_MODEL     (ex: qwen/qwen2.5-vl-72b-instruct:free) — opcional;
 *                      default: candidatos inline p/ OpenRouter
 *   FALLBACK_LABEL     (ex: OpenRouter) — opcional, p/ logs/UX (default "Fallback IA")
 */

interface ChatChoice {
  message?: { content?: string };
}

interface ChatResponse {
  choices?: ChatChoice[];
  error?: { message?: string };
}

const OPENROUTER_MODELS = [
  'dots-studio/dots-3-note-preview:free',
  'qwen/qwen3.8-27b:free',
  'google/gemma-4-31b-it:free',
];

function getFallbackConfig(): { baseUrl: string; key: string; label: string; models: string[] } | null {
  const baseUrl = process.env.FALLBACK_BASE_URL;
  const key = process.env.FALLBACK_API_KEY;
  if (!baseUrl || !key) return null;
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    key,
    label: process.env.FALLBACK_LABEL || 'Fallback IA',
    // FALLBACK_MODEL vai primeiro, mas os defaults sempre ficam como backup —
    // slugs free mudam com frequência e um modelo retirado não pode matar o fallback.
    models: process.env.FALLBACK_MODEL
      ? [process.env.FALLBACK_MODEL, ...OPENROUTER_MODELS]
      : OPENROUTER_MODELS,
  };
}

/** POST /chat/completions para UM modelo. Lança em falha HTTP/HTTP-ish. */
async function callChatOnce(
  cfg: { baseUrl: string; key: string; label: string },
  modelName: string,
  parts: unknown[],
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      // OpenRouter pede estes headers para routing/ranking:
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Invoice Track',
    },
    body: JSON.stringify({
      model: modelName,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: parts }],
    }),
  });

  const json = (await res.json()) as ChatResponse;
  if (!res.ok) {
    const err = new Error(json.error?.message || `HTTP ${res.status}`);
    (err as Error & { httpStatus?: number }).httpStatus = res.status;
    throw err;
  }
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Resposta sem conteúdo.');
  }
  return content;
}

/**
 * Tenta os modelos candidatos em sequência; um modelo "atendeu" só quando
 * o conteúdo vira dados utilizáveis (validação feita pelo caller via
 * `validate`). Assim resposta vazia/inválida de um modelo pula ao próximo.
 */
async function callChat(
  cfg: { baseUrl: string; key: string; label: string; models: string[] },
  parts: unknown[],
  validate: (content: string) => unknown,
): Promise<string> {
  const attempts: string[] = [];

  for (const modelName of cfg.models) {
    try {
      const content = await callChatOnce(cfg, modelName, parts);
      const ok = validate(content);
      if (ok) return content;
      attempts.push(`${modelName}: resposta sem itens utilizáveis`);
      logger.warn(
        { response: content.slice(0, 800) },
        `[${cfg.label}] ${modelName}: resposta não vira dados de extração`,
      );
    } catch (error) {
      const msg = getErrorMessage(error);
      attempts.push(`${modelName}: ${msg.slice(0, 140)}`);
      if (/\b429\b|Too Many Requests|quota/i.test(msg)) {
        throwIfAiRateLimit(error, cfg.label); // 429: nada adianta pular modelo (pool compartilhado)
      }
      // 404/400/outros → próximo candidato
    }
  }

  throw new Error(`Nenhum modelo atendeu. ${attempts.join('; ')}`);
}

/** Validação reusada pelos 2 fluxos: content → resultado com itens. */
function validateExtraction(content: string): ExtractedInvoiceResult | null {
  try {
    return processAiJson(content, 'gpt');
  } catch {
    return null;
  }
}

/** Fallback A: PDF direto (multimodal, data-URI base64). */
export async function extractWithFallbackPdfDirect(
  pdfBuffer: Buffer,
  bankSections?: string,
): Promise<ExtractedInvoiceResult | null> {
  const cfg = getFallbackConfig();
  if (!cfg) return null;

  try {
    const b64 = pdfBuffer.toString('base64');
    const parts = [
      { type: 'text', text: buildExtractionPrompt('o documento PDF anexado', bankSections) },
      {
        type: 'file',
        file: {
          filename: 'invoice.pdf',
          file_data: `data:application/pdf;base64,${b64}`,
        },
      },
    ];

    const responseText = await callChat(cfg, parts, validateExtraction);
    logger.info({ responseLen: responseText.length }, `[${cfg.label}] Extração via PDF direto concluída.`);

    return validateExtraction(responseText);
  } catch (error) {
    throwIfAiRateLimit(error, cfg.label);
    logger.warn({ err: getErrorMessage(error) }, `[${cfg.label} Warning] Falha no PDF direto`);
    return null;
  }
}

/** Fallback B: texto extraído do PDF (pdf-parse) enviado como texto. */
export async function extractWithFallbackText(
  text: string,
  bankSections?: string,
): Promise<ExtractedInvoiceResult | null> {
  const cfg = getFallbackConfig();
  if (!cfg || !text || text.trim().length === 0) return null;

  try {
    const sections = bankSections?.trim()
      ? bankSections
      : '(Instruções por banco não cadastradas: extraia pelas convenções gerais abaixo.)';

    const prompt = `Você é um leitor especialista em faturas de cartão de crédito brasileiras.
Analise o texto da fatura a seguir e extraia as informações estruturadas em JSON estrito.
${EXTRACTION_PROMPT_CORE.replace('$BANK_SECTIONS', sections)}

${EXTRACTION_JSON_SCHEMA}

Texto da Fatura:
---
${text.slice(0, 15000)}
---`;

    const responseText = await callChat(cfg, [{ type: 'text', text: prompt }], validateExtraction);
    logger.info({ textLen: text.length, responseLen: responseText.length }, `[${cfg.label}] Extração via texto concluída.`);

    return validateExtraction(responseText);
  } catch (error) {
    throwIfAiRateLimit(error, cfg.label);
    logger.warn({ err: getErrorMessage(error) }, `[${cfg.label} Warning] Falha no fluxo texto`);
    return null;
  }
}