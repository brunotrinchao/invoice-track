import { apiUrl } from '~/utils/api'
import type { Card } from '~/types/Card'

/**
 * Contratos de reportes — espejo de src/types/index.ts (React).
 * Ver: server/routes/reports.ts
 */

export interface PredictabilityMetrics {
  currentMonthTotal: number
  nextMonthTotal: number
  totalCommittedFuture: number
  averageMonthly: number
}

export interface MonthlySummaryItem {
  monthYear: string
  total: number
  purchasesTotal?: number
  feesTotal?: number
  creditsTotal?: number
  byCard: Record<string, number>
  byBank?: Record<string, number>
  invoiceCount: number
}

export interface PredictabilityReportData {
  metrics: PredictabilityMetrics
  monthlySummary: MonthlySummaryItem[]
  selectedCardIds: string[]
  cards: Card[]
}

export interface PredictabilityParams {
  from?: string // "YYYY-MM"
  to?: string // "YYYY-MM"
  cardIds?: string[]
  banks?: string[]
  status?: 'paid' | 'unpaid'
}

export interface RecurringItem {
  description: string
  amount: number
  cardId: string
}

export interface RecurringMonth {
  monthYear: string // "YYYY-MM"
  total: number
  isProjected: boolean
  items: RecurringItem[]
}

export interface RecurringSummary {
  monthlyAverage: number
  nextMonthTotal: number
  activeCount: number
}

export interface RecurringReportData {
  months: RecurringMonth[]
  summary: RecurringSummary
}

export interface RecurringParams {
  from?: string // "YYYY-MM"
  to?: string // "YYYY-MM"
  cardIds?: string[]
  banks?: string[]
}

/**
 * Composables de reportes: encapsulan fetch a /api/reports (Express).
 * Ver: server/routes/reports.ts
 */
export function useReports() {
  async function predictability(params: PredictabilityParams = {}): Promise<PredictabilityReportData> {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    if (params.cardIds?.length) query.set('cardIds', params.cardIds.join(','))
    if (params.banks?.length) query.set('banks', params.banks.join(','))
    if (params.status) query.set('status', params.status)

    const qs = query.toString()
    const res = await fetch(apiUrl(`/api/reports/predictability${qs ? `?${qs}` : ''}`))
    if (!res.ok) throw new Error(`GET /api/reports/predictability -> ${res.status}`)
    return res.json() as Promise<PredictabilityReportData>
  }

  async function getRecurringReport(params: RecurringParams = {}): Promise<RecurringReportData> {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    if (params.cardIds?.length) query.set('cardIds', params.cardIds.join(','))
    if (params.banks?.length) query.set('banks', params.banks.join(','))

    const qs = query.toString()
    const res = await fetch(apiUrl(`/api/reports/recurring${qs ? `?${qs}` : ''}`))
    if (!res.ok) throw new Error(`GET /api/reports/recurring -> ${res.status}`)
    return res.json() as Promise<RecurringReportData>
  }

  return { predictability, getRecurringReport }
}