<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <UiAppCard title="Faturado no período">
      <p class="text-2xl font-bold text-highlighted">{{ formatMoney(totalFaturado) }}</p>
      <p class="text-xs text-dark-muted">{{ totalInvoices }} faturas</p>
    </UiAppCard>
    <UiAppCard title="Compras">
      <p class="text-2xl font-bold text-highlighted">{{ formatMoney(totalPurchases) }}</p>
      <p class="text-xs text-dark-muted">sólo compras</p>
    </UiAppCard>
    <UiAppCard title="Taxas y encargos">
      <p class="text-2xl font-bold text-highlighted">{{ formatMoney(totalFees) }}</p>
      <p class="text-xs text-dark-muted">taxas + multas + juros + IOF</p>
    </UiAppCard>
    <UiAppCard title="Média por fatura">
      <p class="text-2xl font-bold text-highlighted">{{ formatMoney(averageInvoice) }}</p>
      <p class="text-xs text-dark-muted">sobre faturas del período</p>
    </UiAppCard>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { MonthlySummaryItem } from '~/composables/useReports'

/**
 * Executive KPI stats derived from the predictability report.
 * Port of src/components/ReportStats.tsx (React).
 */

const props = defineProps<{
  data: MonthlySummaryItem[]
}>()

const totalFaturado = computed(() => Math.round(props.data.reduce((sum, m) => sum + m.total, 0) * 100) / 100)
const totalPurchases = computed(() => Math.round(props.data.reduce((sum, m) => sum + (m.purchasesTotal || 0), 0) * 100) / 100)
const totalFees = computed(() => Math.round(props.data.reduce((sum, m) => sum + (m.feesTotal || 0), 0) * 100) / 100)
const totalInvoices = computed(() => props.data.reduce((sum, m) => sum + m.invoiceCount, 0))
const averageInvoice = computed(() => (totalInvoices.value > 0 ? totalFaturado.value / totalInvoices.value : 0))
</script>