<template>
  <div class="flex flex-col gap-5">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">{{ monthLabel }}</h1>
        <p class="text-sm text-muted flex items-center gap-2">
          <span>{{ cardLabel }}</span>
          <span v-if="invoice.dueDate">• Vencimento: {{ formatDateShort(invoice.dueDate) }}</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          :class="[
            'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-extrabold',
            statusInfo.badgeClass
          ]"
        >{{ statusInfo.label }}</span>
        <UiAppButton
          size="sm"
          variant="secondary"
          @click="emit('toggle-paid')"
        >{{ invoice.isPaid ? 'Marcar não paga' : 'Pagar' }}</UiAppButton>
        <UiAppButton
          size="sm"
          variant="secondary"
          @click="emit('edit')"
        >Editar</UiAppButton>
        <UiAppButton
          size="sm"
          variant="danger"
          @click="emit('delete')"
        >Excluir</UiAppButton>
      </div>
    </header>

    <section class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl glass-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Total</p>
        <p class="mt-1 text-lg font-bold text-highlighted">{{ formatMoney(invoice.totalAmount) }}</p>
      </div>
      <div class="rounded-xl glass-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Compras</p>
        <p class="mt-1 text-lg font-bold text-highlighted">{{ formatMoney(invoice.purchasesAmount) }}</p>
      </div>
      <div class="rounded-xl glass-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Taxas e encargos</p>
        <p class="mt-1 text-lg font-bold text-highlighted">{{ formatMoney(invoice.feesAmount) }}</p>
      </div>
      <div class="rounded-xl glass-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Créditos</p>
        <p class="mt-1 text-lg font-bold text-highlighted">{{ formatMoney(invoice.creditsAmount) }}</p>
      </div>
    </section>

    <UiAppCard title="Items">
      <div class="flex flex-col gap-2">
        <div
          v-if="invoice.items.length === 0"
          class="rounded-xl bg-elevated px-4 py-3 text-sm text-dark-muted"
        >
          Sem items nesta fatura.
        </div>
        <InvoicesInvoiceItemRow
          v-for="item in invoice.items"
          :key="item.id"
          :item="item"
          :invoice="invoice"
          :card="card"
          @set-recurring="emit('set-recurring', $event)"
          @item-click="emit('item-click', $event)"
        />
      </div>
    </UiAppCard>

    <UiAppCard
      v-if="invoice.fees.length"
      title="Taxas e encargos"
    >
      <div class="flex flex-col gap-2">
        <div
          v-for="fee in invoice.fees"
          :key="fee.id"
          class="flex items-center justify-between rounded-xl glass-card px-3.5 py-2.5"
        >
          <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ fee.description }}</p>
          <span class="text-sm font-semibold text-highlighted">{{ formatMoney(fee.amount) }}</span>
        </div>
      </div>
    </UiAppCard>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import { computed } from 'vue'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import type { Card } from '~/types/Card'
import { getInvoiceStatusInfo, formatDateShort } from '~/utils/bankInvoice'

const props = defineProps<{
  invoice: Invoice
  card?: Card | null
}>()

const emit = defineEmits<{
  'set-recurring': [item: InvoiceItem]
  'item-click': [item: InvoiceItem]
  'toggle-paid': []
  edit: []
  delete: []
}>()

const { invoice, card } = props

const statusInfo = computed(() => getInvoiceStatusInfo(invoice))

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

</script>