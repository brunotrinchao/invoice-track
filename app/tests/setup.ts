// Globals para compilar SFCs Nuxt en vitest: Nuxt auto-importa ref/computed/watch
// en los .vue, pero fuera de Nuxt hay que exponerlos globalmente.
import { computed, defineComponent, onMounted, ref, unref, watch } from 'vue'
import { vi } from 'vitest'
import { formatMoney } from '../utils/money'

const g = globalThis as Record<string, unknown>

g.ref = ref
g.unref = unref
g.computed = computed
g.watch = watch
g.onMounted = onMounted
g.defineComponent = defineComponent
// Nuxt auto-importa utils/ nos SFCs; fora do Nuxt (vitest) expomos globalmente.
g.formatMoney = formatMoney

// --- Mock de @kebalicious/vue3-daterange-picker ---
// (mantido por compatibilidade com testes existentes)
vi.mock('@kebalicious/vue3-daterange-picker', () => {
  const DateRangePicker = defineComponent({
    name: 'DateRangePicker',
    props: {
      modelValue: { type: Object, default: null },
    },
    emits: ['update', 'select', 'apply'],
    setup(props, { emit }) {
      function onInput(e: Event) {
        const value = (e.target as HTMLInputElement).value
        emit('update', { startDate: new Date(value), endDate: new Date(value) })
      }
      return { onInput }
    },
    template: '<input data-testid="drp" :value="modelValue?.startDate?.toISOString?.() ?? \'\'" @input="onInput" />',
  })
  return { DateRangePicker }
})

// --- Mock de motion-v (Framer Motion p/ Vue) ---
// happy-dom + springs rAF quebram nos testes; stubs determinísticos.
vi.mock('motion-v', async () => {
  const { defineComponent: dc, h, ref: r } = await import('vue')
  const MotionStub = (tag: string) =>
    dc({
      name: `Motion${tag}`,
      inheritAttrs: false,
      setup(_, { slots, attrs }) {
        return () => h(tag, attrs, slots.default?.())
      },
    })
  return {
    motion: new Proxy({}, { get: (_, tag: string) => MotionStub(tag) }),
    AnimatePresence: dc({
      name: 'AnimatePresence',
      setup(_, { slots }) {
        return () => slots.default?.()
      },
    }),
    useReducedMotion: () => r(false),
  }
})

// --- Stubs de componentes Nuxt & @nuxt/ui ---
function stubComponent(name: string) {
  return defineComponent({
    name,
    props: {
      modelValue: { type: [Array, Object, String, Number, Boolean], default: undefined },
    },
    template: '<div class="ui-stub"><slot /><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  })
}

const uiComponents = [
  'UButton',
  'UInput',
  'USelect',
  'UBadge',
  'UModal',
  'UDrawer',
  'USlideover',
  'UCard',
  'UForm',
  'UField',
  'UiAppCard',
  'UiAppButton',
  'UiAppBadge',
  'UiAppInput',
  'UiAppSelect',
  'ChartsAreaChart',
  'ChartsBarChart',
  'ChartsPieChart',
  'ChartsBaseChart',
  'FiltersDateRangePicker',
  'FiltersMultiSelect',
  'Icon',
]

import { config } from '@vue/test-utils'

for (const name of uiComponents) {
  const comp = stubComponent(name)
  g[name] = comp
  config.global.components[name] = comp
}

// Utils auto-importados pelo Nuxt (disponíveis em templates via globalProperties).
config.global.globalProperties = {
  ...(config.global.globalProperties as Record<string, unknown> | undefined),
  formatMoney,
}