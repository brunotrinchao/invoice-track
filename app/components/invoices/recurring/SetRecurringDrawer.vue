<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="openRef"
        class="fixed inset-0 flex justify-end bg-slate-950/60 dark:bg-black/80 backdrop-blur-md"
        :style="{ zIndex: currentZIndex }"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="FADE_FAST"
        @click.self="onClose"
      >
        <motion.div
          class="relative h-full w-full max-w-sm border-l border-default bg-elevated text-slate-950 dark:text-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto"
          role="dialog"
          aria-modal="true"
          :initial="reduced ? { opacity: 0 } : DRAWER_RIGHT.initial"
          :animate="reduced ? { opacity: 1 } : DRAWER_RIGHT.enter"
          :exit="reduced ? { opacity: 0 } : DRAWER_RIGHT.leave"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default/80 p-4.5 bg-elevated/60">
            <div>
              <h2 class="text-base font-extrabold text-highlighted">Marcar como recorrente</h2>
              <p class="text-xs font-bold text-muted mt-0.5">Informe a partir de qual mês/ano esta compra será recorrente</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
              @click="onClose"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 p-5 flex flex-col gap-4">
            <p class="text-xs font-bold text-muted bg-default/60 p-3.5 rounded-2xl border border-default/50">
              <span class="font-extrabold text-highlighted">{{ item.description }}</span>
              <span class="text-muted font-mono"> · {{ formatMoney(item.originalAmount) }}</span>
            </p>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-extrabold text-muted">A partir de qual fatura? (mês e ano)</label>
              <select
                v-model="startMonthYear"
                class="rounded-2xl border border-accented bg-default px-3.5 py-2 text-xs font-extrabold text-highlighted focus:border-brand-500 focus:outline-none"
              >
                <option
                  v-for="opt in invoiceOptions"
                  :key="opt.value"
                  :value="opt.value"
                >{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-extrabold text-muted">Até qual fatura? (opcional)</label>
              <select
                v-model="endMonthYear"
                class="rounded-2xl border border-accented bg-default px-3.5 py-2 text-xs font-extrabold text-highlighted focus:border-brand-500 focus:outline-none"
              >
                <option value="">Sem término (para sempre)</option>
                <option
                  v-for="opt in endOptions"
                  :key="opt.value"
                  :value="opt.value"
                >{{ opt.label }}</option>
              </select>
            </div>

            <div class="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 px-4 py-3 text-xs font-extrabold text-brand-900 dark:text-brand-300">
              Será aplicada a {{ previewCount }} fatura{{ previewCount === 1 ? '' : 's' }}.
            </div>

            <p
              v-if="error"
              role="alert"
              class="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400"
            >{{ error }}</p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-default/80 p-4 bg-elevated/80">
            <button
              type="button"
              class="rounded-2xl border border-accented bg-elevated px-4.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer"
              @click="onClose"
            >Cancelar</button>
            <button
              type="button"
              class="rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 px-5 py-2.5 text-xs font-extrabold !text-white shadow-md shadow-brand-500/20 transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer disabled:opacity-50"
              :disabled="loading || !startMonthYear"
              @click="onSubmit"
            >Confirmar</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import { ref, computed, watch, onUnmounted } from 'vue'
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { FADE_FAST, DRAWER_RIGHT } from '~/utils/motion'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import { useRecurring } from '~/composables/useRecurring'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'

interface AppSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  open: boolean
  item: InvoiceItem
  invoices: Invoice[]
  cardId?: string
}>()

const emit = defineEmits<{
  close: []
  submitted: [recurringId: string]
}>()

const { createRecurringFromItem } = useRecurring()
const { register, getZIndex } = useOverlayStack()
const reduced = useReducedMotion()

const overlayHandle = ref<OverlayHandle | null>(null)
const currentZIndex = computed(() => {
  if (!overlayHandle.value) return 300
  return getZIndex(overlayHandle.value.id)
})

const openRef = ref(false)

watch(
  () => props.open,
  (v) => {
    openRef.value = v
    if (v) {
      if (!overlayHandle.value) {
        overlayHandle.value = register('drawer', onClose)
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

const loading = ref(false)
const error = ref('')

const startMonthYear = ref('')
const endMonthYear = ref('')

const projectedMonthYear = computed(() => {
  if (!props.invoices || !props.invoices.length) return currentMonthYear()
  const last = props.invoices[props.invoices.length - 1].monthYear
  return addMonths(last, 1)
})

watch(
  () => [openRef.value, props.invoices],
  () => {
    if (!openRef.value) return
    startMonthYear.value = props.invoices && props.invoices.length ? props.invoices[0].monthYear : projectedMonthYear.value
    endMonthYear.value = ''
    error.value = ''
  },
  { immediate: true },
)

const invoiceOptions = computed<AppSelectOption[]>(() => {
  const map = new Map<string, string>()

  if (props.invoices && props.invoices.length) {
    for (const inv of props.invoices) {
      map.set(inv.monthYear, monthLabel(inv.monthYear))
    }
  }

  const base = currentMonthYear()
  if (!map.has(base)) {
    map.set(base, monthLabel(base))
  }
  let curr = base
  for (let i = 0; i < 12; i++) {
    curr = addMonths(curr, 1)
    if (!map.has(curr)) {
      map.set(curr, monthLabel(curr))
    }
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.value.localeCompare(b.value))
})

const endOptions = computed<AppSelectOption[]>(() => {
  if (!startMonthYear.value) return []
  const start = startMonthYear.value
  const map = new Map<string, string>()

  if (props.invoices && props.invoices.length) {
    for (const inv of props.invoices) {
      if (inv.monthYear > start) {
        map.set(inv.monthYear, monthLabel(inv.monthYear))
      }
    }
  }

  let curr = start
  for (let i = 0; i < 24; i++) {
    curr = addMonths(curr, 1)
    if (!map.has(curr)) {
      map.set(curr, monthLabel(curr))
    }
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.value.localeCompare(b.value))
})

const previewCount = computed(() => {
  if (!startMonthYear.value) return 0
  const list = props.invoices ?? []
  const inRange = list.filter((inv) => inv.monthYear >= startMonthYear.value)
  if (!endMonthYear.value) return inRange.length
  return inRange.filter((inv) => inv.monthYear <= endMonthYear.value).length
})

async function onSubmit() {
  if (!startMonthYear.value) return
  loading.value = true
  error.value = ''
  try {
    const list = props.invoices ?? []
    const recurring = await createRecurringFromItem({
      itemId: props.item.id,
      cardId: list.length ? list[0].cardId : (props.cardId || ''),
      startMonthYear: startMonthYear.value,
      endMonthYear: endMonthYear.value || null,
    })
    emit('submitted', recurring.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao ativar a recorrência.'
  } finally {
    loading.value = false
  }
}

function onClose() {
  onOpenUpdate(false)
}

function currentMonthYear() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(monthYear: string, months: number) {
  const [year, month] = monthYear.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(monthYear: string) {
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

</script>