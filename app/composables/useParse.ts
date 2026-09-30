import { apiUrl } from '~/utils/api'
import type { ParseResponse } from '~/types/ParseResponse'

/**
 * Composable de importação de fatura PDF: encapsula fetch a
 * /api/parse-invoice y /api/confirm-invoice (Express).
 * Ver: server/routes/parse.ts, server/routes/confirm.ts
 */

export interface ConfirmInvoicePayload {
  monthReferenced: string
  dueDate?: string
  cards: Array<{
    bankName: string
    brand: string
    last4Digits: string
    totalAmount: number
    items: Array<{
      description: string
      amount: number
      currentInstallment: number
      totalInstallments: number
      itemType: string
    }>
  }>
  overwriteExisting?: boolean
  overwriteMode?: 'all' | 'differences' | 'none'
  pdfPassword?: string
  declaredInvoiceTotal?: number
  isPaid?: boolean
}

export function useParse() {
  async function parseInvoice(file: File, password?: string): Promise<ParseResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (password) {
      formData.append('password', password)
    }

    const res = await fetch(apiUrl('/api/parse-invoice'), {
      method: 'POST',
      body: formData,
    })

    const json = await res.json()

    // Caso o backend solicite a senha do PDF
    if (json.requiresPassword) {
      return { requiresPassword: true } as ParseResponse
    }

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Falha ao processar a fatura PDF.')
    }

    return json as ParseResponse
  }

  async function confirmInvoice(payload: ConfirmInvoicePayload): Promise<void> {
    const res = await fetch(apiUrl('/api/confirm-invoice'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Falha ao salvar a fatura.')
    }
  }

  return { parseInvoice, confirmInvoice }
}