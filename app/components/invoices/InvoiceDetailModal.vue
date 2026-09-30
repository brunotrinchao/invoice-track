<template>
  <UiAppModal
    :open="openRef"
    :title="bankInvoice ? `Fatura ${bankInvoice.bankName || ''} — ${monthLabel}` : 'Fatura'"
    :description="headerDescription"
    max-width="3xl"
    @close="onClose"
  >
            <div
              v-if="loading"
              class="py-12 text-center text-sm text-dark-muted"
            >
              Carregando detalhes da fatura do banco...
            </div>

            <div
              v-else-if="bankInvoice"
              class="flex flex-col gap-5"
            >
              <!-- Totals Metrics -->
              <section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded-xl glass-card px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Total</p>
                  <p class="mt-1 text-base font-bold text-highlighted">{{ formatMoney(totalAmount) }}</p>
                </div>
                <div class="rounded-xl glass-card px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Compras</p>
                  <p class="mt-1 text-base font-bold text-highlighted">{{ formatMoney(purchasesAmount) }}</p>
                </div>
                <div class="rounded-xl glass-card px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Taxas e encargos</p>
                  <p class="mt-1 text-base font-bold text-highlighted">{{ formatMoney(feesAmount) }}</p>
                </div>
                <div class="rounded-xl glass-card px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Créditos</p>
                  <p class="mt-1 text-base font-bold text-highlighted">{{ formatMoney(creditsAmount) }}</p>
                </div>
              </section>

              <!-- Cards Breakdown -->
              <section v-if="detailedInvoices.length > 0">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Cartões desta fatura</h3>
                <div class="mt-2 flex flex-col gap-2">
                  <div
                    v-for="inv in detailedInvoices"
                    :key="inv.id"
                    class="flex items-center justify-between rounded-xl glass-card px-4 py-2.5"
                  >
                    <div class="flex items-center gap-2.5">
                      <UiBankLogo :bank-name="inv.card?.bankName" size-class="h-5 w-5" />
                      <UiCardBrandLogo :brand="inv.card?.brand" variant="flat-rounded" size-class="h-4 w-6" />
                      <span class="text-xs font-semibold text-highlighted">
                        {{ inv.card?.bankName || 'Banco' }} •••• {{ inv.card?.last4Digits || '----' }}
                      </span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span v-if="inv.dueDate" class="text-xs text-dark-muted font-medium">Venc: {{ formatDateShort(inv.dueDate) }}</span>
                      <span class="text-xs font-bold text-highlighted">{{ formatMoney(Number(inv.totalAmount || 0)) }}</span>
                      <span
                        :class="[
                          'inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-extrabold',
                          getInvoiceStatusInfo(inv).badgeClass
                        ]"
                      >
                        {{ getInvoiceStatusInfo(inv).label }}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Search and Filter Bar -->
              <section v-if="allItemsWithInvoice.length > 0" class="flex flex-col gap-2.5 pt-2 border-t border-default/40">
                <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                  <!-- Search purchase name -->
                  <div class="relative sm:col-span-6">
                    <Icon name="lucide:search" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-dark-muted" />
                    <input
                      v-model="searchQuery"
                      type="text"
                      aria-label="Buscar por nome da compra"
                      placeholder="Buscar por nome da compra..."
                      class="w-full rounded-xl border border-accented bg-elevated/90 pl-10 pr-9 py-2 text-xs text-highlighted placeholder-slate-400 dark:placeholder-dark-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      v-if="searchQuery"
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      aria-label="Limpar busca"
                      @click="searchQuery = ''"
                    >
                      <Icon name="lucide:x" class="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <!-- Select Card -->
                  <div class="sm:col-span-3">
                    <select
                      v-model="selectedCardId"
                      class="w-full rounded-xl border border-accented bg-elevated/90 px-3 py-2 text-xs text-highlighted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option v-for="c in cardOptions" :key="c.value" :value="c.value">
                        {{ c.label }}
                      </option>
                    </select>
                  </div>

                  <!-- Select Recurring -->
                  <div class="sm:col-span-3">
                    <select
                      v-model="recurringFilter"
                      class="w-full rounded-xl border border-accented bg-elevated/90 px-3 py-2 text-xs text-highlighted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="all">Recorrente: Todos</option>
                      <option value="yes">Recorrente: Sim</option>
                      <option value="no">Recorrente: Não</option>
                    </select>
                  </div>
                </div>
              </section>

              <!-- Empty state for search/filter -->
              <div
                v-if="allItemsWithInvoice.length > 0 && filteredItemsWithInvoice.length === 0"
                class="rounded-xl glass-card p-6 text-center text-xs text-dark-muted"
              >
                <Icon name="lucide:search-x" class="mx-auto h-8 w-8 text-slate-400 mb-2" />
                Nenhuma compra encontrada para os filtros selecionados.
                <button
                  type="button"
                  class="mt-2 block mx-auto text-brand-400 hover:underline font-semibold"
                  @click="resetItemFilters"
                >
                  Limpar filtros
                </button>
              </div>

              <!-- Items: Purchases -->
              <section v-if="purchaseItems.length">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Compras ({{ purchaseItems.length }})</h3>
                <div class="mt-2 flex flex-col gap-2">
                  <InvoicesInvoiceItemRow
                    v-for="{ item, invoice } in purchaseItems"
                    :key="item.id"
                    :item="item"
                    :invoice="invoice"
                    :card="invoice.card"
                    @set-recurring="onSetRecurring"
                    @item-click="onItemClick"
                  />
                </div>
              </section>

              <!-- Items: Fees & Charges -->
              <section v-if="feeItems.length">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Taxas e encargos ({{ feeItems.length }})</h3>
                <div class="mt-2 flex flex-col gap-2">
                  <InvoicesInvoiceItemRow
                    v-for="{ item, invoice } in feeItems"
                    :key="item.id"
                    :item="item"
                    :invoice="invoice"
                    :card="invoice.card"
                    @set-recurring="onSetRecurring"
                    @item-click="onItemClick"
                  />
                </div>
              </section>

              <!-- Items: Credits -->
              <section v-if="creditItems.length">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-dark-muted">Créditos ({{ creditItems.length }})</h3>
                <div class="mt-2 flex flex-col gap-2">
                  <InvoicesInvoiceItemRow
                    v-for="{ item, invoice } in creditItems"
                    :key="item.id"
                    :item="item"
                    :invoice="invoice"
                    :card="invoice.card"
                    @set-recurring="onSetRecurring"
                    @item-click="onItemClick"
                  />
                </div>
              </section>

              <p
                v-if="error"
                role="alert"
                class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >{{ error }}</p>
            </div>
          <template #footer>
            <div v-if="bankInvoice" class="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-xl border border-accented bg-elevated px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              :disabled="toggling"
              @click="onTogglePaid"
            >
              {{ isBankPaid ? 'Marcar como não paga' : 'Pagar' }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20 cursor-pointer"
              @click="onDelete"
            >
              Excluir
            </button>
            <button
              type="button"
              class="rounded-xl border border-accented bg-elevated px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-slate-200 cursor-pointer"
              @click="onClose"
            >
              Fechar
            </button>
          </div>
          </template>
  </UiAppModal>

  <InvoicesInvoiceItemDetailDrawer
    :open="selectedItem !== null"
    :item="selectedItem"
    :invoice="selectedInvoice"
    :invoices="detailedInvoices"
    :card-id="selectedInvoice?.cardId"
    @close="selectedItem = null"
    @updated="onItemUpdated"
  />

  <InvoicesRecurringSetRecurringDrawer
    v-if="selectedItem && !selectedItem.isRecurring"
    :open="openSet"
    :item="selectedItem"
    :invoices="detailedInvoices"
    :card-id="selectedInvoice?.cardId"
    @close="openSet = false"
    @submitted="onSetSubmitted"
  />
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import type { Card } from '~/types/Card'
import type { BankInvoice } from '~/types/BankInvoice'
import { useInvoices } from '~/composables/useInvoices'
import { getInvoiceStatusInfo, formatDateShort } from '~/utils/bankInvoice'

const props = defineProps<{
  bankInvoice: BankInvoice | null
  cards: Card[]
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { togglePaid, bulkDelete, getInvoice } = useInvoices()

const openRef = ref(false)

watch(
  () => props.open,
  (v) => { openRef.value = v },
  { immediate: true },
)
const detailedInvoices = ref<Invoice[]>([])
const loading = ref(false)
const error = ref('')

function onOpenUpdate(val: boolean) {
  openRef.value = val
  if (!val) emit('close')
}

const searchQuery = ref('')
const selectedCardId = ref('')
const recurringFilter = ref<'all' | 'yes' | 'no'>('all')

const cardOptions = computed(() => {
  const options = [{ value: '', label: 'Todos os cartões' }]
  for (const inv of detailedInvoices.value) {
    if (inv.card) {
      options.push({
        value: inv.card.id,
        label: `${inv.card.bankName} •••• ${inv.card.last4Digits}`,
      })
    }
  }
  return options
})

function resetItemFilters() {
  searchQuery.value = ''
  selectedCardId.value = ''
  recurringFilter.value = 'all'
}

watch(
  () => props.bankInvoice,
  async (bankInv) => {
    resetItemFilters()
    if (!bankInv) {
      detailedInvoices.value = []
      return
    }
    loading.value = true
    error.value = ''
    try {
      detailedInvoices.value = await Promise.all(
        bankInv.invoices.map((inv) => getInvoice(inv.id)),
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao carregar detalhes da fatura do banco.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const headerDescription = computed(() => {
  if (!props.bankInvoice) return ''
  const due = props.bankInvoice.dueDate ? ` • Vencimento: ${formatDateShort(props.bankInvoice.dueDate)}` : ''
  return `${cardSummaryLabel.value}${due}`
})

const openSet = ref(false)
const selectedItem = ref<InvoiceItem | null>(null)
const selectedInvoice = ref<Invoice | undefined>(undefined)
const toggling = ref(false)

const isBankPaid = computed(() => {
  if (detailedInvoices.value.length === 0) return props.bankInvoice?.isPaid ?? false
  return detailedInvoices.value.every((inv) => inv.isPaid)
})

const totalAmount = computed(() => {
  if (detailedInvoices.value.length === 0) return props.bankInvoice?.totalAmount ?? 0
  return detailedInvoices.value.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0)
})

const purchasesAmount = computed(() => {
  if (detailedInvoices.value.length === 0) return props.bankInvoice?.purchasesAmount ?? 0
  return detailedInvoices.value.reduce((acc, inv) => acc + Number(inv.purchasesAmount || 0), 0)
})

const feesAmount = computed(() => {
  if (detailedInvoices.value.length === 0) return props.bankInvoice?.feesAmount ?? 0
  return detailedInvoices.value.reduce((acc, inv) => acc + Number(inv.feesAmount || 0), 0)
})

const creditsAmount = computed(() => {
  if (detailedInvoices.value.length === 0) return props.bankInvoice?.creditsAmount ?? 0
  return detailedInvoices.value.reduce((acc, inv) => acc + Number(inv.creditsAmount || 0), 0)
})

const allItemsWithInvoice = computed(() => {
  const result: Array<{ item: InvoiceItem; invoice: Invoice }> = []
  for (const inv of detailedInvoices.value) {
    if (inv.items) {
      for (const item of inv.items) {
        result.push({ item, invoice: inv })
      }
    }
  }
  return result
})

const filteredItemsWithInvoice = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return allItemsWithInvoice.value.filter(({ item, invoice }) => {
    // 1. Purchase description / name search
    if (query && !item.description.toLowerCase().includes(query)) {
      return false
    }

    // 2. Card select filter
    if (selectedCardId.value && invoice.cardId !== selectedCardId.value) {
      return false
    }

    // 3. Recurring filter (all / yes / no)
    if (recurringFilter.value === 'yes' && !item.isRecurring) {
      return false
    }
    if (recurringFilter.value === 'no' && item.isRecurring) {
      return false
    }

    return true
  })
})

const purchaseItems = computed(() => filteredItemsWithInvoice.value.filter(({ item }) => item.itemType === 'PURCHASE'))
const feeItems = computed(() => filteredItemsWithInvoice.value.filter(({ item }) => ['FEE', 'FINE', 'INTEREST', 'TAX'].includes(item.itemType)))
const creditItems = computed(() => filteredItemsWithInvoice.value.filter(({ item }) => item.itemType === 'CREDIT'))

const monthLabel = computed(() => {
  if (!props.bankInvoice) return ''
  const [year, month] = props.bankInvoice.monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const cardSummaryLabel = computed(() => {
  if (!props.bankInvoice) return ''
  const count = props.bankInvoice.cardsCount
  const digits = props.bankInvoice.cardDigitsList.map((d) => `•••• ${d}`).join(', ')
  return count === 1 ? `1 cartão (${digits})` : `${count} cartões (${digits})`
})

async function refresh() {
  if (!props.bankInvoice) return
  try {
    detailedInvoices.value = await Promise.all(
      props.bankInvoice.invoices.map((inv) => getInvoice(inv.id)),
    )
    emit('updated')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao atualizar a fatura.'
  }
}

async function onTogglePaid() {
  if (!props.bankInvoice || detailedInvoices.value.length === 0) return
  toggling.value = true
  error.value = ''
  try {
    const nextIsPaid = !isBankPaid.value
    await Promise.all(detailedInvoices.value.map((inv) => togglePaid(inv.id, nextIsPaid)))
    emit('updated')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao atualizar o status da fatura.'
  } finally {
    toggling.value = false
  }
}

async function onDelete() {
  if (!props.bankInvoice || detailedInvoices.value.length === 0) return
  const ok = typeof window !== 'undefined'
    && window.confirm(`Excluir fatura do ${props.bankInvoice.bankName} (${monthLabel.value})? Esta ação excluirá os dados de todos os cartões desta fatura e não pode ser desfeita.`)
  if (!ok) return
  error.value = ''
  try {
    const ids = detailedInvoices.value.map((inv) => inv.id)
    await bulkDelete(ids)
    onClose()
    emit('updated')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao excluir a fatura.'
  }
}

function onSetRecurring(item: InvoiceItem) {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  const found = allItemsWithInvoice.value.find((x) => x.item.id === item.id)
  selectedInvoice.value = found?.invoice
  selectedItem.value = item
  openSet.value = true
}

function onItemClick(item: InvoiceItem) {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  const found = allItemsWithInvoice.value.find((x) => x.item.id === item.id)
  selectedInvoice.value = found?.invoice
  selectedItem.value = item
}

async function onItemUpdated() {
  selectedItem.value = null
  await refresh()
}

async function onSetSubmitted() {
  openSet.value = false
  selectedItem.value = null
  await refresh()
}

function onClose() {
  onOpenUpdate(false)
}

</script>