import type { Invoice } from './Invoice'

export interface BankInvoice {
  id: string
  bankName: string
  monthYear: string
  dueDate?: string | null
  isPaid: boolean
  totalAmount: number
  purchasesAmount: number
  feesAmount: number
  creditsAmount: number
  cardsCount: number
  cardDigitsList: string[]
  invoices: Invoice[]
}
