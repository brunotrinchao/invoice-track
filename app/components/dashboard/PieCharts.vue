<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-2xl glass-card p-4">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-dark-muted">
        Distribuição por banco
      </h3>
      <ChartsPieChart
        :data="bankData"
        :format-value="formatMoney"
        :height="260"
      />
      <p
        v-if="bankData.length === 0"
        class="py-6 text-center text-xs text-dark-muted"
      >Sem dados no período.</p>
    </div>
    <div class="rounded-2xl glass-card p-4">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-dark-muted">
        Distribuição por cartão
      </h3>
      <ChartsPieChart
        :data="cardData"
        :format-value="formatMoney"
        :height="260"
      />
      <p
        v-if="cardData.length === 0"
        class="py-6 text-center text-xs text-dark-muted"
      >Sem dados no período.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { MonthlySummaryItem } from '~/composables/useReports'
import { getBankColor } from '~/utils/bankColors'

const props = defineProps<{
  data: MonthlySummaryItem[]
}>()

const bankData = computed(() => {
  const totals: Record<string, number> = {}
  for (const m of props.data) {
    for (const [bank, value] of Object.entries(m.byBank ?? {})) {
      totals[bank] = (totals[bank] || 0) + value
    }
  }
  return Object.entries(totals)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      itemStyle: { color: getBankColor(name) },
    }))
    .sort((a, b) => b.value - a.value)
})

const cardData = computed(() => {
  const totals: Record<string, number> = {}
  for (const m of props.data) {
    for (const [card, value] of Object.entries(m.byCard)) {
      totals[card] = (totals[card] || 0) + value
    }
  }
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
})
</script>