import { Router } from 'express';
import { parsePdfInvoice } from '../services/pdfParser.js';
import { PdfPasswordRequiredError } from '../services/regexExtractor.js';
import { prisma } from '../db.js';
import { normalizeBankName } from '../services/bankUtils.js';
import { getErrorMessage } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface ExistingInvoiceSummary {
  id: string;
  monthYear: string;
  totalAmount: number;
  declaredAmount: number | null;
  isPaid: boolean;
  card: { bankName: string; brand: string; last4Digits: string };
  items: {
    id: string;
    description: string;
    originalAmount: number;
    currentInstallment: number | null;
    totalInstallments: number | null;
    itemType: string;
    extractedBy: string;
    isRecurring: boolean;
    recurringItemId: string | null;
  }[];
  fees: { id: string; description: string; amount: number; feeType: string }[];
}

export const parseRouter = Router();

parseRouter.post('/', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado.' });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    // Diagnóstico: guarda o último PDF recebido p/ depuração de extração (IA).
    try {
      const { writeFileSync } = await import('fs');
      writeFileSync('/tmp/invoice-track-last.pdf', file.data);
    } catch {
      /* dump é best-effort — nunca bloqueia a rota */
    }
    const apiKey = req.body.apiKey as string | undefined;
    let password = req.body.password as string | undefined;

    let extractedData;

    // 1. Tentar abrir com senhas salvas no banco se nenhuma senha foi fornecida
    if (!password) {
      const savedCards = await prisma.card.findMany({
        where: { pdfPassword: { not: null } },
        select: { pdfPassword: true },
      });

      const uniqueSavedPasswords = Array.from(
        new Set(savedCards.map((c) => c.pdfPassword).filter(Boolean) as string[])
      );

      for (const savedPass of uniqueSavedPasswords) {
        try {
          extractedData = await parsePdfInvoice(file.data, apiKey, savedPass);
          if (extractedData) {
            password = savedPass;
            logger.info('[Parse Router] PDF aberto com sucesso usando senha salva no MySQL!');
            break;
          }
        } catch (err) {
          // Tentar próxima senha
        }
      }
    }

    // 2. Extrair se ainda não extraiu
    if (!extractedData) {
      try {
        extractedData = await parsePdfInvoice(file.data, apiKey, password);
      } catch (err) {
        const msg = getErrorMessage(err);
        if (err instanceof PdfPasswordRequiredError || msg.toLowerCase().includes('senha')) {
          return res.status(200).json({
            success: false,
            requiresPassword: true,
            error: getErrorMessage(err) || 'Este arquivo PDF está protegido por senha.',
          });
        }
        throw err;
      }
    }

    if (extractedData && password) {
      extractedData.usedPassword = password;
    }

    if (!extractedData || !Array.isArray(extractedData.cards)) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível extrair dados válidos deste PDF. Verifique se o arquivo é uma fatura de cartão de crédito suportada.',
      });
    }

    // 3. Verificar duplicação e buscar dados da fatura existente no MySQL (batch — sem N+1)
    let isDuplicate = false;
    let existingInvoiceData: ExistingInvoiceSummary | null = null;

    const seenKeys = new Set<string>();
    const wanted = extractedData.cards.map((cardData) => {
      const bankName = normalizeBankName(cardData.bankName);
      cardData.bankName = bankName;
      return { bankName, brand: cardData.brand, last4Digits: cardData.last4Digits };
    }).filter((k) => {
      const key = `${k.bankName}|${k.brand}|${k.last4Digits}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    const existingCards = wanted.length
      ? await prisma.card.findMany({ where: { OR: wanted } })
      : [];
    const cardByKey = new Map(existingCards.map((c) => [`${c.bankName}|${c.brand}|${c.last4Digits}`, c]));
    const existingInvoices = existingCards.length
      ? await prisma.invoice.findMany({
          where: { cardId: { in: existingCards.map((c) => c.id) }, monthYear: extractedData.monthReferenced },
          include: { card: true, items: true, fees: true },
        })
      : [];
    const invoiceByCardId = new Map(existingInvoices.map((inv) => [inv.cardId, inv]));

    for (const cardData of extractedData.cards) {
      const key = `${cardData.bankName}|${cardData.brand}|${cardData.last4Digits}`;
      const existingCard = cardByKey.get(key);
      const existingInvoice = existingCard ? invoiceByCardId.get(existingCard.id) : undefined;

      if (existingInvoice && existingInvoice.items.length > 0) {
        isDuplicate = true;
        existingInvoiceData = {
          id: existingInvoice.id,
          monthYear: existingInvoice.monthYear,
          totalAmount: Number(existingInvoice.totalAmount),
          declaredAmount: existingInvoice.declaredAmount ? Number(existingInvoice.declaredAmount) : null,
          isPaid: existingInvoice.isPaid,
          card: {
            bankName: existingInvoice.card.bankName,
            brand: existingInvoice.card.brand,
            last4Digits: existingInvoice.card.last4Digits,
          },
          items: existingInvoice.items.map((i) => ({
            id: i.id,
            description: i.description,
            originalAmount: Number(i.originalAmount),
            currentInstallment: i.currentInstallment,
            totalInstallments: i.totalInstallments,
            itemType: i.itemType,
            extractedBy: i.extractedBy,
            isRecurring: i.isRecurring,
            recurringItemId: i.recurringItemId,
          })),
          fees: existingInvoice.fees.map((f) => ({
            id: f.id,
            description: f.description,
            amount: Number(f.amount),
            feeType: f.feeType,
          })),
        };
        break;
      }
    }

    return res.json({
      success: true,
      data: extractedData,
      usedPassword: password,
      isDuplicate,
      existingInvoice: existingInvoiceData,
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro na rota /api/parse-invoice');
    return res.status(500).json({ error: 'Falha ao processar a fatura PDF: ' + getErrorMessage(error) });
  }
});
