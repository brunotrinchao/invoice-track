import { describe, it, expect } from 'vitest'
import { groupInvoicesByBank } from '../utils/bankInvoice'
import type { Invoice } from '../types/Invoice'

describe('groupInvoicesByBank', () => {
  it('agrupa faturas pelo mesmo banco e mês/ano corretamente', () => {
    const mockInvoices: Invoice[] = [
      {
        id: 'inv-1',
        cardId: 'card-1',
        monthYear: '2026-09',
        totalAmount: 100,
        purchasesAmount: 100,
        feesAmount: 0,
        creditsAmount: 0,
        isPaid: true,
        createdAt: '2026-09-01',
        updatedAt: '2026-09-01',
        card: {
          id: 'card-1',
          bankName: 'Banco Inter',
          brand: 'Mastercard',
          last4Digits: '1234',
        },
      },
      {
        id: 'inv-2',
        cardId: 'card-2',
        monthYear: '2026-09',
        totalAmount: 250,
        purchasesAmount: 250,
        feesAmount: 0,
        creditsAmount: 0,
        isPaid: false,
        createdAt: '2026-09-01',
        updatedAt: '2026-09-01',
        card: {
          id: 'card-2',
          bankName: 'Banco Inter',
          brand: 'Visa',
          last4Digits: '5678',
        },
      },
      {
        id: 'inv-3',
        cardId: 'card-3',
        monthYear: '2026-09',
        totalAmount: 400,
        purchasesAmount: 400,
        feesAmount: 0,
        creditsAmount: 0,
        isPaid: true,
        createdAt: '2026-09-01',
        updatedAt: '2026-09-01',
        card: {
          id: 'card-3',
          bankName: 'Banco Bradesco',
          brand: 'Visa',
          last4Digits: '9999',
        },
      },
    ]

    const grouped = groupInvoicesByBank(mockInvoices)

    expect(grouped.length).toBe(2)

    const interGroup = grouped.find((g) => g.bankName === 'Banco Inter')
    expect(interGroup).toBeDefined()
    expect(interGroup?.monthYear).toBe('2026-09')
    expect(interGroup?.cardsCount).toBe(2)
    expect(interGroup?.cardDigitsList).toEqual(['1234', '5678'])
    expect(interGroup?.totalAmount).toBe(350)
    expect(interGroup?.isPaid).toBe(false) // 1 paid, 1 unpaid -> overall unpaid

    const bradescoGroup = grouped.find((g) => g.bankName === 'Banco Bradesco')
    expect(bradescoGroup).toBeDefined()
    expect(bradescoGroup?.cardsCount).toBe(1)
    expect(bradescoGroup?.totalAmount).toBe(400)
    expect(bradescoGroup?.isPaid).toBe(true)
  })
})
