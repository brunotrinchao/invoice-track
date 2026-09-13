/**
 * Contrato API: InvoiceItem
 * Refleja el modelo Prisma `InvoiceItem` (incluida la feature de compras
 * recurrentes — sección 3 del design doc).
 * Ver: prisma/schema.prisma
 */
export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  originalAmount: number
  currentInstallment: number
  totalInstallments: number
  itemType: 'PURCHASE' | 'FEE' | 'FINE' | 'INTEREST' | 'TAX' | 'CREDIT'
  purchaseDate?: string
  extractedBy: 'ai' | 'regex'
  isRecurring: boolean
  recurringItemId?: string | null
  createdAt: string
}