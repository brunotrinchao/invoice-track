<template>
  <div class="flex flex-col gap-6">
    <header>
      <div>
        <h1 class="text-2xl font-bold text-highlighted">Faturas por Banco</h1>
        <p class="text-sm text-muted">Selecione uma fatura de banco para ver os detalhes dos cartões, compras, pagar ou excluir</p>
      </div>
    </header>

    <!-- Filters: bank, period (month/year), status -->
    <FiltersFilterBar
      :banks="banks"
      :bank-model="selectedBanks"
      :status-model="selectedStatus"
      :sort-model="selectedSort"
      :show-sort="true"
      period-mode="month"
      :from="from"
      :to="to"
      @update="onFilterUpdate"
    />

    <div
      v-if="error"
      role="alert"
      class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ error }}</div>

    <!-- Loading: skeleton da lista (shape real, shimmer suave) -->
    <div v-else-if="loading" class="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div v-for="i in 3" :key="i" class="rounded-2xl glass-card p-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="h-9 w-9 rounded-xl bg-current/10" />
            <div class="flex flex-col gap-2 min-w-0">
              <div class="h-4 w-44 rounded-md bg-current/10" />
              <div class="h-3 w-28 rounded-md bg-current/10" />
            </div>
            <div class="h-3 w-16 rounded-md bg-current/10" />
          </div>
          <div class="h-5 w-24 rounded-md bg-current/10" />
        </div>
      </div>
    </div>

    <div
      v-else-if="filteredBankInvoices.length === 0"
      class="rounded-2xl glass-card px-6 py-10 text-center"
    >
      <Icon
        name="lucide:calendar"
        class="mx-auto h-10 w-10 text-slate-400"
      />
      <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Nenhuma fatura de banco encontrada com os filtros selecionados.</p>
    </div>

    <!-- Invoice Cards by Bank -->
    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="bankInv in filteredBankInvoices"
        :key="bankInv.id"
        role="button"
        tabindex="0"
        class="flex flex-col justify-between rounded-2xl glass-card p-5 text-left transition-[background-color,color,border-color,box-shadow,transform,opacity] hover:border-brand-500/40 hover:bg-dark-card/90 cursor-pointer"
        :aria-label="`Abrir fatura do ${bankInv.bankName} ${formatMonthYear(bankInv.monthYear)}`"
        @click="openDetail(bankInv)"
        @keydown.enter="openDetail(bankInv)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <UiBankLogo :bank-name="bankInv.bankName" size-class="h-6 w-6" />
            </div>
            <div class="flex flex-col min-w-0">
              <h3 class="text-base font-bold text-highlighted truncate">{{ bankInv.bankName }}</h3>
              <span class="text-xs text-muted truncate">
                {{ formatCardSubtitle(bankInv) }}
              </span>
            </div>
          </div>
          <span
            :class="[
              'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-extrabold',
              getInvoiceStatusInfo(bankInv).badgeClass
            ]"
          >
            {{ getInvoiceStatusInfo(bankInv).label }}
          </span>
        </div>

        <div class="mt-5 flex items-end justify-between border-t border-default/60 pt-3">
          <div class="flex flex-col">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">Mês / Ano</span>
            <span class="text-sm font-bold text-brand-600 dark:text-brand-500/90">{{ formatMonthYear(bankInv.monthYear) }}</span>
            <span v-if="bankInv.dueDate" class="text-xs font-semibold text-muted mt-0.5">
              Venc: {{ formatDateShort(bankInv.dueDate) }}
            </span>
          </div>
          <div class="flex flex-col text-right">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">Valor da Fatura</span>
            <span class="text-base font-extrabold text-highlighted">{{ formatMoney(bankInv.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <InvoicesInvoiceDetailModal
      :open="selectedBankInvoice !== null"
      :bank-invoice="selectedBankInvoice"
      :cards="cardStore.cards"
      @close="selectedBankInvoice = null"
      @updated="onInvoiceUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { Invoice } from '~/types/Invoice'
import type { BankInvoice } from '~/types/BankInvoice'
import { useInvoices } from '~/composables/useInvoices'
import { useCardStore } from '~/stores/cardStore'
import { groupInvoicesByBank, getInvoiceStatusInfo, formatDateShort } from '~/utils/bankInvoice'

const cardStore = useCardStore()
const { list } = useInvoices()

const rawInvoices = ref<Invoice[]>([])
const loading = ref(true)
const error = ref('')

function getCurrentMonthString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const currentMonth = getCurrentMonthString()

const selectedBanks = ref<string[]>([])
const selectedStatus = ref('unpaid')
const selectedSort = ref('date_desc')
const from = ref(currentMonth)
const to = ref(currentMonth)

const selectedBankInvoice = ref<BankInvoice | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    rawInvoices.value = await list()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar faturas.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
  void cardStore.fetchAll()
})

// SPA: voltar p/ esta página após importar → dados novos devem carregar
// (onMounted não re-dispara quando a página fica ativa via cache do Nuxt)
const route = useRoute()
watch(
  () => route.path,
  (path, old) => {
    if (path === '/invoices' && old && old !== '/invoices') {
      void load()
      void cardStore.fetchAll()
    }
  },
)

const allBankInvoices = computed(() => groupInvoicesByBank(rawInvoices.value))

const banks = computed(() => {
  const cardBanks = cardStore.cards.map((c) => c.bankName)
  const invoiceBanks = allBankInvoices.value.map((inv) => inv.bankName)
  return [...new Set([...cardBanks, ...invoiceBanks].filter((b): b is string => Boolean(b)))].sort()
})

const filteredBankInvoices = computed(() => {
  const result = allBankInvoices.value.filter((bankInv) => {
    if (selectedBanks.value.length > 0 && !selectedBanks.value.includes(bankInv.bankName)) {
      return false
    }
    if (selectedStatus.value === 'paid' && !bankInv.isPaid) return false
    if (selectedStatus.value === 'unpaid' && bankInv.isPaid) return false
    if (from.value && bankInv.monthYear < from.value) return false
    if (to.value && bankInv.monthYear > to.value) return false

    return true
  })

  return [...result].sort((a, b) => {
    switch (selectedSort.value) {
      case 'date_asc':
        return a.monthYear.localeCompare(b.monthYear)
      case 'date_desc':
        return b.monthYear.localeCompare(a.monthYear)
      case 'amount_desc':
        return b.totalAmount - a.totalAmount
      case 'amount_asc':
        return a.totalAmount - b.totalAmount
      case 'due_date_asc': {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      }
      case 'due_date_desc': {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return b.dueDate.localeCompare(a.dueDate)
      }
      default:
        return b.monthYear.localeCompare(a.monthYear)
    }
  })
})

function openDetail(bankInv: BankInvoice) {
  selectedBankInvoice.value = bankInv
}

function onFilterUpdate(value: { banks?: string[]; status?: string; sort?: string; from?: string; to?: string }) {
  selectedBanks.value = value.banks ?? []
  selectedStatus.value = value.status ?? ''
  selectedSort.value = value.sort ?? 'date_desc'
  from.value = value.from ?? ''
  to.value = value.to ?? ''
}

async function onInvoiceUpdated() {
  await load()
  if (selectedBankInvoice.value) {
    const updated = allBankInvoices.value.find((b) => b.id === selectedBankInvoice.value!.id)
    selectedBankInvoice.value = updated ?? null
  }
}

function formatMonthYear(monthYear: string) {
  if (!monthYear || !monthYear.includes('-')) return monthYear
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  return `${capitalizedMonth} / ${year}`
}

function formatCardSubtitle(bankInv: BankInvoice) {
  const count = bankInv.cardsCount
  const digits = bankInv.cardDigitsList.length > 0
    ? bankInv.cardDigitsList.map((d) => `•••• ${d}`).join(', ')
    : ''
  if (count === 1) {
    return digits ? `1 cartão (${digits})` : '1 cartão'
  }
  return digits ? `${count} cartões (${digits})` : `${count} cartões`
}

</script>