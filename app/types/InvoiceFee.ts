/**
 * Contrato API: InvoiceFee
 * Refleja el modelo Prisma `InvoiceFee`.
 * Ver: prisma/schema.prisma
 */
export interface InvoiceFee {
  id: string
  invoiceId: string
  description: string
  amount: number
  feeType: 'FINE' | 'INTEREST' | 'TAX' | 'FEE' | 'OTHER'
  createdAt: string
}