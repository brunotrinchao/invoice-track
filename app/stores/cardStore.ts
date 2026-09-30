import { defineStore } from 'pinia'
import { apiUrl } from '~/utils/api'
import type { Card } from '~/types/Card'

/**
 * Store de tarjetas. Sustituye el estado manual de React (Fase 2 del design doc).
 * Los endpoints corresponden a server/routes/cards.ts.
 */
export const useCardStore = defineStore('cards', {
  state: () => ({
    cards: [] as Card[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(apiUrl('/api/cards'))
        if (!res.ok) throw new Error(`GET /api/cards -> ${res.status}`)
        const data = (await res.json()) as { success: boolean; cards: Card[] }
        this.cards = data.cards
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
      } finally {
        this.loading = false
      }
    },

    async remove(id: string) {
      const res = await fetch(apiUrl(`/api/cards/${id}`), { method: 'DELETE' })
      if (!res.ok) throw new Error(`DELETE /api/cards/${id} -> ${res.status}`)
      this.cards = this.cards.filter((c) => c.id !== id)
    },
  },
})