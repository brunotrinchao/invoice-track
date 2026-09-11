import { Router } from 'express';
import { parsePdfInvoice } from '../services/pdfParser.js';
import { PdfPasswordRequiredError } from '../services/regexExtractor.js';
import { prisma } from '../db.js';

export const parseRouter = Router();

parseRouter.post('/', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado.' });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
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
            console.log('[Parse Router] PDF aberto com sucesso usando senha salva no MySQL!');
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
      } catch (err: any) {
        if (err instanceof PdfPasswordRequiredError || (err.message && err.message.toLowerCase().includes('senha'))) {
          return res.status(200).json({
            success: false,
            requiresPassword: true,
            error: err.message || 'Este arquivo PDF está protegido por senha.',
          });
        }
        throw err;
      }
    }

    if (extractedData && password) {
      extractedData.usedPassword = password;
    }

    // 3. Verificar duplicação em qualquer um dos cartões encontrados na fatura
    let isDuplicate = false;

    for (const cardData of extractedData.cards) {
      const existingCard = await prisma.card.findUnique({
        where: {
          bankName_brand_last4Digits: {
            bankName: cardData.bankName,
            brand: cardData.brand,
            last4Digits: cardData.last4Digits,
          },
        },
      });

      if (existingCard) {
        const existingInvoice = await prisma.invoice.findUnique({
          where: {
            cardId_monthYear: {
              cardId: existingCard.id,
              monthYear: extractedData.monthReferenced,
            },
          },
          include: { _count: { select: { items: true } } },
        });

        if (existingInvoice && existingInvoice._count.items > 0) {
          isDuplicate = true;
          break;
        }
      }
    }

    return res.json({
      success: true,
      data: extractedData,
      usedPassword: password,
      isDuplicate,
    });
  } catch (error: any) {
    console.error('Erro na rota /api/parse-invoice:', error);
    return res.status(500).json({ error: 'Falha ao processar a fatura PDF: ' + error.message });
  }
});
