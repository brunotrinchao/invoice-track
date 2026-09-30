<template>
  <div ref="container" :style="{ height: `${height}px` }" class="w-full" />
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  type: 'line' | 'bar' | 'pie'
  data?: unknown[]
  categories?: string[]
  series?: Array<{ name: string; data: (number | { value: number; itemStyle?: Record<string, unknown> })[]; dashed?: boolean; color?: string }>
  tooltip?: Record<string, unknown>
  legend?: Record<string, unknown>
  height?: number
  formatValue?: (value: number) => string
}>()

const { isLight } = useTheme()
const container = ref<HTMLDivElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)

function onWindowResize() {
  try {
    chart.value?.resize()
  } catch (e) {
    console.error('[BaseChart] resize error', (e as Error)?.stack || e)
  }
}

function buildOption(): echarts.EChartsOption {
  const isPie = props.type === 'pie'
  const format = props.formatValue ?? ((v: number) => v.toLocaleString('pt-BR'))
  const light = isLight.value

  // Entrada/diff animado: 250ms (dentro do budget <300ms), stagger 40ms por série
  const animation = {
    animation: true,
    animationDuration: 250,
    animationDurationUpdate: 250,
    animationEasing: 'cubicOut' as const,
    animationEasingUpdate: 'cubicOut' as const,
    animationDelay: (idx: number) => (isPie ? 0 : idx * 40),
  }

  const textColor = light ? '#1e293b' : '#e2e8f0'
  const mutedColor = light ? '#64748b' : '#94a3b8'
  const borderColor = light ? '#e2e8f0' : '#232d42'
  const cardBg = light ? '#ffffff' : '#151c2c'
  const splitLineColor = light ? '#f1f5f9' : '#1e293b'

  const baseTooltip = {
    backgroundColor: cardBg,
    borderColor,
    textStyle: { color: textColor },
    ...(props.tooltip ?? {}),
  }

  if (isPie) {
    return {
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => format(typeof v === 'number' ? v : Number(v ?? 0)),
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: mutedColor, fontSize: 11 },
        ...(props.legend ?? {}),
      },
      series: [
        {
          type: 'pie',
          radius: ['32%', '65%'],
          avoidLabelOverlap: true,
          minAngle: 5,
          itemStyle: { borderColor: cardBg, borderWidth: 2, borderRadius: 4 },
          label: {
            show: true,
            color: textColor,
            fontSize: 11,
            formatter: '{b}\n({d}%)',
          },
          labelLine: {
            smooth: true,
            length: 10,
            length2: 10,
          },
          data: props.data ?? [],
        },
      ],
      ...animation,
    }
  }

  const seriesType = props.type ?? 'line'
  const series = (props.series ?? [])
    .filter((s) => s && Array.isArray(s.data))
    .map((s) => {
      const color = s.color
      return {
        name: s.name,
        type: seriesType,
        data: s.data,
        smooth: seriesType === 'line',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: s.dashed
          ? { type: 'dashed', width: 2, color }
          : color
          ? { width: 2, color }
          : { width: 2 },
        itemStyle: {
          color: color || (s.dashed ? '#64748b' : undefined),
        },
        areaStyle: seriesType === 'line' ? { opacity: 0.12, color } : undefined,
      }
    })

  return {
    tooltip: {
      ...baseTooltip,
      valueFormatter: (v: unknown) => format(typeof v === 'number' ? v : Number(v ?? 0)),
      trigger: 'axis',
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: mutedColor },
      ...(props.legend ?? {}),
    },
    grid: { left: 16, right: 16, top: 36, bottom: 44, containLabel: true },
    xAxis: {
      type: 'category',
      data: props.categories ?? [],
      axisLine: { lineStyle: { color: borderColor } },
      axisLabel: { color: mutedColor },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: mutedColor, formatter: (v: number) => format(v) },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series,
    ...animation,
  }
}

function render() {
  if (!container.value) return
  if (!chart.value) {
    chart.value = echarts.init(container.value)
    window.addEventListener('resize', onWindowResize)
  }
  try {
    // Update incremental (sem clear): ECharts anima o diff entre estados —
    // transições de dados suaves nos filtros; entrada já anima no init.
    chart.value.setOption(buildOption(), { notMerge: false })
  } catch (e) {
    console.error('[BaseChart] setOption error', props.type, e)
  }
}

watch(
  () => [props.data, props.categories, props.series, props.tooltip, props.legend, props.height, isLight.value],
  () => render(),
  { deep: true },
)

onMounted(render)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  chart.value?.dispose()
  chart.value = null
})
</script>