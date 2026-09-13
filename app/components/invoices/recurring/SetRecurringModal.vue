<template>
  <AppModal
    :open="open"
    title="Marcar como recorrente"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm text-slate-300">
        <span class="font-medium text-white">{{ item.description }}</span>
        <span class="text-dark-muted"> · {{ formatMoney(item.originalAmount) }}</span>
      </p>

      <AppSelect
        v-model="startMonthYear"
        label="A partir de qual fatura?"
        :options="invoiceOptions"
      />

      <AppSelect
        v-model="endMonthYear"
        label="Até qual fatura? (opcional)"
        :options="endOptions"
        placeholder="Sem término (para sempre)"
      />

      <div class="rounded-xl bg-brand-500/10 px-4 py-3 text-sm text-brand-600">
        Se aplicará a {{ previewCount }} fatura{{ previewCount === 1 ? '' : 's' }}.
      </div>

      <p
        v-if="error"
        class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
      >{{ error }}</p>

      <div class="flex justify-end gap-2">
        <AppButton
          variant="secondary"
          @click="emit('close')"
        >Cancelar</AppButton>
        <AppButton
          :loading="loading"
          :disabled="!startMonthYear"
          @click="onSubmit"
        >Confirmar</AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import { useRecurring } from '~/composables/useRecurring'

interface AppSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  open: boolean
  item: InvoiceItem
  /** Faturas NO pagas del card, ordenadas asc por monthYear */
  invoices: Invoice[]
  /** Card de la fatura origen (fallback si invoices está vacío) */
  cardId?: string
}>()

const emit = defineEmits<{
  close: []
  submitted: [recurringId: string]
}>()

const { open, item, invoices, cardId = '' } = props

const { createRecurringFromItem } = useRecurring()

const loading = ref(false)
const error = ref('')

const startMonthYear = ref('')
const endMonthYear = ref('')

// Próximo mes tras la última fatura (o mes actual si no hay faturas) — spec 3.6
const projectedMonthYear = computed(() => {
  if (!invoices.length) return currentMonthYear()
  const last = invoices[invoices.length - 1].monthYear
  return addMonths(last, 1)
})

watch(
  () => [open, invoices],
  () => {
    if (!open) return
    // Default: primera fatura no pagada; si no hay, próxima fatura (proyectada)
    startMonthYear.value = invoices.length ? invoices[0].monthYear : projectedMonthYear.value
    endMonthYear.value = ''
    error.value = ''
  },
  { immediate: true },
)

const invoiceOptions = computed<AppSelectOption[]>(() => {
  const opts = invoices.map((inv) => ({
    value: inv.monthYear,
    label: monthLabel(inv.monthYear),
  }))
  if (!invoices.length) {
    opts.push({ value: projectedMonthYear.value, label: 'Próxima fatura (proyectada)' })
  }
  return opts
})

const endOptions = computed<AppSelectOption[]>(() =>
  invoices
    .filter((inv) => inv.monthYear > startMonthYear.value)
    .map((inv) => ({
      value: inv.monthYear,
      label: monthLabel(inv.monthYear),
    })),
)

const previewCount = computed(() => {
  if (!startMonthYear.value) return 0
  const inRange = invoices.filter((inv) => inv.monthYear >= startMonthYear.value)
  if (!endMonthYear.value) return inRange.length
  return inRange.filter((inv) => inv.monthYear <= endMonthYear.value).length
})

async function onSubmit() {
  if (!startMonthYear.value) return
  loading.value = true
  error.value = ''
  try {
    const recurring = await createRecurringFromItem({
      itemId: item.id,
      cardId: invoices.length ? invoices[0].cardId : cardId,
      startMonthYear: startMonthYear.value,
      endMonthYear: endMonthYear.value || null,
    })
    emit('submitted', recurring.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al activar la recorrência'
  } finally {
    loading.value = false
  }
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}
</script>