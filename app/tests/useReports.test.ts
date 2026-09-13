import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReports } from '../composables/useReports'

function jsonResponse(body: unknown, ok = true) {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('useReports', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getRecurringReport parsea months y summary correctamente', async () => {
    const report = {
      months: [
        { monthYear: '2026-07', total: 100, isProjected: false, items: [] },
        { monthYear: '2026-08', total: 120, isProjected: false, items: [] },
        { monthYear: '2026-09', total: 140, isProjected: true, items: [] },
      ],
      summary: { monthlyAverage: 120, nextMonthTotal: 140, activeCount: 3 },
    }
    fetchMock.mockResolvedValue(jsonResponse(report))

    const result = await useReports().getRecurringReport()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/reports/recurring')
    expect(result).toEqual(report)
    expect(result.months).toHaveLength(3)
    expect(result.months.map((m) => m.monthYear)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(result.summary.monthlyAverage).toBe(120)
    expect(result.summary.nextMonthTotal).toBe(140)
    expect(result.summary.activeCount).toBe(3)
  })

  it('getRecurringReport serializa from/to/cardIds como query params', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ months: [], summary: {} }))

    await useReports().getRecurringReport({
      from: '2026-07',
      to: '2026-12',
      cardIds: ['card-1', 'card-2'],
    })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(
      '/api/reports/recurring?from=2026-07&to=2026-12&cardIds=card-1%2Ccard-2',
    )
  })

  it('getRecurringReport omite params vacíos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ months: [], summary: {} }))

    await useReports().getRecurringReport({ cardIds: [], from: '', to: '' })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/reports/recurring')
  })

  it('lanza error cuando la respuesta no es ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, false))

    await expect(useReports().getRecurringReport()).rejects.toThrow(
      'GET /api/reports/recurring -> 500',
    )
  })
})