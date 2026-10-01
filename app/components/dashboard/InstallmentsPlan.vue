<template>
  <div class="flex flex-col gap-4">
    <!-- Header + resumo -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-extrabold text-highlighted">Próximas parcelas</h3>
        <p v-if="report" class="text-xs text-muted">
          {{ report.summary.openCount }} compra(s) em aberto
          · <span class="font-bold text-highlighted">{{ formatMoney(report.summary.remainingTotal) }}</span> restantes
        </p>
        <p v-else-if="loading" class="text-xs text-muted">Carregando parcelas…</p>
        <p v-else-if="error" role="alert" class="text-xs text-red-500">{{ error }}</p>
      </div>
    </div>

    <template v-if="report && report.groups.length > 0">
      <!-- Grupos por cartão (colapsáveis) -->
      <div class="flex flex-col gap-3">
        <div
          v-for="(group, gi) in report.groups"
          :key="group.cardId"
          class="rounded-2xl glass-card overflow-hidden"
        >
          <details :open="gi === 0" class="group">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none hover:bg-current/5 transition-colors">
              <div class="flex items-center gap-2.5 min-w-0">
                <Icon name="lucide:chevron-down" class="h-3.5 w-3.5 text-dimmed transition-transform group-open:rotate-180 shrink-0" />
                <UiBankLogo :bank-name="group.bankName" size-class="h-5 w-5" />
                <span class="text-xs font-extrabold text-highlighted truncate">
                  {{ group.bankName }} •••• {{ group.last4Digits }}
                </span>
              </div>
              <span class="text-xs font-bold text-highlighted font-mono shrink-0">
                {{ formatMoney(groupTotal(group)) }}
              </span>
            </summary>

            <div class="border-t border-default/50 px-4 py-2">
              <AnimatePresence>
                <motion.div
                  v-for="(item, idx) in group.items"
                  :key="item.description"
                  class="flex flex-col gap-1.5 border-b border-default/30 py-3 last:border-0"
                  :initial="{ opacity: 0, y: 8 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.25, ease: EASE_OUT_UI, delay: Math.min(idx * 0.04, 0.2) }"
                >
                  <!-- Linha 1: desc + badge + restante -->
                  <div class="flex items-center justify-between gap-3">
                    <p class="min-w-0 truncate text-xs font-extrabold text-highlighted">{{ item.description }}</p>
                    <span
                      v-if="item.endingSoon"
                      class="inline-flex shrink-0 items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400"
                    >
                      {{ item.remainingCount === 1 ? 'última parcela' : 'termina em ' + item.remainingCount }}
                    </span>
                    <span class="shrink-0 text-xs font-bold text-highlighted font-mono">
                      {{ formatMoney(item.remainingTotal) }}
                    </span>
                  </div>

                  <!-- Linha 2: sub-info -->
                  <p class="text-[11px] text-muted">
                    faltam {{ item.remainingCount }} de {{ item.progressTotal }} ·
                    {{ formatMoney(item.monthlyAmount) }}/mês ·
                    até {{ formatLastMonth(item.lastMonth) }}
                  </p>

                  <!-- Linha 3: barra progresso -->
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-current/10">
                    <div
                      class="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-[var(--ease-out-ui)]"
                      :style="{ width: `${progressPercent(item)}%` }"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </details>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div
      v-else-if="report && report.groups.length === 0"
      class="glass-card rounded-2xl px-6 py-8 text-center"
    >
      <Icon name="lucide:calendar-check-2" class="mx-auto h-8 w-8 text-dimmed" />
      <p class="mt-2 text-xs text-muted">Nenhuma compra parcelada em aberto</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import { formatMoney } from '~/utils/money'
import { useReports } from '~/composables/useReports'
import type { InstallmentsItem, InstallmentsReportData } from '~/composables/useReports'
import { EASE_OUT_UI } from '~/utils/motion'

/**
 * Compras parceladas em aberto: parcelas futuras por compra, agrupadas por
 * cartão — quando cada compra termina e quanto ainda falta pagar.
 */

const props = defineProps<{
  cardIds?: string[]
  banks?: string[]
  from?: string
  to?: string
  status?: string
}>()

const { getInstallmentsReport } = useReports()

const loading = ref(true)
const error = ref('')
const report = ref<InstallmentsReportData | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await getInstallmentsReport({
      cardIds: props.cardIds?.length ? props.cardIds : undefined,
      banks: props.banks?.length ? props.banks : undefined,
      from: props.from || undefined,
      to: props.to || undefined,
      status: props.status || undefined,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar parcelas'
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [props.cardIds, props.banks, props.from, props.to, props.status], load)

void load()

function groupTotal(group: { items: InstallmentsItem[] }): number {
  return Math.round(group.items.reduce((s, i) => s + i.remainingTotal, 0) * 100) / 100
}

function progressPercent(item: InstallmentsItem): number {
  if (item.progressTotal <= 0) return 0
  return Math.round((item.progressCurrent / item.progressTotal) * 100)
}

function formatLastMonth(monthYear: string): string {
  if (!monthYear) return '—'
  const [year, month] = monthYear.split('-')
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${MONTHS[Math.max(0, parseInt(month, 10) - 1)]}/${year?.slice(-2)}`
}
</script>