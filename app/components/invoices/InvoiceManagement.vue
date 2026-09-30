<template>
  <div class="flex flex-col gap-5">
    <!-- Toolbar de filtros -->
    <div class="flex flex-wrap items-end gap-3">
      <UiAppSelect
        v-model="selectedYear"
        label="Ano"
        :options="yearOptions"
        placeholder="Todos"
        class="w-32"
      />
      <UiAppSelect
        v-model="selectedMonth"
        label="Mês"
        :options="monthOptions"
        placeholder="Todos"
        class="w-36"
      />
      <UiAppSelect
        v-model="selectedBank"
        label="Banco"
        :options="bankOptions"
        placeholder="Todos"
        class="w-40"
      />
      <UiAppSelect
        v-model="selectedStatus"
        label="Status"
        :options="[
          { value: 'paid', label: 'Pago' },
          { value: 'pending', label: 'Pendente' },
          { value: 'overdue', label: 'Vencido' },
        ]"
        placeholder="Todos"
        class="w-36"
      />
      <UiAppInput
        v-model="searchTerm"
        label="Buscar"
        placeholder="Banco, mês, últimos 4 dígitos…"
        class="w-56"
      />
      <div class="flex items-center gap-2">
        <UiAppButton
          size="sm"
          variant="secondary"
          @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
        >
          Ordem: {{ sortOrder === 'desc' ? 'recente ↓' : 'antiga ↑' }}
        </UiAppButton>
        <UiAppButton
          size="sm"
          variant="ghost"
          @click="resetFilters"
        >Limpar</UiAppButton>
        <UiAppButton
          v-if="selectedKeys.length > 0"
          size="sm"
          variant="danger"
          @click="openBulkDelete = true"
        >
          Excluir ({{ selectedKeys.length }})
        </UiAppButton>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UiAppCard title="Faturado">
        <p class="text-xl font-bold text-highlighted">{{ formatMoney(stats.totalFaturado) }}</p>
      </UiAppCard>
      <UiAppCard title="Faturas">
        <p class="text-xl font-bold text-highlighted">{{ stats.totalInvoices }}</p>
      </UiAppCard>
      <UiAppCard title="Compras">
        <p class="text-xl font-bold text-highlighted">{{ formatMoney(stats.totalPurchases) }}</p>
      </UiAppCard>
      <UiAppCard title="Média / fatura">
        <p class="text-xl font-bold text-highlighted">{{ formatMoney(stats.averageInvoice) }}</p>
      </UiAppCard>
    </div>

    <!-- Lista agrupada por banco + mês -->
    <div
      v-if="consolidated.length === 0"
      class="rounded-2xl bg-elevated border border-default px-6 py-10 text-center"
    >
      <Icon
        name="lucide:calendar"
        class="mx-auto h-10 w-10 text-slate-400"
      />
      <p class="mt-3 text-sm font-extrabold text-default">
        Nenhuma fatura encontrada para os filtros selecionados.
      </p>
    </div>

    <div
      v-for="bankInv in consolidated"
      :key="bankInv.key"
      class="rounded-2xl bg-elevated border border-default p-4 shadow-xs"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <input
            type="checkbox"
            class="h-4 w-4 accent-brand-500 cursor-pointer"
            :checked="selectedKeys.includes(bankInv.key)"
            :aria-label="`Selecionar ${bankInv.bankName} ${bankInv.monthYear}`"
            @change="toggleSelect(bankInv.key)"
          >
          <div class="min-w-0">
            <p class="text-sm font-extrabold text-highlighted flex items-center gap-2">
              <UiBankLogo :bank-name="bankInv.bankName" class="h-4.5 w-4.5" />
              {{ bankInv.bankName }}
            </p>
            <p class="text-xs text-muted font-bold mt-0.5">
              {{ monthLabel(bankInv.monthYear) }} · {{ bankInv.cards.length }} cartão{{ bankInv.cards.length === 1 ? '' : 'ões' }}
              <span v-if="bankInv.invoices[0]?.dueDate" class="ml-1 text-muted font-extrabold">
                · Venc: {{ formatDateShort(bankInv.invoices[0].dueDate) }}
              </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span :class="['inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold shadow-xs', getInvoiceStatusInfo(bankInv.invoices[0]).badgeClass]">
            {{ getInvoiceStatusInfo(bankInv.invoices[0]).label }}
          </span>
          <span class="text-sm font-extrabold font-mono text-highlighted">{{ formatMoney(bankInv.total) }}</span>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated text-muted transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white cursor-pointer"
            :aria-label="`Abrir fatura ${bankInv.bankName} ${bankInv.monthYear}`"
            @click="openDetail(bankInv)"
          >
            <Icon name="lucide:chevron-right" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Cards do grupo -->
      <div class="mt-3 flex flex-col gap-2">
        <div
          v-for="inv in bankInv.invoices"
          :key="inv.id"
          class="flex items-center justify-between rounded-xl bg-elevated/50 border border-slate-200/60 dark:border-dark-border/40 px-3.5 py-2"
        >
          <NuxtLink
            :to="`/invoices/${inv.id}`"
            class="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            {{ inv.card?.bankName }} •••• {{ inv.card?.last4Digits }} — {{ formatMoney(inv.totalAmount) }}
            <span v-if="inv.dueDate" class="text-slate-500 font-normal text-[11px] ml-1">
              (Venc: {{ formatDateShort(inv.dueDate) }})
            </span>
          </NuxtLink>
          <button
            class="text-xs font-extrabold transition-colors cursor-pointer"
            :class="inv.isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-300 hover:text-emerald-600'"
            @click="togglePaid(inv)"
          >
            {{ inv.isPaid ? 'Pago ✓' : 'Marcar como Pago' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de borrado masivo -->
    <UiAppModal
      :open="openBulkDelete"
      title="Excluir faturas seleccionadas"
      @close="openBulkDelete = false"
    >
      <p class="text-sm text-slate-300">
        Serão excluidas <strong class="text-white">{{ selectedKeys.length }}</strong> faturas ({{ selectedCount }} en total) e seus items. Esta ação não pode ser desfeita.
      </p>
      <div class="mt-4 flex items-center justify-end gap-2">
        <UiAppButton
          variant="ghost"
          @click="openBulkDelete = false"
        >Cancelar</UiAppButton>
        <UiAppButton
          variant="danger"
          :loading="deleting"
          @click="doBulkDelete"
        >Excluir definitivamente</UiAppButton>
      </div>
    </UiAppModal>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { Invoice } from '~/types/Invoice'
import { useInvoices } from '~/composables/useInvoices'
import { useCardStore } from '~/stores/cardStore'

/**
 * Consolidated invoice management: filters, sorting, bulk delete and
 * bank+month grouping. Port of src/components/InvoiceManagement.tsx (React).
 */

interface BankInvoiceConsolidated {
  key: string
  bankName: string
  monthYear: string
  isPaid: boolean
  total: number
  cards: Array<{ last4Digits: string }>
  invoices: Invoice[]
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const { list, togglePaid: apiTogglePaid, bulkDelete } = useInvoices()
const cardStore = useCardStore()

const invoices = ref<Invoice[]>([])
const loading = ref(true)
const error = ref('')

const selectedYear = ref('')
const selectedMonth = ref('')
const selectedBank = ref('')
const selectedStatus = ref('')
const sortOrder = ref<'desc' | 'asc'>('desc')
const searchTerm = ref('')

const selectedKeys = ref<string[]>([])
const openBulkDelete = ref(false)
const deleting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    invoices.value = await list()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao cargar faturas.'
  } finally {
    loading.value = false
  }
}

await Promise.all([load(), cardStore.fetchAll()])

const yearOptions = computed(() => {
  const years = new Set<string>()
  for (const inv of invoices.value) years.add(inv.monthYear.split('-')[0])
  return Array.from(years).sort().map((y) => ({ value: y, label: y }))
})

const monthOptions = computed(() => {
  const months = new Set<string>()
  for (const inv of invoices.value) months.add(inv.monthYear.split('-')[1])
  return Array.from(months).sort().map((m) => ({
    value: m,
    label: MONTH_NAMES[parseInt(m, 10) - 1] || m,
  }))
})

const bankOptions = computed(() => {
  const banks = new Set<string>()
  for (const inv of invoices.value) banks.add(inv.card?.bankName || 'Outros')
  return Array.from(banks).sort().map((b) => ({ value: b, label: b }))
})

const consolidated = computed<BankInvoiceConsolidated[]>(() => {
  const map = new Map<string, BankInvoiceConsolidated>()

  const filtered = invoices.value.filter((inv) => {
    const [year, month] = inv.monthYear.split('-')
    if (selectedYear.value && year !== selectedYear.value) return false
    if (selectedMonth.value && month !== selectedMonth.value) return false
    if (selectedBank.value && (inv.card?.bankName || 'Outros') !== selectedBank.value) return false
    if (selectedStatus.value === 'paid' && !inv.isPaid) return false
    if (selectedStatus.value === 'unpaid' && inv.isPaid) return false
    if (searchTerm.value.trim()) {
      const term = searchTerm.value.trim().toLowerCase()
      const bank = (inv.card?.bankName || '').toLowerCase()
      const monthY = inv.monthYear.toLowerCase()
      const cardMatch = (inv.card?.last4Digits || '').includes(term)
      if (!bank.includes(term) && !monthY.includes(term) && !cardMatch) return false
    }
    return true
  })

  for (const inv of filtered) {
    const bankName = inv.card?.bankName || 'Outros'
    const key = `${bankName}_${inv.monthYear}`
    const existing = map.get(key)
    if (existing) {
      existing.invoices.push(inv)
      existing.total = Math.round((existing.total + Number(inv.totalAmount || 0)) * 100) / 100
      existing.isPaid = existing.isPaid && inv.isPaid
      if (inv.card && !existing.cards.some((c) => c.last4Digits === inv.card!.last4Digits)) {
        existing.cards.push({ last4Digits: inv.card.last4Digits })
      }
    } else {
      map.set(key, {
        key,
        bankName,
        monthYear: inv.monthYear,
        isPaid: inv.isPaid,
        total: Number(inv.totalAmount || 0),
        cards: inv.card ? [{ last4Digits: inv.card.last4Digits }] : [],
        invoices: [inv],
      })
    }
  }

  const arr = Array.from(map.values())
  const dir = sortOrder.value === 'desc' ? -1 : 1
  return arr.sort((a, b) => {
    const monthCmp = a.monthYear.localeCompare(b.monthYear) * dir
    if (monthCmp !== 0) return monthCmp
    return a.bankName.localeCompare(b.bankName) * dir
  })
})

const stats = computed(() => {
  const totalFaturado = consolidated.value.reduce((sum, g) => sum + g.total, 0)
  const totalInvoices = consolidated.value.reduce((sum, g) => sum + g.invoices.length, 0)
  const totalPurchases = consolidated.value.reduce(
    (sum, g) => sum + g.invoices.reduce((s, inv) => s + Number(inv.purchasesAmount || 0), 0),
    0,
  )
  return {
    totalFaturado: Math.round(totalFaturado * 100) / 100,
    totalInvoices,
    totalPurchases: Math.round(totalPurchases * 100) / 100,
    averageInvoice: totalInvoices > 0 ? Math.round((totalFaturado / totalInvoices) * 100) / 100 : 0,
  }
})

const selectedCount = computed(() =>
  consolidated.value.filter((g) => selectedKeys.value.includes(g.key)).reduce((sum, g) => sum + g.invoices.length, 0),
)

function resetFilters() {
  selectedYear.value = ''
  selectedMonth.value = ''
  selectedBank.value = ''
  selectedStatus.value = ''
  searchTerm.value = ''
  sortOrder.value = 'desc'
  selectedKeys.value = []
}

function toggleSelect(key: string) {
  if (selectedKeys.value.includes(key)) {
    selectedKeys.value = selectedKeys.value.filter((k) => k !== key)
  } else {
    selectedKeys.value = [...selectedKeys.value, key]
  }
}

function monthLabel(monthYear: string) {
  const [year, month] = monthYear.split('-')
  const mIdx = parseInt(month, 10) - 1
  return `${MONTH_NAMES[mIdx] || month} ${year}`
}

async function togglePaid(inv: Invoice) {
  try {
    await apiTogglePaid(inv.id, !inv.isPaid)
    inv.isPaid = !inv.isPaid
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao alternar estado de pago.'
  }
}

function openDetail(bankInv: BankInvoiceConsolidated) {
  if (bankInv.invoices.length === 1) {
    navigateTo(`/invoices/${bankInv.invoices[0].id}`)
    return
  }
  // Multiple invoices for the same bank+month: open the first (list shows all)
  navigateTo(`/invoices/${bankInv.invoices[0].id}`)
}

async function doBulkDelete() {
  const ids = consolidated.value
    .filter((g) => selectedKeys.value.includes(g.key))
    .flatMap((g) => g.invoices.map((inv) => inv.id))
  if (ids.length === 0) return
  deleting.value = true
  try {
    await bulkDelete(ids)
    selectedKeys.value = []
    openBulkDelete.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao eliminar faturas.'
  } finally {
    deleting.value = false
  }
}
</script>