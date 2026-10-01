import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';
import { ExtractedInvoiceResult, ParsedCardTransactions } from './parsers/InvoiceParserInterface.js';
import { getErrorMessage, throwIfAiRateLimit, AiRateLimitError, parseAiRetryDelay } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Detecta parcelas compactas na descrição (ex: "TATPARC11/12", "PARC 3/10")
 * quando a IA marcou o item como 1/1. Exige a palavra PARC (evita falsos
 * positivos com datas). Retorna null quando não há correção.
 */
export function detectInstallmentsFromDescription(
  description: string,
  current: number,
  total: number,
): { currentInstallment: number; totalInstallments: number } | null {
  if (current !== 1 || total !== 1) return null; // só corrige "à vista"
  const m = /PARC\.?\s*(\d{1,2})\/(\d{1,2})(?![\d/])/i.exec(description || '');
  if (!m) return null;
  const cur = parseInt(m[1], 10);
  const tot = parseInt(m[2], 10);
  if (!tot || tot < 2 || tot > 48 || cur < 1 || cur > tot) return null;
  return { currentInstallment: cur, totalInstallments: tot };
}

/**
 * Núcleo do prompt de extração (compartilhado pelos dois modos de envio:
 * PDF direto multimodal e texto extraído via pdf-parse).
 */
export const EXTRACTION_PROMPT_CORE = `Analise $SOURCE da fatura e extraia as informações estruturadas em JSON estrito.
ATENÇÃO: Uma única fatura PDF pode conter mais de um cartão de crédito (ex: cartão principal + cartões adicionais). Agrupe as compras por cartão.

$BANK_SECTIONS

- "monthReferenced": Mês de referência em formato YYYY-MM correspondente ao mês de vencimento da fatura. Exemplo: se a data de vencimento for em Setembro (10/09/2026), o "monthReferenced" DEVE SER "2026-09". Se o vencimento foi 17/08/2026 (Agosto), o "monthReferenced" DEVE SER "2026-08". Se o vencimento foi 10/01/2026 (Janeiro), o "monthReferenced" DEVE SER "2026-01".
- "dueDate": A DATA DE VENCIMENTO da fatura, exatamente como impressa no PDF, em formato YYYY-MM-DD. Procure por "Vencimento", "Data de vencimento", "Total a pagar até", "Pague até". Exemplo: "Vencimento: 17/08/2026" → "2026-08-17". NUNCA invente a data: se o PDF não informar vencimento, use null.
- "totalAmount": total declarado da seção do cartão no PDF.
- "currentInstallment" e "totalInstallments": se for parcela ex 3/5, use 3 e 5. Se à vista, use 1 e 1. Formatos nas linhas:
  - "PARC 3/10" ou "PARC.05/12" = parcela 3 de 10 / 5 de 12.
  - COMPACTO sem espaço: "TATPARC11/12" ou "XXXPARC05/12" = parcela 11 de 12.
  - "12x R$ 50,00" → total = 12. À vista "1x" = 1/1. NÃO confunda parcela com datas (dd/mm/yyyy).
  - O "amount" é o valor da PARCELA MENSAL (não o total da compra).
- UMA LINHA = UM ITEM. NUNCA agrupe múltiplas linhas de compra em um único item com o total da fatura.
- ITENS DE CRÉDITO, ESTORNOS, REEMBOLSOS E DESCONTOS:
  Extraia TODOS os itens de crédito/estorno/reembolso/desconto/ajuste a crédito do cartão.
  Se o lançamento for um crédito (ex: "Crédito concedido", "Estorno", "Reembolso", "Desconto", "Cashback", "Devolução" ou com sinal "-R$"), coloque "amount" como NÚMERO NEGATIVO (ex: -30.28).
- EXTRAÇÃO DE TARIFAS, MULTAS, JUROS, IOF E SEGUROS:
  Extraia OBRIGATORIAMENTE todas as tarifas, juros de mora/rotativo, multas por atraso, IOF, anuidades, seguros e encargos cobrados na fatura como itens (com amount positivo), associando ao cartão do cliente.
- MERCADO PAGO: a seção "Movimentações na fatura" contém taxas, multas, juros e créditos concedidos (ex: "IOF do rotativo", "Juros do rotativo", "Multa por atraso", "Juros de mora", "Crédito concedido"). Extraia TODOS esses lançamentos como items do cartão principal (créditos com amount negativo). NUNCA os omita.
- "declaredInvoiceTotal": total a pagar do boleto/fatura (ex: "Total a pagar R$ 1.987,88" -> 1987.88). Devolva como número. Se não encontrar, use null.
- NUNCA inclua como item: "PAGTO DEBITO AUTOMATICO", "PAGAMENTO DE FATURA", "PAGAMENTO DA FATURA", "PAGTO DEBITO", "DÉBITO AUTOMÁTICO" ou qualquer lançamento de pagamento/liquidação da fatura anterior. Esses são pagamentos, não compras nem créditos — OMITA-OS completamente.
- NUNCA crie cartões falsos para anos (ex: '2025') ou resumos do boleto.`;

export const EXTRACTION_JSON_SCHEMA = `Retorne EXATAMENTE este objeto JSON:
{
  "monthReferenced": "YYYY-MM",
  "dueDate": "YYYY-MM-DD",
  "declaredInvoiceTotal": 0.0,
  "cards": [
    {
      "bankName": "Mercado Pago | Nubank | Itaú | Bradesco | Santander | Banco Inter | C6 Bank | XP Bank | PicPay | BTG Pactual | Cartão de Crédito",
      "brand": "Mastercard | Visa | Elo | Amex",
      "last4Digits": "4321",
      "totalAmount": 0.0,
      "items": [
        {
          "description": "Nome do estabelecimento / produto",
          "amount": 0.0,
          "currentInstallment": 1,
          "totalInstallments": 1
        }
      ]
    }
  ]
}`;

interface AiParsedItem {
  description?: string;
  amount?: number | string;
  currentInstallment?: number | string;
  totalInstallments?: number | string;
}

interface AiParsedJson {
  monthReferenced?: string;
  dueDate?: string | null;
  declaredInvoiceTotal?: number | string;
  cards?: {
    bankName?: string;
    brand?: string;
    last4Digits?: string;
    totalAmount?: number | string;
    items?: AiParsedItem[];
  }[];
}

/** Monta o prompt completo conforme a fonte + seções de banco dinâmicas. */
export function buildExtractionPrompt(source?: string, bankSections?: string): string {
  const sourceLabel = source ?? 'o documento PDF anexado';
  const sections = bankSections?.trim()
    ? bankSections
    : '(Instruções por banco não cadastradas: extraia pelas convenções gerais abaixo.)';
  return `Você é um leitor especialista em faturas de cartão de crédito brasileiras.
Analise ${sourceLabel} e extraia as informações estruturadas em JSON estrito.
${EXTRACTION_PROMPT_CORE.replace('$BANK_SECTIONS', sections)}

${EXTRACTION_JSON_SCHEMA}`;
}

/**
 * Modelos Gemini candidatas em ordem (novos projetos perdem acesso a versões
 * antigas — API responde 404 "no longer available"; cai para o próximo).
 */
const MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

/**
 * Chama generateContent tentando os modelos candidatas em sequência.
 * Erro de senha → relança; 429/404 → tenta o próximo modelo (quota é
 * por modelo no free tier); mantém o último 429 para a mensagem final.
 */
async function generateExtraction(genAI: GoogleGenerativeAI, parts: unknown): Promise<string> {
  const attempts: string[] = [];
  let lastRateLimit: { sec: number; msg: string } | null = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(parts as Parameters<typeof model.generateContent>[0]);
      return result.response.text();
    } catch (error) {
      throwIfPasswordError(error);
      const msg = getErrorMessage(error);
      if (/\b429\b|Too Many Requests|quota exceeded|exceeded your current quota/i.test(msg)) {
        lastRateLimit = { sec: parseAiRetryDelay(msg), msg };
        attempts.push(`${modelName}: cota excedida`);
      } else if (/\b503\b|high demand|Service Unavailable/i.test(msg)) {
        attempts.push(`${modelName}: sobrecarregado (503)`);
      } else if (/\b404\b|no longer available/i.test(msg)) {
        attempts.push(`${modelName}: indisponível para novos projetos`);
      } else {
        attempts.push(`${modelName}: ${msg.slice(0, 120)}`);
      }
    }
  }

  if (lastRateLimit) {
    throw new AiRateLimitError(
      `Cota esgotada nos modelos disponíveis: ${lastRateLimit.msg.slice(0, 200)}`,
      lastRateLimit.sec,
    );
  }
  throw new Error(`Nenhum modelo Gemini atendeu a chamada. ${attempts.join('; ')}`);
}

/** Converte a resposta JSON da IA no contrato de extração interno. */
export function processAiJson(responseText: string, extractedBy: 'gemini' | 'gpt' = 'gemini'): ExtractedInvoiceResult | null {
  const parsedJson = JSON.parse(responseText) as AiParsedJson;

  if (parsedJson && Array.isArray(parsedJson.cards)) {
    let processedCards: ParsedCardTransactions[] = parsedJson.cards.map((c) => ({
      bankName: c.bankName || 'Cartão de Crédito',
      brand: c.brand || 'Mastercard',
      last4Digits: String(c.last4Digits || '0000').slice(-4),
      totalAmount: parseFloat(String(c.totalAmount)) || 0,
      items: Array.isArray(c.items)
        ? c.items
            .filter((item) => {
              const d = String(item.description || '').toUpperCase();
              return !(
                d.includes('PAGTO DEBITO') ||
                d.includes('PAGAMENTO DE FATURA') ||
                d.includes('PAGAMENTO DA FATURA') ||
                d.includes('PAGTO DEBITO AUTOMATICO') ||
                d.includes('DÉBITO AUTOMÁTICO') ||
                d.includes('DEBITO AUTOMATICO')
              );
            })
            .map((item) => {
            const rawAmt = parseFloat(String(item.amount));
            const descStr = String(item.description || 'Item').slice(0, 80);
            const isCredit = /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(descStr);
            let finalAmount = isNaN(rawAmt) ? 0 : rawAmt;
            if (isCredit && finalAmount > 0) {
              finalAmount = -Math.abs(finalAmount);
            }
            const baseCur = parseInt(String(item.currentInstallment)) || 1;
            const baseTot = parseInt(String(item.totalInstallments)) || 1;
            const fix = detectInstallmentsFromDescription(descStr, baseCur, baseTot);
            return {
              description: descStr,
              amount: finalAmount,
              currentInstallment: fix ? fix.currentInstallment : baseCur,
              totalInstallments: fix ? fix.totalInstallments : baseTot,
            };
          })
        : [],
    }));

    // Consolidar cartões sintéticos (ex: 'Fatu' ou 'Resumo') no cartão principal real
    const realCards = processedCards.filter((c) => c.last4Digits !== 'Fatu' && c.brand !== 'Resumo');
    const syntheticCards = processedCards.filter((c) => c.last4Digits === 'Fatu' || c.brand === 'Resumo');

    if (syntheticCards.length > 0 && realCards.length > 0) {
      let mainCard = realCards[0];
      for (const card of realCards) {
        if (card.totalAmount > mainCard.totalAmount) {
          mainCard = card;
        }
      }
      for (const synCard of syntheticCards) {
        for (const item of synCard.items) {
          mainCard.items.push({
            ...item,
            cardLast4: mainCard.last4Digits,
          });
          mainCard.totalAmount = Math.round((mainCard.totalAmount + item.amount) * 100) / 100;
        }
      }
      processedCards = realCards;
    }

    return {
      monthReferenced: parsedJson.monthReferenced || new Date().toISOString().slice(0, 7),
      dueDate: parsedJson.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(String(parsedJson.dueDate)) ? String(parsedJson.dueDate) : undefined,
      cards: processedCards,
      extractedBy,
      declaredInvoiceTotal: parsedJson.declaredInvoiceTotal ? Number(parsedJson.declaredInvoiceTotal) : undefined,
    };
  }

  return null;
}

/** Re-lança erros relacionados a senha de PDF; retorna null em qualquer outro falha de IA. */
function throwIfPasswordError(error: unknown): void {
  const errMsg = getErrorMessage(error).toLowerCase();
  if (
    errMsg.includes('password') ||
    errMsg.includes('encrypted') ||
    errMsg.includes('protected') ||
    errMsg.includes('senha') ||
    (error instanceof Error && error.name === 'PasswordException')
  ) {
    throw error;
  }
}

/**
 * Fluxo 1 (novo): envia o PDF binário diretamente ao Gemini (multimodal inline)
 * para extração do JSON estruturado. Não usa pdf-parse.
 * Retorna null quando a IA não retornar dados utilizáveis (caller faz fallback).
 */
export async function extractWithAIPdfDirect(pdfBuffer: Buffer, apiKey?: string, bankSections?: string): Promise<ExtractedInvoiceResult | null> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    logger.info('[AI Extractor] Nenhuma chave de API fornecida. Acionando Fallback Regex.');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);

    // PDF inline em base64 (mimeType application/pdf, suportado multimodal pelo Gemini)
    const pdfPart = {
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      },
    };

    const prompt = buildExtractionPrompt('o documento PDF anexado', bankSections);
    const responseText = await generateExtraction(genAI, [pdfPart, prompt]);
    logger.info(
      { bytes: pdfBuffer.length, responseLen: responseText.length },
      '[AI Extractor] Extração via PDF direto (multimodal) concluída.',
    );

    const parsed = processAiJson(responseText);
    if (!parsed) {
      logger.warn(
        { response: responseText.slice(0, 600) },
        '[AI Extractor] PDF direto: resposta da IA sem cartões utilizáveis',
      );
    }
    return parsed;
  } catch (error) {
    throwIfPasswordError(error);
    throwIfAiRateLimit(error, 'PDF direto');
    logger.warn({ err: getErrorMessage(error) }, '[AI Extractor Warning] Falha no envio do PDF direto à IA');
    return null;
  }
}

/**
 * Fluxo 2 (existente): extrai o texto via pdf-parse e envia ao Gemini.
 * Mantido como fallback quando o PDF direto falha ou excede limites inline.
 */
export async function extractWithAI(pdfBuffer: Buffer, apiKey?: string, password?: string, bankSections?: string): Promise<ExtractedInvoiceResult | null> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    logger.info('[AI Extractor] Nenhuma chave de API fornecida. Acionando Fallback Regex.');
    return null;
  }

  try {
    const options = (password ? { password } : {}) as unknown as Parameters<typeof pdfParse>[1];
    const parsedPdf = await pdfParse(pdfBuffer, options);
    const text = parsedPdf.text || '';
    if (!text || text.trim().length === 0) {
      return null;
    }

    const genAI = new GoogleGenerativeAI(key);

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

    const responseText = await generateExtraction(genAI, prompt);
    logger.info(
      { textLen: text.length, responseLen: responseText.length },
      '[AI Extractor] Extração via texto (pdf-parse) concluída.',
    );

    const parsed = processAiJson(responseText);
    if (!parsed) {
      logger.warn(
        { response: responseText.slice(0, 600) },
        '[AI Extractor] Fluxo texto: resposta da IA sem cartões utilizáveis',
      );
    }
    return parsed;
  } catch (error) {
    throwIfPasswordError(error);
    throwIfAiRateLimit(error, 'fluxo texto');
    logger.warn({ err: getErrorMessage(error) }, '[AI Extractor Warning] Falha na chamada da IA');
  }

  return null;
}