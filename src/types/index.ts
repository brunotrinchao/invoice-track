export interface Card {
  id: string;
  bankName: string;
  brand: string;
  last4Digits: string;
  colorGradient?: string;
  pdfPassword?: string;
  createdAt: string;
  _count?: {
    invoices: number;
  };
}

export interface InvoiceItem {
  id?: string;
  description: string;
  amount?: number;
  originalAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  purchaseDate?: string;
  extractedBy?: 'ai' | 'regex';
  selected?: boolean; // Para o modal de confirmação
}

export interface ParsedCardTransactions {
  bankName: string;
  brand: string;
  last4Digits: string;
  totalAmount: number;
  items: InvoiceItem[];
}

export interface ExtractedInvoiceResult {
  monthReferenced: string;
  cards: ParsedCardTransactions[];
  extractedBy: 'ai' | 'regex';
  usedPassword?: string;
  declaredInvoiceTotal?: number;
}

export interface Invoice {
  id: string;
  cardId: string;
  card?: Card;
  monthYear: string;
  totalAmount: number;
  isPaid?: boolean;
  items: InvoiceItem[];
}

export interface ParseResponse {
  success: boolean;
  data: ExtractedInvoiceResult;
  isDuplicate: boolean;
  usedPassword?: string;
}

export interface PredictabilityMetrics {
  currentMonthTotal: number;
  nextMonthTotal: number;
  totalCommittedFuture: number;
  averageMonthly: number;
}

export interface MonthlySummaryItem {
  monthYear: string;
  total: number;
  purchasesTotal?: number;
  feesTotal?: number;
  creditsTotal?: number;
  byCard: Record<string, number>;
  byBank?: Record<string, number>;
  invoiceCount: number;
}

export interface PredictabilityReportData {
  metrics: PredictabilityMetrics;
  monthlySummary: MonthlySummaryItem[];
  selectedCardIds: string[];
}
