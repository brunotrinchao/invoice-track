<template>
  <ChartsBarChart
    :categories="categories"
    :series="series"
    :format-value="formatMoney"
    :height="280"
  />
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { MonthlySummaryItem } from '~/composables/useReports'
import { getBankColor } from '~/utils/bankColors'

/**
 * Horizontal bar chart of totals grouped by bank, for the last month with data.
 * Rendered with echarts using official bank reference colors.
 */

const props = defineProps<{
  data: MonthlySummaryItem[]
}>()


const lastMonth = computed(() => {
  const withData = props.data.filter((m) => m.invoiceCount > 0)
  return withData.length > 0 ? withData[withData.length - 1] : null
})

const categories = computed(() => Object.keys(lastMonth.value?.byBank ?? {}))

const series = computed(() => {
  const bankEntries = Object.entries(lastMonth.value?.byBank ?? {})
  return [
    {
      name: 'Total por banco',
      data: bankEntries.map(([bankName, value]) => ({
        value: Math.round(value * 100) / 100,
        itemStyle: {
          color: getBankColor(bankName),
          borderRadius: [0, 6, 6, 0],
        },
      })),
    },
  ]
})
</script>