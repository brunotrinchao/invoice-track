import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Stub controlado do @vuepic: happy-dom + date-fns quebram no ambiente de teste.
vi.mock('@vuepic/vue-datepicker', () => ({
  VueDatePicker: Object.assign(
    {
      name: 'VueDatePicker',
      props: {
        modelValue: { type: null, default: null },
        placeholder: { type: String, default: '' },
        monthPicker: { type: Boolean, default: false },
      },
      emits: ['update:model-value'],
      template: '<input data-testid="dp-input" :placeholder="placeholder" readonly />',
    },
  ),
}))

import DateRangePicker from '../components/filters/DateRangePicker.vue'

describe('DateRangePicker (month picker @vuepic stubbed)', () => {
  it('monta com input e placeholder do picker', () => {
    const wrapper = mount(DateRangePicker, { props: {} })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Todos os meses')
    wrapper.unmount()
  })

  it('emite update com from=to=YYYY-MM ao escolher um mês', async () => {
    const wrapper = mount(DateRangePicker, { props: {} })
    const dp = wrapper.findComponent({ name: 'VueDatePicker' })
    expect(dp.exists()).toBe(true)
    await dp.vm.$emit('update:model-value', { month: 8, year: 2026 })
    expect(wrapper.emitted('update')![0][0]).toEqual({ from: '2026-09', to: '2026-09' })
    wrapper.unmount()
  })

  it('emite update vazio quando o picker é limpo (clearable)', async () => {
    const wrapper = mount(DateRangePicker, { props: {} })
    const dp = wrapper.findComponent({ name: 'VueDatePicker' })
    await dp.vm.$emit('update:model-value', { month: 0, year: 2026 })
    await dp.vm.$emit('update:model-value', null)
    expect(wrapper.emitted('update')![1][0]).toEqual({ from: '', to: '' })
    wrapper.unmount()
  })

  it('sincroniza picker quando props from=to (mês específico)', async () => {
    const wrapper = mount(DateRangePicker, { props: { from: '2026-03', to: '2026-03' } })
    await flushPromises()
    const dp = wrapper.findComponent({ name: 'VueDatePicker' })
    expect(dp.props('modelValue')).toMatchObject({ month: 2, year: 2026 })
    wrapper.unmount()
  })

  it('props de período não específico deixam picker vazio', async () => {
    const wrapper = mount(DateRangePicker, { props: { from: '2026-01', to: '2026-06' } })
    await flushPromises()
    const dp = wrapper.findComponent({ name: 'VueDatePicker' })
    expect(dp.props('modelValue')).toBeNull()
    wrapper.unmount()
  })
})