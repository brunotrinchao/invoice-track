import type { Invoice } from '~/types/Invoice'
import type { BankInvoice } from '~/types/BankInvoice'

function round2(val: number): number {
  return Math.round(val * 100) / 100
}

export function groupInvoicesByBank(invoices: Invoice[] = []): BankInvoice[] {
  if (!Array.isArray(invoices)) return []
  const groupsMap = new Map<string, Invoice[]>()

  for (const inv of invoices) {
    if (!inv || !inv.monthYear) continue
    const bankName = inv.card?.bankName?.trim() || 'Banco'
    const key = `${bankName}___${inv.monthYear}`
    if (!groupsMap.has(key)) {
      groupsMap.set(key, [])
    }
    groupsMap.get(key)!.push(inv)
  }

  const result: BankInvoice[] = []

  for (const [key, groupInvoices] of groupsMap.entries()) {
    const [bankName, monthYear] = key.split('___')

    let totalAmount = 0
    let purchasesAmount = 0
    let feesAmount = 0
    let creditsAmount = 0

    const cardDigitsSet = new Set<string>()

    for (const inv of groupInvoices) {
      totalAmount += Number(inv.totalAmount || 0)
      purchasesAmount += Number(inv.purchasesAmount || 0)
      feesAmount += Number(inv.feesAmount || 0)
      creditsAmount += Number(inv.creditsAmount || 0)

      if (inv.card?.last4Digits) {
        cardDigitsSet.add(inv.card.last4Digits)
      }
    }

    const cardDigitsList = Array.from(cardDigitsSet)
    const isPaid = groupInvoices.every((inv) => Boolean(inv.isPaid))
    const firstDueDate = groupInvoices.find((inv) => Boolean(inv.dueDate))?.dueDate || null

    result.push({
      id: key,
      bankName,
      monthYear,
      dueDate: firstDueDate,
      isPaid,
      totalAmount: round2(totalAmount),
      purchasesAmount: round2(purchasesAmount),
      feesAmount: round2(feesAmount),
      creditsAmount: round2(creditsAmount),
      cardsCount: groupInvoices.length,
      cardDigitsList,
      invoices: groupInvoices,
    })
  }

  return result.sort((a, b) => {
    const monthCompare = b.monthYear.localeCompare(a.monthYear)
    if (monthCompare !== 0) return monthCompare
    return a.bankName.localeCompare(b.bankName)
  })
}

export type InvoiceStatusType = 'paid' | 'pending' | 'overdue'

export interface InvoiceStatusInfo {
  status: InvoiceStatusType
  label: string
  tone: 'emerald' | 'amber' | 'rose'
  badgeClass: string
}

export function getInvoiceStatusInfo(invoice: { isPaid: boolean; dueDate?: string | Date | null; monthYear?: string }): InvoiceStatusInfo {
  if (invoice.isPaid) {
    return {
      status: 'paid',
      label: 'Pago',
      tone: 'emerald',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let dueDateObj: Date | null = null

  if (invoice.dueDate) {
    dueDateObj = new Date(invoice.dueDate)
  } else if (invoice.monthYear) {
    const [y, m] = invoice.monthYear.split('-').map(Number)
    if (y && m) {
      dueDateObj = new Date(y, m - 1, 10, 23, 59, 59)
    }
  }

  if (dueDateObj && !isNaN(dueDateObj.getTime())) {
    const dueDayEnd = new Date(dueDateObj)
    dueDayEnd.setHours(23, 59, 59, 999)

    if (dueDayEnd < today) {
      return {
        status: 'overdue',
        label: 'Vencido',
        tone: 'rose',
        badgeClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30',
      }
    }
  }

  return {
    status: 'pending',
    label: 'Pendente',
    tone: 'amber',
    badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30',
  }
}

export function formatDateShort(dateStr?: string | Date | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}
