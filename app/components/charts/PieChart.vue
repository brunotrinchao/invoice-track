<template>
  <BaseChart
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

const props = defineProps<{
  data?: PieDatum[]
  tooltip?: Record<string, unknown>
  legend?: Record<string, unknown>
  height?: number
  formatValue?: (value: number) => string
}>()

const { data = [], tooltip = {}, legend = {}, height = 280, formatValue } = props
</script>