import { extractWithAI } from './aiExtractor.js';
import { extractWithRegex, PdfPasswordRequiredError } from './regexExtractor.js';
import { ExtractedInvoiceResult } from './parsers/InvoiceParserInterface.js';

export async function parsePdfInvoice(pdfBuffer: Buffer, apiKey?: string, password?: string): Promise<ExtractedInvoiceResult> {
  const keyToUse = apiKey || process.env.GEMINI_API_KEY;

  // 1. Tentar extração via IA primeiro (até 3 tentativas) para todas as faturas
  if (keyToUse) {
    console.log('[PDF Parser] Ordem de extração: Solicitando IA (Gemini) em primeiro lugar (até 3 tentativas)...');

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[PDF Parser] Tentativa IA ${attempt}/3...`);
        const aiResult = await extractWithAI(pdfBuffer, keyToUse, password);

        if (aiResult && aiResult.cards && aiResult.cards.some((c) => c.items && c.items.length > 0)) {
          console.log(`[PDF Parser] Extração via IA concluída com sucesso na tentativa ${attempt}! (${aiResult.cards.length} cartão(ões)).`);
          return aiResult;
        } else {
          console.warn(`[PDF Parser Warning] Tentativa IA ${attempt}/3 não retornou dados válidos.`);
        }
      } catch (err: any) {
        // Se for erro de senha do PDF, relançar imediatamente para solicitar senha ao usuário
        const errMsg = (err.message || err.toString() || '').toLowerCase();
        if (
          err instanceof PdfPasswordRequiredError ||
          errMsg.includes('senha') ||
          errMsg.includes('password') ||
          errMsg.includes('encrypted') ||
          errMsg.includes('protected') ||
          err.name === 'PasswordException'
        ) {
          throw err;
        }
        console.warn(`[PDF Parser Warning] Erro na chamada da IA (tentativa ${attempt}/3):`, err.message || err);
      }
    }

    console.warn('[PDF Parser] A IA não conseguiu extrair os dados após 3 tentativas. Recorrendo à extração local determinística (Regex)...');
  } else {
    console.log('[PDF Parser] Nenhuma chave de API da IA disponível. Executando extração local determinística (Regex)...');
  }

  // 2. Fallback: Extração local determinística (Factory / Regex)
  console.log('[PDF Parser] Executando extração local determinística (Factory / Regex)...');
  const regexResult = await extractWithRegex(pdfBuffer, password);
  return regexResult;
}


