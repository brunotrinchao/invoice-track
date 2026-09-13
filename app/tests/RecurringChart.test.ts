import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecurringChart from '../components/dashboard/RecurringChart.vue'
import type { RecurringReportData } from '../composables/useReports'

const report: RecurringReportData = {
  months: [
    { monthYear: '2026-07', total: 100, isProjected: false, items: [] },
    { monthYear: '2026-08', total: 120, isProjected: false, items: [] },
    { monthYear: '2026-09', total: 140, isProjected: true, items: [] },
    { monthYear: '2026-10', total: 160, isProjected: true, items: [] },
  ],
  summary: { monthlyAverage: 130, nextMonthTotal: 160, activeCount: 4 },
}

interface ChartSeries {
  name: string
  data: number[]
  dashed?: boolean
}

interface RecurringChartVm {
  report: RecurringReportData | null
  error: string
  loading: boolean
  summary: { monthlyAverage: number; nextMonthTotal: number; activeCount: number }
  series: ChartSeries[]
}

function vmOf(wrapper: Awaited<ReturnType<typeof mount>>): RecurringChartVm {
  return wrapper.vm as unknown as RecurringChartVm
}

describe('RecurringChart', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(report), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch /api/reports/recurring y renderiza stats', async () => {
    const wrapper = await mount(RecurringChart, {
      props: { cardIds: [], from: '', to: '' },
    })
    const vm = vmOf(wrapper)

    await vi.waitFor(() => {
      expect(vm.report).toEqual(report)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/reports/recurring')
    expect(vm.summary.monthlyAverage).toBe(130)
  })

  it('proyectado vs materializado distinguidos en las series del chart', async () => {
    const wrapper = await mount(RecurringChart, {
      props: { cardIds: [], from: '', to: '' },
    })
    const vm = vmOf(wrapper)

    await vi.waitFor(() => {
      expect(vm.report).not.toBeNull()
    })

    const series = vm.series
    expect(series).toHaveLength(2)

    const [realizado, proyectado] = series
    expect(realizado.name).toBe('Realizado')
    expect(realizado.dashed).toBeUndefined()
    expect(realizado.data).toEqual([100, 120])

    expect(proyectado.name).toBe('Proyectado')
    expect(proyectado.dashed).toBe(true)
    expect(proyectado.data).toEqual([140, 160])
  })

  it('pasa cardIds/from/to como query params', async () => {
    const wrapper = await mount(RecurringChart, {
      props: { cardIds: ['card-1', 'card-2'], from: '2026-07', to: '2026-12' },
    })
    const vm = vmOf(wrapper)

    await vi.waitFor(() => {
      expect(vm.report).not.toBeNull()
    })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(
      '/api/reports/recurring?from=2026-07&to=2026-12&cardIds=card-1%2Ccard-2',
    )
  })
})