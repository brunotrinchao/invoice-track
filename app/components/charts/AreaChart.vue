<template>
  <ChartsBaseChart
    type="line"
    :data="[]"
    :categories="categories"
    :series="series"
    :tooltip="tooltip"
    :legend="legend"
    :height="height"
    :format-value="formatValue"
  />
</template>

<script setup lang="ts">
interface AreaSeries {
  name: string
  data: number[]
  dashed?: boolean
}

withDefaults(
  defineProps<{
    categories?: string[]
    series?: AreaSeries[]
    tooltip?: Record<string, unknown>
    legend?: Record<string, unknown>
    height?: number
    formatValue?: (value: number) => string
  }>(),
  {
    categories: () => [],
    series: () => [],
    tooltip: () => ({}),
    legend: () => ({}),
    height: 280,
  },
)
</script>