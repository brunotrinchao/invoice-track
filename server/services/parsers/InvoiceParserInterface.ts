export interface ExtractedInvoiceItem {
  description: string;
  amount: number;
  currentInstallment: number;
  totalInstallments: number;
  purchaseDate?: string;
  cardLast4?: string;
  itemType?: 'PURCHASE' | 'FEE' | 'FINE' | 'INTEREST' | 'TAX' | 'CREDIT';
}

export interface ParsedCardTransactions {
  bankName: string;
  brand: string;
  last4Digits: string;
  totalAmount: number;
  items: ExtractedInvoiceItem[];
}

export interface ExtractedInvoiceResult {
  monthReferenced: string; // "YYYY-MM"
  cards: ParsedCardTransactions[]; // Suporte a múltiplos cartões por fatura
  extractedBy: 'regex' | 'ai';
  usedPassword?: string;
  declaredInvoiceTotal?: number; // Total a pagar do boleto da fatura
}

export interface InvoiceParserStrategy {
  name: string;
  canParse(text: string): boolean;
  parse(text: string): ExtractedInvoiceResult;
}

/**
 * Retorna o mês/ano de referência da fatura a partir da data de vencimento (mês de consumo M-1).
 * Exemplo: Vencimento 10/09/2026 -> Mês de Referência 2026-08 (Agosto).
 * Exemplo: Vencimento 17/08/2026 -> Mês de Referência 2026-07 (Julho).
 */
export function getPreviousMonthReference(year: number, month: number): string {
  const d = new Date(year, month - 1 - 1, 1);
  const prevYear = d.getFullYear();
  const prevMonth = String(d.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
}
