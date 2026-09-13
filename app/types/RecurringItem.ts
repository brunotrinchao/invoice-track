import type { Card } from './Card'
import type { InvoiceItem } from './InvoiceItem'

/**
 * Contrato API: RecurringItem
 * Refleja el modelo Prisma `RecurringItem` del design doc (sección 3.1).
 * Es la fuente de verdad de una compra recurrente; las instancias
 * materializadas viven en InvoiceItem.recurringId.
 */
export interface RecurringItem {
  id: string
  cardId: string
  card?: Card
  description: string
  amount: number
  /** "YYYY-MM" — primera factura donde aparece */
  startMonthYear: string
  /** "YYYY-MM" — null = para siempre */
  endMonthYear?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  items?: InvoiceItem[]
}

/** Payload para crear/editar un recurrente (POST /api/recurring, PATCH /api/recurring/:id) */
export interface RecurringItemInput {
  cardId: string
  description: string
  amount: number
  startMonthYear: string
  endMonthYear?: string | null
  active?: boolean
}