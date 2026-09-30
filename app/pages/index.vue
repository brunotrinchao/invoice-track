<template>
  <div class="flex flex-col gap-6">
    <!-- Global filters: bank, status, date range -->
    <FiltersFilterBar
      :banks="banks"
      :bank-model="selectedBanks"
      :status-model="selectedStatus"
      :from="from"
      :to="to"
      @update="onFilterUpdate"
    />

    <!-- Executive KPIs -->
    <motion.div
      v-if="predictability"
      :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.25, ease: EASE_OUT_UI, delay: 0.05 }"
    >
      <DashboardReportStats
        :data="predictability.monthlySummary"
      />
    </motion.div>

    <p
      v-if="predictabilityError"
      role="alert"
      class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ predictabilityError }}</p>

    <!-- Loading: skeleton dos KPIs (shape real) -->
    <div v-else-if="!predictability" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <div v-for="i in 4" :key="i" class="rounded-xl glass-card px-4 py-5">
        <div class="h-3 w-24 rounded-md bg-current/10" />
        <div class="mt-3 h-6 w-32 rounded-md bg-current/10" />
      </div>
    </div>

    <!-- Main content: curve + bars (3/4) + pies (1/4) -->
    <motion.div
      v-if="predictability"
      class="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:items-start"
      :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.25, ease: EASE_OUT_UI, delay: 0.12 }"
    >
      <div class="min-w-0 lg:col-span-3">
        <div class="glass-card rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-extrabold text-highlighted">Curva de previsibilidade de faturas</h3>
              <p class="text-xs text-muted">Projeção temporal dos parcelamentos nos próximos meses</p>
            </div>
          </div>
          <DashboardPredictabilityChart
            class="mt-4"
            :data="predictability.monthlySummary"
            @refresh="loadPredictability()"
          />
        </div>
        <div class="glass-card mt-5 rounded-2xl p-5">
          <h3 class="text-sm font-extrabold text-highlighted">Total por banco</h3>
          <p class="text-xs text-muted">Último mês com faturas carregadas</p>
          <DashboardBankBarChart
            class="mt-4"
            :data="predictability.monthlySummary"
          />
        </div>
      </div>
      <div class="min-w-0 lg:col-span-1">
        <DashboardPieCharts :data="predictability.monthlySummary" />
      </div>
    </motion.div>
  </div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { EASE_OUT_UI } from '~/utils/motion'
import { useCardStore } from '~/stores/cardStore'
import { useReports } from '~/composables/useReports'
import type { PredictabilityReportData } from '~/composables/useReports'

const cardStore = useCardStore()

await cardStore.fetchAll()

function getCurrentMonthString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function addMonths(monthYear: string, n: number): string {
  const [y, m] = monthYear.split('-').map(Number)
  const date = new Date(y, m - 1 + n, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const currentMonth = getCurrentMonthString()

// Dashboard filters: default to "Próximos meses" and "Todos" (all) status
const selectedBanks = ref<string[]>([])
const selectedStatus = ref('')
const from = ref(currentMonth)
const to = ref(addMonths(currentMonth, 5))

// Unique bank names from the card store, sorted for the filter bar
const banks = computed(() => {
  return [...new Set(cardStore.cards.map((c) => c.bankName).filter(Boolean))].sort()
})

const { predictability: fetchPredictability } = useReports()
const predictability = ref<PredictabilityReportData | null>(null)
const predictabilityError = ref('')
const loadingReport = ref(false)

async function loadPredictability() {
  loadingReport.value = true
  predictabilityError.value = ''
  try {
    predictability.value = await fetchPredictability({
      banks: selectedBanks.value.length ? selectedBanks.value : undefined,
      status: selectedStatus.value || undefined,
      from: from.value || undefined,
      to: to.value || undefined,
    })
  } catch (e) {
    predictabilityError.value = e instanceof Error ? e.message : 'Erro ao carregar o relatório.'
    predictability.value = null
  } finally {
    loadingReport.value = false
  }
}

watch([selectedBanks, from, to, selectedStatus], loadPredictability)
await loadPredictability()

function onFilterUpdate(value: { banks?: string[]; status?: string; from?: string; to?: string }) {
  selectedBanks.value = value.banks ?? []
  selectedStatus.value = value.status ?? ''
  from.value = value.from ?? ''
  to.value = value.to ?? ''
}
</script>