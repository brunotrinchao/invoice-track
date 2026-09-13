<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center gap-2">
      <NuxtLink
        to="/invoices"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        aria-label="Volver a faturas"
      >
        <Icon name="lucide:arrow-left" />
      </NuxtLink>
    </div>

    <div
      v-if="error"
      class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ error }}</div>

    <div
      v-else-if="loading"
      class="py-8 text-center text-sm text-dark-muted"
    >Cargando…</div>

    <InvoiceDetail
      v-else
      :invoice="invoice"
      @set-recurring="onSetRecurring"
    />

    <SetRecurringModal
      :open="openSetModal"
      :item="selectedItem"
      :invoices="unpaidInvoices"
      :card-id="invoice?.cardId"
      @close="openSetModal = false"
      @submitted="onRecurringSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import { useInvoices } from '~/composables/useInvoices'
import { useRecurring } from '~/composables/useRecurring'

const { getInvoice, list } = useInvoices()
const { deleteRecurring } = useRecurring()

const route = useRoute()
const id = route.params.id as string

const loading = ref(true)
const error = ref('')
const invoice = ref<Invoice | null>(null)
const invoices = ref<Invoice[]>([])

const openSetModal = ref(false)
const selectedItem = ref<InvoiceItem | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    invoice.value = await getInvoice(id)
    // Faturas NO pagas del mismo card, ordenadas asc (para el modal)
    const all = await list()
    invoices.value = all
      .filter((inv) => inv.cardId === invoice.value!.cardId && !inv.isPaid)
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar la fatura'
  } finally {
    loading.value = false
  }
}

await load()

const unpaidInvoices = computed(() => invoices.value)

function onSetRecurring(item: InvoiceItem) {
  if (item.isRecurring) {
    // Desactivar recorrência: confirmación + DELETE
    const ok = typeof window !== 'undefined'
      && window.confirm('Desativar recorrência? Será removida de faturas no pagas. Faturas pagadas conservan el histórico.')
    if (ok) void deactivateRecurring(item)
    return
  }
  selectedItem.value = item
  openSetModal.value = true
}

async function deactivateRecurring(item: InvoiceItem) {
  if (!item.recurringItemId) return
  try {
    await deleteRecurring(item.recurringItemId)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al desativar la recorrência'
  }
}

async function onRecurringSubmitted() {
  openSetModal.value = false
  await load()
}
</script>