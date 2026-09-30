<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="openRef"
        class="fixed inset-0 flex items-center justify-center bg-slate-950/60 dark:bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
        :style="{ zIndex: currentZIndex }"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="FADE_FAST"
        @click.self="onClose"
      >
        <motion.div
          class="relative w-full max-w-lg rounded-3xl border border-default bg-elevated text-slate-950 dark:text-slate-200 shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          :initial="{ opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="MODAL_OUT"
          :transition="reduced ? FADE_FAST : SPRING_DEFAULT"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default/80 px-6 py-4.5 bg-elevated/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <h2 class="text-base font-extrabold text-highlighted truncate">
                {{ item ? item.description : 'Detalhe da compra' }}
              </h2>
              <UiAppBadge v-if="item?.isRecurring" tone="blue">Recorrente</UiAppBadge>
            </div>
            <button
              class="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
              @click="onClose"
            >
              <Icon name="lucide:x" class="h-4.5 w-4.5" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4">
            <div v-if="item" class="flex flex-col gap-4">
              <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="rounded-2xl bg-default/60 border border-default/50 px-4 py-3">
                  <dt class="text-xs font-extrabold uppercase tracking-wider text-muted">Valor</dt>
                  <dd class="mt-1 text-base font-extrabold text-highlighted font-mono">{{ formatMoney(item.originalAmount) }}</dd>
                </div>
                <div class="rounded-2xl bg-default/60 border border-default/50 px-4 py-3">
                  <dt class="text-xs font-extrabold uppercase tracking-wider text-muted">Tipo</dt>
                  <dd class="mt-1 text-sm font-extrabold text-highlighted">{{ typeLabel }}</dd>
                </div>
                <div v-if="item.totalInstallments > 1" class="rounded-2xl bg-default/60 border border-default/50 px-4 py-3">
                  <dt class="text-xs font-extrabold uppercase tracking-wider text-muted">Parcela</dt>
                  <dd class="mt-1 text-sm font-extrabold text-highlighted font-mono">{{ item.currentInstallment }}/{{ item.totalInstallments }}</dd>
                </div>
                <div v-if="item.purchaseDate" class="rounded-2xl bg-default/60 border border-default/50 px-4 py-3">
                  <dt class="text-xs font-extrabold uppercase tracking-wider text-muted">Data de compra</dt>
                  <dd class="mt-1 text-sm font-extrabold text-highlighted font-mono">{{ formatDate(item.purchaseDate) }}</dd>
                </div>
                <div v-if="cardLabel" class="rounded-2xl bg-default/60 border border-default/50 px-4 py-3 sm:col-span-2">
                  <dt class="text-xs font-extrabold uppercase tracking-wider text-muted">Cartão</dt>
                  <dd class="mt-1 text-sm font-extrabold text-highlighted flex items-center gap-2">
                    <Icon name="lucide:credit-card" class="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    {{ cardLabel }}
                  </dd>
                </div>
                <div v-if="invoicesWithItem.length" class="rounded-2xl bg-default/60 border border-default/50 px-4 py-3 sm:col-span-2">
                  <dt class="text-xs font-extrabold uppercase tracking-wider text-muted mb-2">Faturas com esta compra (mês/ano)</dt>
                  <dd class="flex flex-wrap gap-2">
                    <span
                      v-for="inv in invoicesWithItem"
                      :key="inv.id"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/15 px-3 py-1.5 text-xs font-extrabold text-brand-900 dark:text-brand-300 shadow-xs"
                    >
                      <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                      {{ formatMonthYearShort(inv.monthYear) }}
                    </span>
                  </dd>
                </div>
              </dl>

              <p
                v-if="error"
                role="alert"
                class="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400"
              >{{ error }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="item" class="border-t border-default/80 px-6 py-4 bg-elevated/80 flex flex-wrap items-center justify-end gap-3">
            <button
              v-if="item.isRecurring"
              type="button"
              class="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/15 px-4.5 py-2.5 text-xs font-extrabold text-amber-950 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/25 transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer shadow-xs flex items-center gap-2"
              :disabled="deleting"
              @click="onDeactivateRecurring"
            >
              <Icon name="lucide:rotate-ccw" class="h-4 w-4 text-amber-900 dark:text-amber-400" />
              <span>Desativar recorrência</span>
            </button>
            <button
              v-else
              type="button"
              class="rounded-2xl border border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-500/15 px-4.5 py-2.5 text-xs font-extrabold text-brand-900 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/25 transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer shadow-xs flex items-center gap-2"
              @click="openSet = true"
            >
              <Icon name="lucide:repeat" class="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span>Marcar como recorrente</span>
            </button>
            <button
              type="button"
              class="rounded-2xl border border-accented bg-elevated px-4.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer"
              @click="onClose"
            >Fechar</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>

  <InvoicesRecurringSetRecurringDrawer
    v-if="item && !item.isRecurring"
    :open="openSet"
    :item="item"
    :invoices="effectiveInvoices"
    :card-id="cardId"
    @close="openSet = false"
    @submitted="onRecurringSubmitted"
  />
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { MODAL_OUT, SPRING_DEFAULT, FADE_FAST } from '~/utils/motion'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import { useRecurring } from '~/composables/useRecurring'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'

const reduced = useReducedMotion()

const props = defineProps<{
  item: InvoiceItem | null
  invoice?: Invoice
  open: boolean
  invoices?: Invoice[]
  cardId?: string
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const effectiveInvoices = computed(() => props.invoices ?? [])

const { deleteRecurring } = useRecurring()
const { register, getZIndex } = useOverlayStack()

const overlayHandle = ref<OverlayHandle | null>(null)
const currentZIndex = computed(() => {
  if (!overlayHandle.value) return 200
  return getZIndex(overlayHandle.value.id)
})

const openRef = ref(false)

watch(
  () => props.open,
  (v) => {
    openRef.value = v
    if (v) {
      if (!overlayHandle.value) {
        overlayHandle.value = register('modal', onClose)
      }
    } else if (overlayHandle.value) {
      overlayHandle.value.unregister()
      overlayHandle.value = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (overlayHandle.value) {
    overlayHandle.value.unregister()
    overlayHandle.value = null
  }
})

function onOpenUpdate(val: boolean) {
  openRef.value = val
  if (!val) emit('close')
}

const openSet = ref(false)
const deleting = ref(false)
const error = ref('')

const typeLabel = computed(() => {
  const map = {
    PURCHASE: 'Compra',
    FEE: 'Encargo',
    FINE: 'Multa',
    INTEREST: 'Juros',
    TAX: 'Imposto',
    CREDIT: 'Crédito',
  }
  return map[props.item?.itemType ?? 'PURCHASE'] ?? 'Compra'
})

const cardLabel = computed(() => {
  const c = props.invoice?.card
  return c ? `${c.bankName} •••• ${c.last4Digits}` : ''
})

const invoicesWithItem = computed(() => {
  if (!props.item || !props.invoices || !props.invoices.length) {
    if (props.invoice) return [props.invoice]
    return []
  }

  const target = props.item
  const matching: Invoice[] = []

  for (const inv of props.invoices) {
    if (!inv.items) continue
    const found = inv.items.some((i) => {
      if (i.id === target.id) return true
      if (target.recurringItemId && i.recurringItemId === target.recurringItemId) return true
      if (
        target.description === i.description &&
        target.originalAmount === i.originalAmount &&
        target.totalInstallments > 1 &&
        target.totalInstallments === i.totalInstallments
      ) {
        return true
      }
      return false
    })
    if (found) {
      matching.push(inv)
    }
  }

  return matching.sort((a, b) => a.monthYear.localeCompare(b.monthYear))
})

async function onDeactivateRecurring() {
  if (!props.item?.recurringItemId) return
  const ok = typeof window !== 'undefined'
    && window.confirm('Desativar recorrência? Será removida de faturas não pagas. Faturas pagas conservam o histórico.')
  if (!ok) return
  deleting.value = true
  error.value = ''
  try {
    await deleteRecurring(props.item.recurringItemId)
    emit('updated')
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao desativar a recorrência.'
  } finally {
    deleting.value = false
  }
}

function onRecurringSubmitted() {
  openSet.value = false
  emit('updated')
  emit('close')
}

function onClose() {
  onOpenUpdate(false)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatMonthYearShort(monthYear: string) {
  if (!monthYear || !monthYear.includes('-')) return monthYear
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date)
  return label.replace('.', '')
}
</script>