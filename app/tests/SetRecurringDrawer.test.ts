import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SetRecurringDrawer from '../components/invoices/recurring/SetRecurringDrawer.vue'
import type { Invoice } from '../types/Invoice'
import type { InvoiceItem } from '../types/InvoiceItem'

const item: InvoiceItem = {
  id: 'item-1',
  invoiceId: 'inv-1',
  description: 'Netflix',
  originalAmount: 19.9,
  currentInstallment: 1,
  totalInstallments: 1,
  itemType: 'PURCHASE',
  extractedBy: 'ai',
  isRecurring: false,
  createdAt: '2026-08-01T00:00:00.000Z',
}

function makeInvoice(monthYear: string, isPaid = false): Invoice {
  return {
    id: `inv-${monthYear}`,
    cardId: 'card-1',
    monthYear,
    totalAmount: 100,
    purchasesAmount: 100,
    fineAmount: 0,
    interestAmount: 0,
    taxesAmount: 0,
    feesAmount: 0,
    creditsAmount: 0,
    isPaid,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    items: [],
    fees: [],
  }
}

// Solo las faturas no pagas llegan al drawer (las filtra el caller).
const invoices = [makeInvoice('2026-09', false), makeInvoice('2026-10', false), makeInvoice('2026-11', false)]

const UButtonStub = defineComponent({
  template: '<button type="button"><slot /></button>',
})
const UDrawerStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false }, open: { type: Boolean, default: false } },
  template: '<div class="udrawer-stub"><slot /><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
})

const TeleportStub = defineComponent({
  template: '<div><slot /></div>',
})

const TransitionStub = defineComponent({
  template: '<div><slot /></div>',
})

function mountDrawer() {
  const wrapper = mount(SetRecurringDrawer, {
    props: { open: true, item, invoices, cardId: 'card-1' },
    global: {
      stubs: {
        Teleport: TeleportStub,
        Transition: TransitionStub,
        UButton: UButtonStub,
        UDrawer: UDrawerStub,
      },
    },
  })
  return wrapper
}

describe('SetRecurringDrawer', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'rec-1', description: 'Netflix', amount: 19.9 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('default start = primera fatura no pagada', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    // primer select (start) con value 2026-09
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect((wrapper.findAll('select')[0].element as HTMLSelectElement).value).toBe('2026-09')
  })

  it('preview muestra "Se aplicará a N faturas" correcto', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    const text = wrapper.text().replace(/\s+/g, ' ').trim()
    expect(text).toContain('Será aplicada a 3 faturas.')
  })

  it('submit emite evento submitted con payload correcto', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    const confirm = wrapper.findAll('button').find((b) => b.text().trim() === 'Confirmar')
    expect(confirm).toBeDefined()

    await confirm!.trigger('click')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/recurring/from-item')
    expect(init?.method).toBe('POST')
    expect(JSON.parse((init?.body as string) ?? '')).toEqual({
      itemId: 'item-1',
      cardId: 'card-1',
      startMonthYear: '2026-09',
      endMonthYear: null,
    })

    expect(wrapper.emitted('submitted')).toBeTruthy()
    expect(wrapper.emitted('submitted')![0][0]).toBe('rec-1')
  })

  it('submit con término (end) incluye endMonthYear en el payload', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    const selects = wrapper.findAll('select')
    await selects[1].setValue('2026-11')
    await wrapper.vm?.$nextTick()

    const confirm = wrapper.findAll('button').find((b) => b.text().trim() === 'Confirmar')!
    await confirm.trigger('click')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init?.body as string) ?? '')).toEqual({
      itemId: 'item-1',
      cardId: 'card-1',
      startMonthYear: '2026-09',
      endMonthYear: '2026-11',
    })
  })
})