import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecurring } from '../composables/useRecurring'
import type { RecurringItemInput } from '../types/RecurringItem'

function jsonResponse(body: unknown, ok = true) {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('useRecurring', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createRecurring hace POST /api/recurring con el body correcto', async () => {
    const recurring = { id: 'rec-1', description: 'Netflix', amount: 19.9 }
    fetchMock.mockResolvedValue(jsonResponse(recurring))

    const input: RecurringItemInput = {
      cardId: 'card-1',
      description: 'Netflix',
      amount: 19.9,
      startMonthYear: '2026-09',
      endMonthYear: null,
    }

    const result = await useRecurring().createRecurring(input)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/recurring')
    expect(init?.method).toBe('POST')
    expect(JSON.parse((init?.body as string) ?? '')).toEqual(input)
    expect(result).toEqual(recurring)
  })

  it('createRecurringFromItem hace POST /api/recurring/from-item con el body correcto', async () => {
    const recurring = { id: 'rec-2', description: 'Spotify', amount: 11.99 }
    fetchMock.mockResolvedValue(jsonResponse(recurring))

    const input = {
      itemId: 'item-1',
      cardId: 'card-1',
      description: 'Spotify',
      amount: 11.99,
      startMonthYear: '2026-10',
      endMonthYear: '2027-03',
    }

    const result = await useRecurring().createRecurringFromItem(input)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/recurring/from-item')
    expect(init?.method).toBe('POST')
    expect(JSON.parse((init?.body as string) ?? '')).toEqual(input)
    expect(result).toEqual(recurring)
  })

  it('deleteRecurring hace DELETE /api/recurring/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))

    await useRecurring().deleteRecurring('rec-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/recurring/rec-1')
    expect(init?.method).toBe('DELETE')
  })

  it('lanza error cuando la respuesta no es ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, false))

    await expect(useRecurring().deleteRecurring('rec-1')).rejects.toThrow('DELETE /api/recurring/rec-1 -> 500')
  })
})