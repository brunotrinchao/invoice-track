import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MultiSelect from '../components/filters/MultiSelect.vue'

function mountMulti(overrides: Record<string, unknown> = {}) {
  return mount(MultiSelect, {
    props: {
      modelValue: [],
      options: [
        { value: 'B1', label: 'Banco 1' },
        { value: 'B2', label: 'Banco 2' },
      ],
      ...overrides,
    },
    global: {
      stubs: {
        Icon: true,
      },
    },
  })
}

async function openPanel(wrapper: ReturnType<typeof mountMulti>) {
  await wrapper.find('button').trigger('click')
  await wrapper.vm?.$nextTick()
}

describe('MultiSelect', () => {
  it('marca una opción y emite update:modelValue con el array correcto', async () => {
    const wrapper = mountMulti()
    await openPanel(wrapper)

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)

    await checkboxes[0].setValue(true)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toEqual(['B1'])
  })

  it('desmarca una opción y emite el array sin ella', async () => {
    const wrapper = mountMulti({ modelValue: ['B1', 'B2'] })
    await openPanel(wrapper)

    await wrapper.findAll('input[type="checkbox"]')[0].setValue(false)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![emitted!.length - 1][0]).toEqual(['B2'])
  })

  it('emite un array nuevo (inmutabilidad)', async () => {
    const wrapper = mountMulti({ modelValue: ['B1'] })
    await openPanel(wrapper)

    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)

    const emitted = wrapper.emitted('update:modelValue')
    const result = emitted![emitted!.length - 1][0] as string[]
    expect(result).toEqual(['B1', 'B2'])
    expect(result).not.toBe(wrapper.props().modelValue)
  })

  it('muestra badge con count seleccionados en el botón', () => {
    const wrapper = mountMulti({ modelValue: ['B1'] })

    expect(wrapper.find('button').text()).toContain('1')
  })

  it('muestra placeholder cuando no hay selección', () => {
    const wrapper = mountMulti({ placeholder: 'Todos os bancos' })

    expect(wrapper.find('button').text()).toContain('Todos os bancos')
  })
})