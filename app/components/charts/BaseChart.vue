<template>
  <div ref="container" :style="{ height: `${height}px` }" class="w-full" />
</template>

<script setup lang="ts">
import * as echarts from 'echarts'

const props = defineProps<{
  type: 'line' | 'bar' | 'pie'
  data: unknown[]
  // Ejes (line/bar): categories para xAxis, series con { name, data, dashed? }
  categories?: string[]
  series?: Array<{ name: string; data: number[]; dashed?: boolean }>
  // Pie: [{ name, value }]
  tooltip?: Record<string, unknown>
  legend?: Record<string, unknown>
  height?: number
  formatValue?: (value: number) => string
}>()

const container = ref<HTMLDivElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
let resizeObserver: ResizeObserver | null = null

function darkAxisLabel() {
  return { color: '#94a3b8' }
}

function buildOption(): echarts.EChartsOption {
  const isPie = props.type === 'pie'
  const format = props.formatValue ?? ((v: number) => v.toLocaleString('pt-BR'))

  const baseTooltip = {
    backgroundColor: '#151c2c',
    borderColor: '#232d42',
    textStyle: { color: '#e2e8f0' },
    ...(props.tooltip ?? {}),
  }

  if (isPie) {
    return {
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => format(typeof v === 'number' ? v : Number(v ?? 0)),
      },
      legend: {
        textStyle: { color: '#94a3b8' },
        ...(props.legend ?? {}),
      },
      series: [
        {
          type: 'pie',
          radius: '62%',
          itemStyle: { borderColor: '#232d42', borderWidth: 1 },
          label: { color: '#e2e8f0' },
          data: props.data,
        },
      ],
    }
  }

  const series = (props.series ?? []).map((s) => ({
    name: s.name,
    type: props.type,
    data: s.data,
    smooth: true,
    symbol: 'circle',
    lineStyle: s.dashed ? { type: 'dashed', width: 2 } : { width: 2 },
    itemStyle: { color: s.dashed ? '#64748b' : undefined },
    areaStyle: props.type === 'line' ? { opacity: 0.12 } : undefined,
  }))

  return {
    tooltip: {
      ...baseTooltip,
      valueFormatter: (v: unknown) => format(typeof v === 'number' ? v : Number(v ?? 0)),
      trigger: 'axis',
    },
    legend: {
      textStyle: { color: '#94a3b8' },
      ...(props.legend ?? {}),
    },
    grid: { left: 16, right: 16, top: 36, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: props.categories ?? [],
      axisLine: { lineStyle: { color: '#232d42' } },
      axisLabel: darkAxisLabel(),
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...darkAxisLabel(), formatter: (v: number) => format(v) },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series,
  }
}

function render() {
  if (!container.value) return
  if (!chart.value) {
    chart.value = echarts.init(container.value)
    resizeObserver = new ResizeObserver(() => chart.value?.resize())
    resizeObserver.observe(container.value)
  }
  chart.value.setOption(buildOption())
}

watch(
  () => [props.data, props.categories, props.series, props.tooltip, props.legend, props.height],
  () => render(),
  { deep: true },
)

onMounted(render)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart.value?.dispose()
  chart.value = null
})
</script>