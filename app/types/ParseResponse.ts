/**
 * Contratos de extracción de fatura PDF — espejo de src/types/index.ts (React).
 * Ver: server/routes/parse.ts, server/routes/confirm.ts
 */

export interface ParsedInvoiceItem {
  id?: string
  description: string
  amount?: number
  originalAmount: number
  currentInstallment: number
  totalInstallments: number
  purchaseDate?: string
  extractedBy?: 'ai' | 'regex'
  itemType?: string
  /** Solo en el modal de confirmación (human-in-the-loop) */
  selected?: boolean
}

export interface ParsedCardTransactions {
  bankName: string
  brand: string
  last4Digits: string
  totalAmount: number
  items: ParsedInvoiceItem[]
}

export interface ExtractedInvoiceResult {
  monthReferenced: string
  dueDate?: string
  cards: ParsedCardTransactions[]
  extractedBy: 'ai' | 'gemini' | 'gpt' | 'regex'
  usedPassword?: string
  declaredInvoiceTotal?: number
}

export interface ExistingInvoiceItem {
  id: string
  description: string
  originalAmount: number
  currentInstallment: number
  totalInstallments: number
  itemType?: string
  extractedBy?: string
  isRecurring?: boolean
  recurringItemId?: string | null
}

export interface ExistingInvoiceFee {
  id: string
  description: string
  amount: number
  feeType?: string
}

export interface ExistingInvoice {
  id: string
  monthYear: string
  dueDate?: string | null
  totalAmount: number
  declaredAmount?: number | null
  isPaid: boolean
  card: {
    bankName: string
    brand: string
    last4Digits: string
  }
  items: ExistingInvoiceItem[]
  fees: ExistingInvoiceFee[]
}

export interface ParseResponse {
  success: boolean
  data: ExtractedInvoiceResult
  isDuplicate: boolean
  existingInvoice?: ExistingInvoice | null
  usedPassword?: string
  /** true quando o PDF está cifrado e o backend pede a senha */
  requiresPassword?: boolean
}