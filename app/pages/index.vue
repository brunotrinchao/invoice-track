<template>
  <div class="flex flex-col gap-6">
    <!-- Global filters (export dentro do card, em destaque) -->
    <FiltersFilterBar
      :banks="banks"
      :bank-model="selectedBanks"
      :status-model="selectedStatus"
      :from="from"
      :to="to"
      @update="onFilterUpdate"
    >
      <!-- Export dropdown (apple-design: scale-in do gatilho, spring 200ms) -->
      <div ref="exportRoot" class="relative">
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-xs font-extrabold !text-white shadow-md shadow-brand-500/25 transition-[background-color,transform] active:scale-[0.97] hover:brightness-110 cursor-pointer"
          aria-haspopup="menu"
          :aria-expanded="exportOpen"
          aria-label="Exportar dashboard"
          @click="exportOpen = !exportOpen"
        >
          <Icon name="lucide:download" class="h-4 w-4" />
          <span>Exportar</span>
          <Icon v-if="exporting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
        </button>

        <AnimatePresence>
        <motion.div
          v-if="exportOpen"
          role="menu"
          aria-label="Formato de exportação"
          class="absolute right-0 top-[46px] z-30 w-56 rounded-2xl border border-default bg-elevated p-1.5 shadow-xl"
          :initial="{ opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.95 }"
          :transition="reduced ? { duration: 0.15 } : { type: 'spring', duration: 0.25, bounce: 0.15 }"
          style="transform-origin: top right"
        >
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-default hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
            :disabled="exporting !== null"
            @click="onExport('pdf')"
          >
            <Icon :name="exporting === 'pdf' ? 'lucide:loader-2' : 'lucide:file-text'" :class="exporting === 'pdf' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'" />
            <span class="flex flex-col min-w-0">
              <span>PDF — Relatório IA</span>
              <span class="text-[10px] font-medium text-muted">Análise de previsibilidade com gráficos</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-default hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
            :disabled="exporting !== null"
            @click="onExport('excel')"
          >
            <Icon :name="exporting === 'excel' ? 'lucide:loader-2' : 'lucide:sheet'" class="h-4 w-4" :class="exporting === 'excel' ? 'animate-spin' : ''" />
            <span class="flex flex-col min-w-0">
              <span>Excel — Parcelas + Dashboard</span>
              <span class="text-[10px] font-medium text-muted">Dados + fórmulas vivas</span>
            </span>
          </button>
        </motion.div>
        </AnimatePresence>
      </div>
    </FiltersFilterBar>

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

    <!-- Próximas parcelas: compras parceladas em aberto -->
    <motion.div
      v-if="predictability"
      :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.25, ease: EASE_OUT_UI, delay: 0.18 }"
    >
      <DashboardInstallmentsPlan :banks="selectedBanks" :from="from" :to="to" :status="selectedStatus" />
    </motion.div>

    <UiAppToast
      :open="toastOpen"
      :message="toastMessage"
      :tone="toastTone"
      @close="toastOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { EASE_OUT_UI } from '~/utils/motion'
import { useCardStore } from '~/stores/cardStore'
import { useReports, useDashboardExport } from '~/composables/useReports'
import type { PredictabilityReportData } from '~/composables/useReports'

const cardStore = useCardStore()
const reduced = useReducedMotion()

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

// ===== Export dropdown =====
const exportOpen = ref(false)
const exportRoot = ref<HTMLElement | null>(null)
const { exporting, download } = useDashboardExport()
const toastOpen = ref(false)
const toastMessage = ref('')
const toastTone = ref<'success' | 'error' | 'info'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, tone: 'success' | 'error' | 'info' = 'success') {
  toastMessage.value = msg
  toastTone.value = tone
  toastOpen.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastOpen.value = false }, 4000)
}

async function onExport(kind: 'pdf' | 'excel') {
  exportOpen.value = false
  try {
    await download(kind, {
      banks: selectedBanks.value.length ? selectedBanks.value : undefined,
      from: from.value || undefined,
      to: to.value || undefined,
      status: selectedStatus.value || undefined,
    })
    showToast(kind === 'pdf' ? 'Relatório gerado — download iniciado.' : 'Excel gerado — download iniciado.', 'success')
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Falha na exportação.', 'error')
  }
}

// Click-outside + ESC fecha o menu
function onDocClick(e: MouseEvent) {
  if (exportRoot.value && !exportRoot.value.contains(e.target as Node)) exportOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})

function onFilterUpdate(value: { banks?: string[]; status?: string; from?: string; to?: string }) {
  selectedBanks.value = value.banks ?? []
  selectedStatus.value = value.status ?? ''
  from.value = value.from ?? ''
  to.value = value.to ?? ''
}
</script>