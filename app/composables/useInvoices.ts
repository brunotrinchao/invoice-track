import { apiUrl } from '~/utils/api'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'

export interface InvoiceItemInput {
  id?: string
  description: string
  amount: number
  currentInstallment?: number
  totalInstallments?: number
  itemType?: InvoiceItem['itemType']
}

/**
 * Composables de facturas: encapsulan fetch a /api/invoices (Express).
 * Ver: server/routes/invoices.ts
 */
export function useInvoices() {
  async function list(): Promise<Invoice[]> {
    const res = await fetch(apiUrl('/api/invoices'))
    if (!res.ok) throw new Error(`GET /api/invoices -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; invoices: Invoice[] }
    return Array.isArray(data.invoices) ? data.invoices : []
  }

  async function getInvoice(id: string): Promise<Invoice> {
    const res = await fetch(apiUrl(`/api/invoices/${id}`))
    if (!res.ok) throw new Error(`GET /api/invoices/${id} -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; invoice: Invoice }
    return data.invoice
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/api/invoices/${id}`), { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE /api/invoices/${id} -> ${res.status}`)
  }

  async function togglePaid(id: string, isPaid: boolean): Promise<Invoice> {
    const res = await fetch(apiUrl(`/api/invoices/${id}/toggle-paid`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaid }),
    })
    if (!res.ok) throw new Error(`PATCH /api/invoices/${id}/toggle-paid -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; invoice: Invoice }
    return data.invoice
  }

  async function updateInvoice(id: string, items: InvoiceItemInput[]): Promise<Invoice> {
    const res = await fetch(apiUrl(`/api/invoices/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) throw new Error(`PATCH /api/invoices/${id} -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; invoice: Invoice }
    return data.invoice
  }

  async function bulkDelete(ids: string[]): Promise<void> {
    const res = await fetch(apiUrl('/api/invoices/bulk-delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) throw new Error(`POST /api/invoices/bulk-delete -> ${res.status}`)
  }

  async function bulkPay(ids: string[], isPaid: boolean): Promise<void> {
    const res = await fetch(apiUrl('/api/invoices/bulk-pay'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, isPaid }),
    })
    if (!res.ok) throw new Error(`POST /api/invoices/bulk-pay -> ${res.status}`)
  }

  return { list, getInvoice, remove, togglePaid, updateInvoice, bulkDelete, bulkPay }
}