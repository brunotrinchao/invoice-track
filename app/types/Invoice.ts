import type { Card } from './Card'
import type { InvoiceItem } from './InvoiceItem'
import type { InvoiceFee } from './InvoiceFee'

/**
 * Contrato API: Invoice
 * Refleja el modelo Prisma `Invoice` y la respuesta de GET /api/invoices
 * (con `card` y `items` incluidos).
 * Ver: server/routes/invoices.ts, prisma/schema.prisma
 */
export interface Invoice {
  id: string
  cardId: string
  card?: Card
  monthYear: string // Formato "YYYY-MM" (Ej: "2026-09")
  dueDate?: string | null // Formato ISO o "YYYY-MM-DD"
  totalAmount: number
  purchasesAmount: number
  fineAmount: number
  interestAmount: number
  taxesAmount: number
  feesAmount: number
  creditsAmount: number
  declaredAmount?: number
  isPaid: boolean
  createdAt: string
  updatedAt: string
  items: InvoiceItem[]
  fees: InvoiceFee[]
}