import pdfParse from 'pdf-parse';
import { InvoiceParserFactory } from './parsers/InvoiceParserFactory.js';
import { ExtractedInvoiceResult } from './parsers/InvoiceParserInterface.js';
import { getErrorMessage } from '../utils/errors.js';

export class PdfPasswordRequiredError extends Error {
  constructor(message: string = 'Este arquivo PDF é protegido por senha.') {
    super(message);
    this.name = 'PdfPasswordRequiredError';
  }
}

export async function extractWithRegex(pdfBuffer: Buffer, password?: string): Promise<ExtractedInvoiceResult> {
  let parsedPdf;
  try {
    const options = (password ? { password } : {}) as unknown as Parameters<typeof pdfParse>[1];
    parsedPdf = await pdfParse(pdfBuffer, options);
  } catch (err) {
    const errMsg = getErrorMessage(err).toLowerCase();
    if (
      errMsg.includes('password') ||
      errMsg.includes('encrypted') ||
      errMsg.includes('protected') ||
      errMsg.includes('incorrect password') ||
      (err instanceof Error && err.name === 'PasswordException')
    ) {
      throw new PdfPasswordRequiredError('Este arquivo PDF está protegido por senha ou a senha fornecida é inválida.');
    }
    throw err;
  }

  const text = parsedPdf.text || '';

  // Usar a fábrica InvoiceParserFactory (Padrão Factory)
  return InvoiceParserFactory.parse(text);
}
