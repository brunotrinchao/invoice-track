import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import EditInvoiceDrawer from '../components/invoices/EditInvoiceDrawer.vue'
import type { Invoice } from '../types/Invoice'
import type { InvoiceItem } from '../types/InvoiceItem'

function makeItem(id: string, description: string, amount: number): InvoiceItem {
  return {
    id,
    invoiceId: 'inv-1',
    description,
    originalAmount: amount,
    currentInstallment: 1,
    totalInstallments: 1,
    itemType: 'PURCHASE',
    extractedBy: 'ai',
    isRecurring: false,
    createdAt: '2026-08-01T00:00:00.000Z',
  }
}

const invoice: Invoice = {
  id: 'inv-1',
  cardId: 'card-1',
  monthYear: '2026-09',
  totalAmount: 119.9,
  purchasesAmount: 119.9,
  fineAmount: 0,
  interestAmount: 0,
  taxesAmount: 0,
  feesAmount: 0,
  creditsAmount: 0,
  isPaid: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  items: [makeItem('item-1', 'Netflix', 19.9), makeItem('item-2', 'Spotify', 100)],
  fees: [],
}

const TeleportStub = defineComponent({
  template: '<div><slot /></div>',
})

const TransitionStub = defineComponent({
  template: '<div><slot /></div>',
})

const UInputStub = defineComponent({
  props: { modelValue: { type: [String, Number], default: '' } },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const UButtonStub = defineComponent({
  template: '<button type="button"><slot /></button>',
})
const UDrawerStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false }, open: { type: Boolean, default: false } },
  template: '<div class="udrawer-stub"><slot /><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
})

function mountDrawer() {
  const wrapper = mount(EditInvoiceDrawer, {
    props: { open: true, invoice },
    global: {
      stubs: {
        Teleport: TeleportStub,
        Transition: TransitionStub,
        UInput: UInputStub,
        UButton: UButtonStub,
        UDrawer: UDrawerStub,
        Icon: true,
      },
    },
  })
  return wrapper
}

describe('EditInvoiceDrawer', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, invoice }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('carga los items de la fatura como filas editables', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    const inputs = wrapper.findAll('input')
    const values = inputs.map((i) => i.attributes('value'))
    expect(values).toContain('Netflix')
    expect(values).toContain('Spotify')
    expect(inputs).toHaveLength(8)
  })

  it('quitar item elimina una fila', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    const remove = wrapper.findAll('button').find((b) => b.attributes('aria-label')?.includes('Quitar'))!
    await remove.trigger('click')
    await wrapper.vm?.$nextTick()

    expect(wrapper.findAll('input')).toHaveLength(4)
  })

  it('guardar hace PATCH /api/invoices/:id con los items y emite saved', async () => {
    const wrapper = mountDrawer()
    await wrapper.vm?.$nextTick()

    const save = wrapper.findAll('button').find((b) => b.text().trim() === 'Salvar')!
    await save.trigger('click')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/invoices/inv-1')
    expect(init?.method).toBe('PATCH')
    const body = JSON.parse((init?.body as string) ?? '')
    expect(body.items).toHaveLength(2)
    expect(body.items[0].description).toBe('Netflix')
    expect(body.items[0].amount).toBe(19.9)

    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('saved')![0][0].id).toBe('inv-1')
  })
})