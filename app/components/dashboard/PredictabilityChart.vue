<template>
  <div class="w-full">
    <div class="flex items-center justify-between gap-3">
      <div class="flex rounded-xl bg-dark-card p-1">
        <button
          v-for="mode in VIEW_MODES"
          :key="mode.key"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
          :class="viewMode === mode.key ? 'bg-brand-500/20 text-brand-600' : 'text-slate-400 hover:text-slate-200'"
          @click="viewMode = mode.key"
        >
          {{ mode.label }}
        </button>
      </div>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 cursor-pointer"
        :aria-label="'Recarregar'"
        @click="emit('refresh')"
      >
        <Icon
          name="lucide:refresh-cw"
          class="h-4 w-4"
        />
      </button>
    </div>

    <ChartsBaseChart
      class="mt-3"
      :type="chartType"
      :categories="categories"
      :series="series"
      :format-value="formatMoney"
      :height="320"
    />
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { MonthlySummaryItem } from '~/composables/useReports'
import { getBankColor } from '~/utils/bankColors'

/**
 * Predictability curve chart with total / byCard / byBank view modes.
 * Renders as bar/column chart for single month (e.g. 'Este mês') and line chart for multi-month periods.
 * Uses official bank reference colors for bank views.
 */

const VIEW_MODES = [
  { key: 'total', label: 'Total' },
  { key: 'byCard', label: 'Por cartão' },
  { key: 'byBank', label: 'Por banco' },
] as const

const props = defineProps<{
  data: MonthlySummaryItem[]
}>()

const emit = defineEmits<{ refresh: [] }>()

const viewMode = ref<'total' | 'byCard' | 'byBank'>('byCard')

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const chartType = computed<'bar' | 'line'>(() => (props.data.length <= 1 ? 'bar' : 'line'))

const categories = computed(() =>
  props.data.map((item) => {
    const [year, month] = item.monthYear.split('-')
    const mIdx = Math.max(0, parseInt(month, 10) - 1)
    const label = `${MONTH_NAMES[mIdx] || month}/${year.slice(-2)}`
    return label
  }),
)

const series = computed(() => {
  if (viewMode.value === 'total') {
    return [
      {
        name: 'Total',
        data: props.data.map((item) => item.total),
      },
    ]
  }

  const keys = new Set<string>()
  for (const item of props.data) {
    const map = viewMode.value === 'byCard' ? item.byCard : item.byBank ?? {}
    for (const key of Object.keys(map)) keys.add(key)
  }

  return Array.from(keys).map((key) => {
    const isBank = viewMode.value === 'byBank'
    const color = isBank ? getBankColor(key) : undefined

    return {
      name: key,
      color,
      data: props.data.map((item) => {
        const map = viewMode.value === 'byCard' ? item.byCard : item.byBank ?? {}
        const val = Math.round((map[key] ?? 0) * 100) / 100
        if (chartType.value === 'bar' && isBank) {
          return {
            value: val,
            itemStyle: { color: getBankColor(key) },
          }
        }
        return val
      }),
    }
  })
})
</script>