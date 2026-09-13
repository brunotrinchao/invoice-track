import type { RecurringItem, RecurringItemInput } from '~/types/RecurringItem'

/**
 * Composables de compras recurrentes: encapsulan fetch a /api/recurring
 * (Express). Endpoints implementados en server/routes/recurring.ts.
 */
export function useRecurring() {
  async function list(): Promise<RecurringItem[]> {
    const res = await fetch('/api/recurring')
    if (!res.ok) throw new Error(`GET /api/recurring -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; recurrings: RecurringItem[] }
    return data.recurrings
  }

  async function createRecurring(input: RecurringItemInput): Promise<RecurringItem> {
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`POST /api/recurring -> ${res.status}`)
    return res.json() as Promise<RecurringItem>
  }

  async function createRecurringFromItem(input: {
    itemId: string
    cardId: string
    description?: string
    amount?: number
    startMonthYear: string
    endMonthYear?: string | null
  }): Promise<RecurringItem> {
    const res = await fetch('/api/recurring/from-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`POST /api/recurring/from-item -> ${res.status}`)
    return res.json() as Promise<RecurringItem>
  }

  async function deleteRecurring(id: string): Promise<void> {
    const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE /api/recurring/${id} -> ${res.status}`)
  }

  async function setActive(id: string, active: boolean): Promise<RecurringItem> {
    const res = await fetch(`/api/recurring/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    if (!res.ok) throw new Error(`PATCH /api/recurring/${id} -> ${res.status}`)
    return res.json() as Promise<RecurringItem>
  }

  return { list, createRecurring, createRecurringFromItem, deleteRecurring, setActive }
}