import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SetRecurringModal from '../components/invoices/recurring/SetRecurringModal.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import AppButton from '../components/ui/AppButton.vue'
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

// Solo las faturas no pagas llegan al modal (las filtra el caller).
const invoices = [makeInvoice('2026-09', false), makeInvoice('2026-10', false), makeInvoice('2026-11', false)]

// Stub de AppModal: renderiza el slot sin Teleport para poder inspeccionar el DOM.
const AppModalStub = defineComponent({
  props: { open: Boolean, title: String },
  template: '<div class="modal-stub" role="dialog"><slot /></div>',
})

function mountModal() {
  const wrapper = mount(SetRecurringModal, {
    props: { open: true, item, invoices, cardId: 'card-1' },
    global: {
      stubs: {
        AppModal: AppModalStub,
      },
      components: { AppSelect, AppButton },
    },
  })
  return wrapper
}

describe('SetRecurringModal', () => {
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
    const wrapper = mountModal()
    await wrapper.vm?.$nextTick()

    // primer select (start) con value 2026-09
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect(wrapper.findAll('select')[0].attributes('value')).toBe('2026-09')
  })

  it('preview muestra "Se aplicará a N faturas" correcto', async () => {
    const wrapper = mountModal()
    await wrapper.vm?.$nextTick()

    const text = wrapper.text().replace(/\s+/g, ' ').trim()
    expect(text).toContain('Se aplicará a 3 faturas.')
  })

  it('submit emite evento submitted con payload correcto', async () => {
    const wrapper = mountModal()
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
    const wrapper = mountModal()
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