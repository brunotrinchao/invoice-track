<template>
  <div class="flex flex-col gap-5">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">{{ monthLabel }}</h1>
        <p class="text-sm text-dark-muted">{{ cardLabel }}</p>
      </div>
      <AppBadge
        :tone="invoice.isPaid ? 'green' : 'amber'"
      >{{ invoice.isPaid ? 'Pagada' : 'Pendiente' }}</AppBadge>
    </header>

    <section class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl bg-dark-card px-4 py-3">
        <p class="text-xs uppercase tracking-wide text-dark-muted">Total</p>
        <p class="mt-1 text-lg font-bold text-white">{{ formatMoney(invoice.totalAmount) }}</p>
      </div>
      <div class="rounded-xl bg-dark-card px-4 py-3">
        <p class="text-xs uppercase tracking-wide text-dark-muted">Compras</p>
        <p class="mt-1 text-lg font-bold text-white">{{ formatMoney(invoice.purchasesAmount) }}</p>
      </div>
      <div class="rounded-xl bg-dark-card px-4 py-3">
        <p class="text-xs uppercase tracking-wide text-dark-muted">Comisiones</p>
        <p class="mt-1 text-lg font-bold text-white">{{ formatMoney(invoice.feesAmount) }}</p>
      </div>
      <div class="rounded-xl bg-dark-card px-4 py-3">
        <p class="text-xs uppercase tracking-wide text-dark-muted">Créditos</p>
        <p class="mt-1 text-lg font-bold text-white">{{ formatMoney(invoice.creditsAmount) }}</p>
      </div>
    </section>

    <AppCard title="Items">
      <InvoiceList
        :invoice="invoice"
        :card="card"
        @set-recurring="emit('set-recurring', $event)"
      />
    </AppCard>

    <AppCard
      v-if="invoice.fees.length"
      title="Comisiones"
    >
      <div class="flex flex-col gap-2">
        <div
          v-for="fee in invoice.fees"
          :key="fee.id"
          class="flex items-center justify-between rounded-xl bg-dark-card px-3.5 py-2.5"
        >
          <p class="text-sm font-medium text-slate-200">{{ fee.description }}</p>
          <span class="text-sm font-semibold text-white">{{ formatMoney(fee.amount) }}</span>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import type { Card } from '~/types/Card'

const props = defineProps<{
  invoice: Invoice
  card?: Card | null
}>()

const emit = defineEmits<{ 'set-recurring': [item: InvoiceItem] }>()

const { invoice, card } = props

const monthLabel = computed(() => {
  const [year, month] = invoice.monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const cardLabel = computed(() => {
  const c = card ?? invoice.card
  return c ? `${c.bankName} ${c.last4Digits}` : 'Fatura'
})

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}
</script>