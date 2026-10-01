import { Router } from 'express';
import { prisma } from '../db.js';
import { getErrorMessage } from '../utils/errors.js';
import { logger, respondError } from '../utils/logger.js';
import { z } from 'zod';
import {
  listAll,
  upsertBankInstruction,
  deleteBankInstruction,
  INSTRUCTION_META_PROMPT,
  type MetaInstruction,
} from '../services/bankInstructionService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const settingsRouter = Router();

// ===== Meta-extração de instruções (Gemini → fallback OpenRouter) =====

interface MetaJson {
  bankName?: string;
  brand?: string;
  keywords?: unknown;
  rules?: unknown;
}

/**
 * Chama a IA com o meta-prompt: Gemini primeiro (PDF direto), fallback
 * OpenRouter-compatible. Retorna a proposta de instrução validada.
 */
async function extractInstructionFromPdf(pdfBuffer: Buffer): Promise<MetaInstruction> {
  const metaSchemaJson = `Retorne EXATAMENTE o objeto JSON descrito nas regras acima.`;
  const gptKey = process.env.FALLBACK_API_KEY || null;
  const geminiKey = process.env.GEMINI_API_KEY || null;
  const attempts: string[] = [];

  const parseMeta = (content: string): MetaInstruction | null => {
    try {
      const json = JSON.parse(content) as MetaJson;
      const keywords = Array.isArray(json.keywords)
        ? (json.keywords as unknown[]).map(String).filter((k) => k && k.trim().length > 1)
        : [];
      const rules = Array.isArray(json.rules)
        ? (json.rules as unknown[]).map(String).filter((r) => r && r.trim().length > 10)
        : [];
      if (!json.bankName || keywords.length < 1 || rules.length < 4) return null;
      return { bankName: String(json.bankName), brand: String(json.brand || 'Mastercard'), keywords, rules };
    } catch {
      return null;
    }
  };

  // 1. Gemini (PDF direto, multimodal)
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const pdfPart = { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } };
      let lastError: unknown = null;
      for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
          });
          const result = await model.generateContent([pdfPart, `${INSTRUCTION_META_PROMPT}\n\n${metaSchemaJson}`]);
          const parsed = parseMeta(result.response.text());
          if (parsed) return parsed;
          lastError = new Error('resposta sem dados utilizáveis');
        } catch (e) {
          lastError = e;
          const msg = getErrorMessage(e);
          if (/\b429\b|quota/i.test(msg)) break; // cota — tenta fallback
        }
      }
      attempts.push(`Gemini: ${getErrorMessage(lastError).slice(0, 120)}`);
    } catch (e) {
      attempts.push(`Gemini: ${getErrorMessage(e).slice(0, 120)}`);
    }
  }

  // 2. Fallback OpenRouter-compatible (PDF como file part data-URI)
  if (gptKey) {
    try {
      const baseUrl = (process.env.FALLBACK_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
      const models = process.env.FALLBACK_MODEL
        ? [process.env.FALLBACK_MODEL, 'dots-studio/dots-3-note-preview:free', 'qwen/qwen3.8-27b:free']
        : ['dots-studio/dots-3-note-preview:free', 'qwen/qwen3.8-27b:free', 'google/gemma-4-31b-it:free'];
      let lastError: unknown = null;
      for (const modelName of models) {
        try {
          const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gptKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Nossos Cartões',
            },
            body: JSON.stringify({
              model: modelName,
              response_format: { type: 'json_object' },
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: `${INSTRUCTION_META_PROMPT}\n\n${metaSchemaJson}` },
                  { type: 'file', file: { filename: 'invoice.pdf', file_data: `data:application/pdf;base64,${pdfBuffer.toString('base64')}` } },
                ],
              }],
            }),
          });
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
          if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
          const content = json.choices?.[0]?.message?.content;
          if (!content) throw new Error('Resposta sem conteúdo');
          const parsed = parseMeta(content);
          if (parsed) return parsed;
          lastError = new Error('resposta sem dados utilizáveis');
        } catch (e) {
          lastError = e;
        }
      }
      attempts.push(`Fallback: ${getErrorMessage(lastError).slice(0, 120)}`);
    } catch (e) {
      attempts.push(`Fallback: ${getErrorMessage(e).slice(0, 120)}`);
    }
  }

  throw new Error(`Nenhuma IA conseguiu analisar o PDF. ${attempts.join('; ')}`);
}

// ===== CRUD bank-instructions =====

const upsertSchema = z.object({
  bankName: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  rules: z.string().min(20),
  source: z.enum(['seed', 'pdf', 'manual']).optional(),
});

settingsRouter.get('/bank-instructions', async (_req, res) => {
  try {
    return res.json({ success: true, instructions: await listAll() });
  } catch (error) {
    return respondError(res, 500, 'Erro ao listar instruções: ' + getErrorMessage(error));
  }
});

settingsRouter.post('/bank-instructions', async (req, res) => {
  try {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, 400, 'Dados inválidos: bankName, keywords (array) e rules (≥20 chars) obrigatórios.');
    }
    const inst = await upsertBankInstruction(parsed.data);
    return res.status(201).json({ success: true, instruction: inst });
  } catch (error) {
    return respondError(res, 500, 'Erro ao salvar instrução: ' + getErrorMessage(error));
  }
});

settingsRouter.patch('/bank-instructions/:id', async (req, res) => {
  try {
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, 400, 'Dados inválidos para atualização.');
    }
    const row = await prisma.bankInstruction.findUnique({ where: { id: req.params.id } });
    if (!row) {
      return respondError(res, 404, 'Instrução não encontrada.');
    }
    const updated = await upsertBankInstruction({
      bankName: parsed.data.bankName ?? row.bankName,
      keywords: parsed.data.keywords ?? JSON.parse(row.keywords),
      rules: parsed.data.rules ?? row.rules,
      source: (parsed.data.source as 'seed' | 'pdf' | 'manual') ?? 'manual',
    });
    return res.json({ success: true, instruction: updated });
  } catch (error) {
    return respondError(res, 500, 'Erro ao atualizar instrução: ' + getErrorMessage(error));
  }
});

settingsRouter.delete('/bank-instructions/:id', async (req, res) => {
  try {
    await deleteBankInstruction(req.params.id);
    return res.json({ success: true, message: 'Instrução removida.' });
  } catch (error) {
    return respondError(res, 500, 'Erro ao remover instrução: ' + getErrorMessage(error));
  }
});

// ===== Extract-from-pdf (preview, sem salvar) =====

settingsRouter.post('/bank-instructions/extract-from-pdf', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return respondError(res, 400, 'Nenhum PDF enviado.');
    }
    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    const instruction = await extractInstructionFromPdf(file.data);
    return res.json({ success: true, instruction });
  } catch (error) {
    logger.warn({ err: error }, 'extract-from-pdf falhou');
    return respondError(res, 502, getErrorMessage(error));
  }
});

/**
 * Limpar base: remove TODOS os dados (cartões, faturas, itens, taxas,
 * recorrentes). Cascata do Prisma cobre as relações; recursivo por segurança
 * (recorrentes podem existir sem card em edge cases de migração).
 */
settingsRouter.delete('/data', async (req, res) => {
  const parsed = z.object({ confirm: z.literal('LIMPAR TUDO') }).safeParse(req.body ?? {});
  if (!parsed.success) {
    return respondError(
      res,
      400,
      "Confirmação obrigatória: body { confirm: 'LIMPAR TUDO' }. Ação irreversível.",
    );
  }

  try {
    logger.warn('Limpar base acionado — removendo todos os dados');
    const result = await prisma.$transaction(async (tx) => {
      const recurring = await tx.recurringItem.deleteMany({});
      const cards = await tx.card.deleteMany({});
      return { cards: cards.count, recurringItems: recurring.count };
    });

    logger.info(result, 'Base limpa');
    return res.json({
      success: true,
      message: 'Base limpa: todos os cartões, faturas e recorrências foram removidos.',
      ...result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Falha ao limpar base');
    return respondError(res, 500, 'Erro ao limpar base: ' + getErrorMessage(error));
  }
});

// Status da base (contagens) p/ a tela de configuração
settingsRouter.get('/status', async (_req, res) => {
  try {
    const [cards, invoices, items, fees, recurring] = await prisma.$transaction([
      prisma.card.count(),
      prisma.invoice.count(),
      prisma.invoiceItem.count(),
      prisma.invoiceFee.count(),
      prisma.recurringItem.count(),
    ]);
    return res.json({ success: true, status: { cards, invoices, items, fees, recurring } });
  } catch (error) {
    logger.error({ err: error }, 'Falha no status da base');
    return respondError(res, 500, 'Erro ao obter status da base: ' + getErrorMessage(error));
  }
});
