<template>
  <UiAppCard title="Compras recorrentes">
    <div v-if="error" class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {{ error }}
    </div>

    <div v-else-if="loading" class="py-8 text-center text-sm text-dark-muted">
      Cargando…
    </div>

    <template v-else-if="!hasData">
      <p class="py-8 text-center text-sm text-dark-muted">Sem dados de recorrentes</p>
    </template>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl glass-card px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-dark-muted">Média mensal</p>
          <p class="mt-1 text-xl font-bold text-highlighted">{{ formatMoney(summary.monthlyAverage) }}</p>
        </div>
        <div class="rounded-xl glass-card px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-dark-muted">Próximo mes</p>
          <p class="mt-1 text-xl font-bold text-highlighted">{{ formatMoney(summary.nextMonthTotal) }}</p>
        </div>
        <div class="rounded-xl glass-card px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-dark-muted">Recorrentes ativas</p>
          <p class="mt-1 text-xl font-bold text-highlighted">{{ summary.activeCount }}</p>
        </div>
      </div>

      <ChartsAreaChart
        class="mt-5"
        :categories="categories"
        :series="series"
        :height="300"
        :format-value="formatMoney"
      />
    </template>
  </UiAppCard>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import { useReports } from '~/composables/useReports'
import type { RecurringReportData } from '~/composables/useReports'

const props = defineProps<{
  cardIds?: string[]
  from?: string // "YYYY-MM"
  to?: string // "YYYY-MM"
}>()

const { getRecurringReport } = useReports()

const loading = ref(true)
const error = ref('')
const report = ref<RecurringReportData | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await getRecurringReport({
      cardIds: props.cardIds?.length ? props.cardIds : undefined,
      from: props.from || undefined,
      to: props.to || undefined,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao cargar o reporte'
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [props.cardIds, props.from, props.to], load)

void load()

const categories = computed(() => (report.value?.months ?? []).map((m) => m.monthYear))

const series = computed(() => {
  const months = report.value?.months ?? []
  return [
    {
      name: 'Realizado',
      data: months.filter((m) => !m.isProjected).map((m) => m.total),
    },
    {
      name: 'Projetado',
      dashed: true,
      data: months.filter((m) => m.isProjected).map((m) => m.total),
    },
  ]
})

const summary = computed(() => report.value?.summary ?? { monthlyAverage: 0, nextMonthTotal: 0, activeCount: 0 })

const hasData = computed(() => (report.value?.months ?? []).length > 0)
</script>
