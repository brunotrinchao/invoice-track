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
      role="alert"
      class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ error }}</div>

    <div
      v-else-if="loading"
      class="py-8 text-center text-sm text-dark-muted"
    >Cargando…</div>

    <InvoicesInvoiceDetail
      v-else
      :invoice="invoice"
      @set-recurring="onSetRecurring"
      @item-click="onItemClick"
      @toggle-paid="onTogglePaid"
      @edit="openEdit = true"
      @delete="onDelete"
    />

    <InvoicesEditInvoiceDrawer
      :open="openEdit"
      :invoice="invoice"
      @close="openEdit = false"
      @saved="onEdited"
    />

    <InvoicesInvoiceItemDetailDrawer
      :open="selectedItem !== null"
      :item="selectedItem"
      :invoice="invoice"
      :invoices="unpaidInvoices"
      :card-id="invoice?.cardId"
      @close="selectedItem = null"
      @updated="load"
    />

    <InvoicesRecurringSetRecurringDrawer
      v-if="selectedItem && !selectedItem.isRecurring"
      :open="openSet"
      :item="selectedItem"
      :invoices="unpaidInvoices"
      :card-id="invoice?.cardId"
      @close="openSet = false"
      @submitted="onRecurringSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import { useInvoices } from '~/composables/useInvoices'
import { useRecurring } from '~/composables/useRecurring'

const { getInvoice, list, togglePaid, remove } = useInvoices()
const { deleteRecurring } = useRecurring()

const route = useRoute()
const id = route.params.id as string

const loading = ref(true)
const error = ref('')
const invoice = ref<Invoice | null>(null)
const invoices = ref<Invoice[]>([])

const openEdit = ref(false)
const openSet = ref(false)
const selectedItem = ref<InvoiceItem | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    invoice.value = await getInvoice(id)
    // Faturas NO pagas del mismo card, ordenadas asc (para drawers de recorrência)
    const all = await list()
    invoices.value = all
      .filter((inv) => inv.cardId === invoice.value!.cardId && !inv.isPaid)
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao cargar a fatura'
  } finally {
    loading.value = false
  }
}

await load()

const unpaidInvoices = computed(() => invoices.value)

function onItemClick(item: InvoiceItem) {
  selectedItem.value = item
}

function onSetRecurring(item: InvoiceItem) {
  if (item.isRecurring) {
    // Desativar recorrência: confirmación + DELETE (misma lógica que el modal anterior)
    const ok = typeof window !== 'undefined'
      && window.confirm('Desativar recorrência? Será removida de faturas não pagas. Faturas pagadas conservan o histórico.')
    if (!ok) return
    void deactivateRecurring(item)
    return
  }
  selectedItem.value = item
  openSet.value = true
}

async function deactivateRecurring(item: InvoiceItem) {
  if (!item.recurringItemId) return
  try {
    await deleteRecurring(item.recurringItemId)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao desativar a recorrência'
  }
}

async function onTogglePaid() {
  if (!invoice.value) return
  try {
    invoice.value = await togglePaid(invoice.value.id, !invoice.value.isPaid)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao atualizar o status da fatura'
  }
}

async function onDelete() {
  if (!invoice.value) return
  const ok = typeof window !== 'undefined'
    && window.confirm(`Excluir fatura ${invoice.value.monthYear}? Esta ação não pode ser desfeita.`)
  if (!ok) return
  try {
    await remove(invoice.value.id)
    await navigateTo('/invoices')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao excluir a fatura'
  }
}

function onEdited() {
  openEdit.value = false
  void load()
}

async function onRecurringSubmitted() {
  openSet.value = false
  selectedItem.value = null
  await load()
}
</script>