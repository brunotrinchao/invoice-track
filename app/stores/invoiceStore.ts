import { defineStore } from 'pinia'
import type { Invoice } from '~/types/Invoice'

/**
 * Store de facturas. Sustituye el estado manual de React (Fase 2 del design doc).
 * Los endpoints corresponden a server/routes/invoices.ts.
 */
export const useInvoiceStore = defineStore('invoices', {
  state: () => ({
    invoices: [] as Invoice[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch('/api/invoices')
        if (!res.ok) throw new Error(`GET /api/invoices -> ${res.status}`)
        this.invoices = (await res.json()) as Invoice[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id: string) {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(`/api/invoices/${id}`)
        if (!res.ok) throw new Error(`GET /api/invoices/${id} -> ${res.status}`)
        const invoice = (await res.json()) as Invoice
        const idx = this.invoices.findIndex((i) => i.id === id)
        if (idx >= 0) this.invoices[idx] = invoice
        else this.invoices.push(invoice)
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
      } finally {
        this.loading = false
      }
    },

    async remove(id: string) {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`DELETE /api/invoices/${id} -> ${res.status}`)
      this.invoices = this.invoices.filter((i) => i.id !== id)
    },

    async togglePaid(id: string, isPaid: boolean) {
      const res = await fetch(`/api/invoices/${id}/toggle-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      })
      if (!res.ok) throw new Error(`PATCH /api/invoices/${id}/toggle-paid -> ${res.status}`)
      const invoice = (await res.json()) as Invoice
      const idx = this.invoices.findIndex((i) => i.id === id)
      if (idx >= 0) this.invoices[idx] = invoice
    },

    async bulkDelete(ids: string[]) {
      const res = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error(`POST /api/invoices/bulk-delete -> ${res.status}`)
      this.invoices = this.invoices.filter((i) => !ids.includes(i.id))
    },
  },
})