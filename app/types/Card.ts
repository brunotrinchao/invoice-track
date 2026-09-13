/**
 * Contrato API: Card
 * Refleja el modelo Prisma `Card` y la respuesta de GET /api/cards.
 * Ver: server/routes/cards.ts, prisma/schema.prisma
 */
export interface Card {
  id: string
  bankName: string
  brand: string
  last4Digits: string
  colorGradient?: string
  pdfPassword?: string
  createdAt: string
  updatedAt: string
  _count?: {
    invoices: number
  }
}