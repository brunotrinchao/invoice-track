import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '../components/filters/FilterBar.vue'
import MultiSelect from '../components/filters/MultiSelect.vue'
import DateRangePicker from '../components/filters/DateRangePicker.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import AppInput from '../components/ui/AppInput.vue'

function mountBar(overrides: Record<string, unknown> = {}) {
  return mount(FilterBar, {
    props: {
      banks: ['B1', 'B2'],
      bankModel: [],
      statusModel: '',
      showSort: true,
      from: '',
      to: '',
      ...overrides,
    },
    global: {
      components: {
        UiAppSelect: AppSelect,
        UiAppInput: AppInput,
        FiltersMultiSelect: MultiSelect,
        FiltersDateRangePicker: DateRangePicker,
      },
      stubs: {
        Icon: true,
      },
    },
  })
}

function lastUpdate(wrapper: ReturnType<typeof mountBar>) {
  const emitted = wrapper.emitted('update')
  return emitted![emitted!.length - 1][0] as { banks: string[]; status: string; sort: string; from: string; to: string }
}

describe('FilterBar', () => {
  it('emite el estado inicial al montar', () => {
    const wrapper = mountBar()

    expect(lastUpdate(wrapper)).toEqual({ banks: [], status: '', sort: 'date_desc', from: '', to: '' })
  })

  it('emite update al cambiar el status', async () => {
    const wrapper = mountBar()

    const statusSelect = wrapper.findAll('select').find((s) =>
      Array.from(s.element.options).some((o) => o.value === 'paid'),
    )
    expect(statusSelect).toBeDefined()

    await statusSelect!.setValue('paid')
    await wrapper.vm?.$nextTick()

    expect(lastUpdate(wrapper).status).toBe('paid')
  })

  it('emite update al cambiar el orden', async () => {
    const wrapper = mountBar()

    const sortSelect = wrapper.findAll('select').find((s) =>
      Array.from(s.element.options).some((o) => o.value === 'amount_desc'),
    )
    expect(sortSelect).toBeDefined()

    await sortSelect!.setValue('amount_desc')
    await wrapper.vm?.$nextTick()

    expect(lastUpdate(wrapper).sort).toBe('amount_desc')
  })

  it('emite update al marcar un banco en el MultiSelect', async () => {
    const wrapper = mountBar()

    const bankTrigger = wrapper.findAll('button').find((b) => b.text().includes('Todos os bancos'))
    expect(bankTrigger).toBeDefined()
    await bankTrigger!.trigger('click')
    await wrapper.vm?.$nextTick()

    const bankCheckbox = wrapper.findAll('input[type="checkbox"]')[0]
    await bankCheckbox.setValue(true)
    await wrapper.vm?.$nextTick()

    expect(lastUpdate(wrapper).banks).toEqual(['B1'])
  })

  it('botón Limpar resetea y emite update con valores vacíos', async () => {
    const wrapper = mountBar({ bankModel: ['B1'], statusModel: 'paid', sortModel: 'amount_desc', from: '2026-01', to: '2026-06' })

    const clear = wrapper.findAll('button').find((b) => b.text().trim() === 'Limpar')
    expect(clear).toBeDefined()

    await clear!.trigger('click')
    await wrapper.vm?.$nextTick()

    expect(lastUpdate(wrapper)).toEqual({ banks: [], status: '', sort: 'date_desc', from: '', to: '' })
  })
})