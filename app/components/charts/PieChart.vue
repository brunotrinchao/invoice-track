<template>
  <ChartsBaseChart
    type="pie"
    :data="data"
    :tooltip="tooltip"
    :legend="legend"
    :height="height"
    :format-value="formatValue"
  />
</template>

<script setup lang="ts">
interface PieDatum {
  name: string
  value: number
}

withDefaults(
  defineProps<{
    data?: PieDatum[]
    tooltip?: Record<string, unknown>
    legend?: Record<string, unknown>
    height?: number
    formatValue?: (value: number) => string
  }>(),
  {
    data: () => [],
    tooltip: () => ({}),
    legend: () => ({}),
    height: 280,
  },
)
</script>