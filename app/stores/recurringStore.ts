import { defineStore } from 'pinia'
import type { RecurringItem, RecurringItemInput } from '~/types/RecurringItem'

/**
 * Store de compras recurrentes. Placeholder: la feature vive en el backend
 * (design doc sección 3); los endpoints /api/recurring se exponen cuando se
 * implemente la Fase 5 (feature recorrentes sobre la base Vue).
 */
export const useRecurringStore = defineStore('recurring', {
  state: () => ({
    items: [] as RecurringItem[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch('/api/recurring')
        if (!res.ok) throw new Error(`GET /api/recurring -> ${res.status}`)
        this.items = (await res.json()) as RecurringItem[]
      } catch (err) {
        // Endpoint aún no implementado en Express: no romper el dashboard.
        this.error = err instanceof Error ? err.message : String(err)
        this.items = []
      } finally {
        this.loading = false
      }
    },

    async create(input: RecurringItemInput) {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(`POST /api/recurring -> ${res.status}`)
      this.items.push((await res.json()) as RecurringItem)
    },

    async remove(id: string) {
      const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`DELETE /api/recurring/${id} -> ${res.status}`)
      this.items = this.items.filter((r) => r.id !== id)
    },

    async setActive(id: string, active: boolean) {
      const res = await fetch(`/api/recurring/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error(`PATCH /api/recurring/${id} -> ${res.status}`)
      const updated = (await res.json()) as RecurringItem
      const idx = this.items.findIndex((r) => r.id === id)
      if (idx >= 0) this.items[idx] = updated
    },
  },
})