<template>
  <div class="flex flex-col gap-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Faturas</h1>
        <p class="text-sm text-dark-muted">{{ invoices.length }} faturas</p>
      </div>
      <AppButton @click="openAddModal = true">
        <Icon
          name="lucide:plus"
          class="h-4 w-4"
        />
        Nueva recurrente
      </AppButton>
    </header>

    <div
      v-if="error"
      class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ error }}</div>

    <div
      v-else-if="loading"
      class="py-8 text-center text-sm text-dark-muted"
    >Cargando…</div>

    <template v-else>
      <div class="flex items-center gap-3">
        <AppSelect
          v-model="filterCardId"
          label="Filtrar por cartão"
          :options="filterOptions"
          placeholder="Todas"
          class="max-w-xs"
        />
      </div>

      <div class="flex flex-col gap-2">
        <NuxtLink
          v-for="inv in filteredInvoices"
          :key="inv.id"
          :to="`/invoices/${inv.id}`"
          class="flex items-center justify-between rounded-xl bg-dark-card px-4 py-3 transition-colors hover:border-brand-500/50"
        >
          <div class="flex min-w-0 flex-1 flex-col">
            <p class="text-sm font-semibold text-white">{{ monthLabel(inv.monthYear) }}</p>
            <p class="text-xs text-dark-muted">{{ cardLabel(inv) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <AppBadge :tone="inv.isPaid ? 'green' : 'amber'">{{ inv.isPaid ? 'Pagada' : 'Pendiente' }}</AppBadge>
            <span class="text-sm font-semibold text-white">{{ formatMoney(inv.totalAmount) }}</span>
          </div>
        </NuxtLink>
      </div>

      <p
        v-if="filteredInvoices.length === 0"
        class="py-8 text-center text-sm text-dark-muted"
      >Sin faturas para este filtro.</p>
    </template>

    <AddRecurringModal
      :open="openAddModal"
      :cards="cardStore.cards"
      @close="openAddModal = false"
      @submitted="onRecurringCreated"
    />
  </div>
</template>

<script setup lang="ts">
import type { Invoice } from '~/types/Invoice'
import { useInvoices } from '~/composables/useInvoices'
import { useCardStore } from '~/stores/cardStore'

const { list } = useInvoices()
const cardStore = useCardStore()

const loading = ref(true)
const error = ref('')
const invoices = ref<Invoice[]>([])
const filterCardId = ref('')
const openAddModal = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    invoices.value = await list()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar faturas'
  } finally {
    loading.value = false
  }
}

await Promise.all([load(), cardStore.fetchAll()])

const filterOptions = computed(() =>
  cardStore.cards.map((card) => ({
    value: card.id,
    label: `${card.bankName} ${card.last4Digits}`,
  })),
)

const filteredInvoices = computed(() => {
  if (!filterCardId.value) return invoices.value
  return invoices.value.filter((inv) => inv.cardId === filterCardId.value)
})

function onRecurringCreated() {
  openAddModal.value = false
}

function monthLabel(monthYear: string) {
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function cardLabel(invoice: Invoice) {
  const card = invoice.card ?? cardStore.cards.find((c) => c.id === invoice.cardId)
  return card ? `${card.bankName} ${card.last4Digits}` : 'Fatura'
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}
</script>