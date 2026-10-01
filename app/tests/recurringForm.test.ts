import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import RecurringItemForm from '../components/cards/RecurringItemForm.vue'

/** Stub UiAppInput p/ testes (auto-import Nuxt não roda fora do runtime) */
const AppInputStub = defineComponent({
  props: { modelValue: { type: [String, Number], default: '' } },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () => h('input', {
      value: String(p.modelValue ?? ''),
      onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
    })
  },
})

const mountOptions = {
  global: { stubs: { UiAppInput: AppInputStub } },
}

describe('RecurringItemForm', () => {
  const fill = (wrapper: ReturnType<typeof mount>) => {
    const inputs = wrapper.findAll('input')
    // [0]=descrição [1]=valor [2]=mês início [3]=mês término
    inputs[0].setValue('Netflix')
    inputs[1].setValue('44.90')
    inputs[2].setValue('2026-10')
  }

  it('desabilita submit vazio e emite submit preenchido', async () => {
    const w = mount(RecurringItemForm, mountOptions)
    const btn = w.findAll('button').find(b => b.text().includes('Criar'))!
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    fill(w)
    await w.vm.$nextTick()
    expect(btn.element.disabled).toBe(false)
    await btn.trigger('click')
    expect(w.emitted('submit')).toBeTruthy()
    expect(w.emitted('submit')![0][0]).toMatchObject({ description: 'Netflix' })
  })

  it('modo edição pré-preenche e usa label Salvar', () => {
    const w = mount(RecurringItemForm, {
      props: { initial: { id: 'r1', description: 'Spotify', amount: 21.9, startMonthYear: '2026-08', endMonthYear: null, active: true, cardId: 'c1', createdAt: '', updatedAt: '' } },
      ...mountOptions,
    })
    const inputs = w.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('Spotify')
    expect((inputs[2].element as HTMLInputElement).value).toBe('2026-08')
    expect(w.text()).toContain('Salvar')
  })

  it('cancel emite cancel', async () => {
    const w = mount(RecurringItemForm, mountOptions)
    await w.findAll('button').find(b => b.text().includes('Cancelar'))!.trigger('click')
    expect(w.emitted('cancel')).toBeTruthy()
  })
})
