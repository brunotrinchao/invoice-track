<template>
  <div class="flex flex-col gap-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Invoice Track</h1>
        <p class="text-sm text-dark-muted">Nuevo frontend Nuxt 3 — Fase 0 (bootstrap)</p>
      </div>
      <div class="flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600">
        <span class="h-2 w-2 rounded-full bg-brand-500" />
        Nuxt 3 + Vue 3 + Pinia + Tailwind
      </div>
    </header>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AppCard title="Faturas">
        <p class="text-3xl font-bold text-white">{{ invoiceStore.invoices.length }}</p>
      </AppCard>
      <AppCard title="Tarjetas">
        <p class="text-3xl font-bold text-white">{{ cardStore.cards.length }}</p>
      </AppCard>
      <AppCard title="Recorrentes">
        <p class="text-3xl font-bold text-white">{{ recurringStore.items.length }}</p>
      </AppCard>
    </section>

    <section class="glass-card rounded-2xl p-5">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-dark-muted">Filtros</h2>
      <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
        <CardFilter
          v-model="selectedCardIds"
          label="Cartões"
        />
        <DateRangePicker
          :from="from"
          :to="to"
          @update="onDateRange"
        />
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4">
      <RecurringChart
        :card-ids="selectedCardIds"
        :from="from"
        :to="to"
      />
    </section>

    <section
      v-if="predictability"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <AppCard title="Mes actual">
        <p class="text-3xl font-bold text-white">{{ formatMoney(predictability.metrics.currentMonthTotal) }}</p>
      </AppCard>
      <AppCard title="Próximo mes">
        <p class="text-3xl font-bold text-white">{{ formatMoney(predictability.metrics.nextMonthTotal) }}</p>
      </AppCard>
      <AppCard title="Comprometido futuro">
        <p class="text-3xl font-bold text-white">{{ formatMoney(predictability.metrics.totalCommittedFuture) }}</p>
      </AppCard>
      <AppCard title="Promedio mensual">
        <p class="text-3xl font-bold text-white">{{ formatMoney(predictability.metrics.averageMonthly) }}</p>
      </AppCard>
    </section>

    <section class="glass-card rounded-2xl p-5">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-dark-muted">
        Estado del store
      </h2>
      <pre class="mt-3 overflow-x-auto rounded-xl bg-dark-card p-4 text-xs text-slate-300">{{ summary }}</pre>
    </section>

    <footer class="text-xs text-dark-muted">
      API backend Express en <code class="rounded bg-dark-card px-1.5 py-0.5">/api/*</code> — proxy configurado en dev vía <code class="rounded bg-dark-card px-1.5 py-0.5">NITRO_PORT</code> / reverse proxy en prod.
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useInvoiceStore } from '~/stores/invoiceStore'
import { useCardStore } from '~/stores/cardStore'
import { useRecurringStore } from '~/stores/recurringStore'
import { useReports } from '~/composables/useReports'
import type { PredictabilityReportData } from '~/composables/useReports'

const invoiceStore = useInvoiceStore()
const cardStore = useCardStore()
const recurringStore = useRecurringStore()

// Datos mock de Fase 0 (design doc 6.5): los stores se pueblan con fetch real
// cuando se migren los dominios (Fase 2).
await Promise.all([
  invoiceStore.fetchAll(),
  cardStore.fetchAll(),
  recurringStore.fetchAll(),
])

// Filtros del dashboard: vacío = todas las tarjetas / sin límite de rango
const selectedCardIds = ref<string[]>([])
const from = ref('')
const to = ref('')

const { predictability: fetchPredictability } = useReports()

const predictability = ref<PredictabilityReportData | null>(null)
const predictabilityError = ref('')

async function loadPredictability() {
  predictabilityError.value = ''
  try {
    predictability.value = await fetchPredictability({
      cardIds: selectedCardIds.value.length ? selectedCardIds.value : undefined,
      from: from.value || undefined,
      to: to.value || undefined,
    })
  } catch (e) {
    predictabilityError.value = e instanceof Error ? e.message : 'Error al cargar el reporte'
    predictability.value = null
  }
}

watch([selectedCardIds, from, to], loadPredictability)

await loadPredictability()

function onDateRange(value: { from: string; to: string }) {
  from.value = value.from
  to.value = value.to
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

const summary = computed(() =>
  JSON.stringify(
    {
      invoices: invoiceStore.invoices.map((i) => i.id),
      cards: cardStore.cards.map((c) => `${c.bankName} ${c.last4Digits}`),
      recurring: recurringStore.items.map((r) => r.description),
      errors: {
        invoices: invoiceStore.error,
        cards: cardStore.error,
        recurring: recurringStore.error,
        predictability: predictabilityError,
      },
    },
    null,
    2,
  ),
)
</script>