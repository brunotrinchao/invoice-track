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

export interface InstallmentsItem {
  description: string
  monthlyAmount: number
  remainingCount: number
  remainingTotal: number
  lastMonth: string
  progressCurrent: number
  progressTotal: number
  endingSoon: boolean
}

export interface InstallmentsGroup {
  cardId: string
  bankName: string
  last4Digits: string
  items: InstallmentsItem[]
}

export interface InstallmentsReportData {
  groups: InstallmentsGroup[]
  summary: { openCount: number; remainingTotal: number }
}

export interface InstallmentsParams {
  cardIds?: string[]
  banks?: string[]
  from?: string
  to?: string
  status?: string
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

  async function getInstallmentsReport(params: InstallmentsParams = {}): Promise<InstallmentsReportData> {
    const query = new URLSearchParams()
    if (params.cardIds?.length) query.set('cardIds', params.cardIds.join(','))
    if (params.banks?.length) query.set('banks', params.banks.join(','))
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    if (params.status) query.set('status', params.status)

    const qs = query.toString()
    const res = await fetch(apiUrl(`/api/reports/installments${qs ? `?${qs}` : ''}`))
    if (!res.ok) throw new Error(`GET /api/reports/installments -> ${res.status}`)
    return res.json() as Promise<InstallmentsReportData>
  }

  return { predictability, getRecurringReport, getInstallmentsReport }
}

// ===== Export (blob → download) =====

export interface ExportParamsFront {
  banks?: string[]
  from?: string
  to?: string
  status?: string
}

export function useDashboardExport() {
  const exporting = ref<'pdf' | 'excel' | null>(null)
  const error = ref<string | null>(null)

  async function download(
    kind: 'pdf' | 'excel',
    params: ExportParamsFront,
  ): Promise<void> {
    exporting.value = kind
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.banks?.length) query.set('banks', params.banks.join(','))
      if (params.from) query.set('from', params.from)
      if (params.to) query.set('to', params.to)
      if (params.status) query.set('status', params.status)
      const qs = query.toString()

      const res = await fetch(apiUrl(`/api/reports/export/${kind}${qs ? `?${qs}` : ''}`))
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || `GET /api/reports/export/${kind} -> ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = kind === 'pdf' ? 'relatorio-previsibilidade.pdf' : 'dashboard-previsibilidade.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      exporting.value = null
    }
  }

  return { exporting, error, download }
}