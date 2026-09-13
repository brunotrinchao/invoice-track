<template>
  <div class="flex items-center justify-between gap-3 rounded-xl bg-dark-card px-3.5 py-2.5">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2">
        <p class="truncate text-sm font-medium text-slate-200">{{ item.description }}</p>
        <AppBadge
          v-if="item.isRecurring"
          tone="blue"
          title="Se repite automaticamente en cada fatura"
        >Recorrente</AppBadge>
      </div>
      <p class="mt-0.5 text-xs text-dark-muted">
        {{ cardLabel }}
        <span v-if="item.totalInstallments > 1"> · Parcela {{ item.currentInstallment }}/{{ item.totalInstallments }}</span>
      </p>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-white">{{ formatMoney(item.originalAmount) }}</span>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        :class="item.isRecurring
          ? 'bg-brand-500/10 text-brand-500 hover:bg-brand-500/20'
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'"
        :title="item.isRecurring ? 'Desativar recorrência' : 'Marcar como recorrente'"
        :aria-label="item.isRecurring ? 'Desativar recorrência' : 'Marcar como recorrente'"
        @click="onToggleRecurring"
      >
        <Icon name="lucide:repeat" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import type { Card } from '~/types/Card'

const props = defineProps<{
  item: InvoiceItem
  invoice: Invoice
  card?: Card | null
}>()

const emit = defineEmits<{ 'set-recurring': [item: InvoiceItem] }>()

const { item, invoice, card } = props

const cardLabel = computed(() => {
  const c = card ?? invoice.card
  return c ? `${c.bankName} ${c.last4Digits}` : ''
})

function onToggleRecurring() {
  emit('set-recurring', item)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}
</script>