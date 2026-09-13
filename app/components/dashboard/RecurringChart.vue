<template>
  <AppCard title="Compras recorrentes">
    <div v-if="error" class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {{ error }}
    </div>

    <div v-else-if="loading" class="py-8 text-center text-sm text-dark-muted">
      Cargando…
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-dark-card px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-dark-muted">Promedio mensual</p>
          <p class="mt-1 text-xl font-bold text-white">{{ formatMoney(summary.monthlyAverage) }}</p>
        </div>
        <div class="rounded-xl bg-dark-card px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-dark-muted">Próximo mes</p>
          <p class="mt-1 text-xl font-bold text-white">{{ formatMoney(summary.nextMonthTotal) }}</p>
        </div>
        <div class="rounded-xl bg-dark-card px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-dark-muted">Recorrentes activas</p>
          <p class="mt-1 text-xl font-bold text-white">{{ summary.activeCount }}</p>
        </div>
      </div>

      <AreaChart
        class="mt-5"
        :categories="categories"
        :series="series"
        :height="300"
        :format-value="formatMoney"
      />
    </template>
  </AppCard>
</template>

<script setup lang="ts">
import { useReports } from '~/composables/useReports'
import type { RecurringReportData } from '~/composables/useReports'

const props = defineProps<{
  cardIds?: string[]
  from?: string // "YYYY-MM"
  to?: string // "YYYY-MM"
}>()

const { cardIds = [], from = '', to = '' } = props

const { getRecurringReport } = useReports()

const loading = ref(true)
const error = ref('')
const report = ref<RecurringReportData | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await getRecurringReport({
      cardIds: cardIds.length ? cardIds : undefined,
      from: from || undefined,
      to: to || undefined,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar el reporte'
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [cardIds, from, to], load)

void load()

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

const categories = computed(() => (report.value?.months ?? []).map((m) => m.monthYear))

const series = computed(() => {
  const months = report.value?.months ?? []
  return [
    {
      name: 'Realizado',
      data: months.filter((m) => !m.isProjected).map((m) => m.total),
    },
    {
      name: 'Proyectado',
      dashed: true,
      data: months.filter((m) => m.isProjected).map((m) => m.total),
    },
  ]
})

const summary = computed(() => report.value?.summary ?? { monthlyAverage: 0, nextMonthTotal: 0, activeCount: 0 })
</script>