<template>
  <div
    role="button"
    tabindex="0"
    class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-elevated border border-default px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-dark-card/80 shadow-xs"
    :aria-label="`Ver detalhe de ${item.description}`"
    @click="onRowClick"
    @keydown.enter="onRowClick"
  >
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2">
        <p class="truncate text-sm font-extrabold text-default">{{ item.description }}</p>
        <UiAppBadge
          v-if="item.isRecurring"
          tone="blue"
          title="Se repete automaticamente em cada fatura"
        >Recorrente</UiAppBadge>
      </div>
      <p class="mt-0.5 text-xs font-bold text-muted">
        {{ cardLabel }}
        <span v-if="item.totalInstallments > 1"> · Parcela {{ item.currentInstallment }}/{{ item.totalInstallments }}</span>
      </p>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm font-extrabold font-mono text-highlighted">{{ formatMoney(item.originalAmount) }}</span>
      <button
        v-if="item.isRecurring"
        type="button"
        class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors hover:bg-brand-500/20"
        title="Gerenciar recorrência"
        aria-label="Gerenciar recorrência"
        @click.stop="onToggleRecurring"
      >
        <Icon name="lucide:repeat" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItem } from '~/types/InvoiceItem'
import type { Card } from '~/types/Card'

const props = defineProps<{
  item: InvoiceItem
  invoice: Invoice
  card?: Card | null
}>()

const emit = defineEmits<{
  'set-recurring': [item: InvoiceItem]
  'item-click': [item: InvoiceItem]
}>()

const cardLabel = computed(() => {
  const c = props.card ?? props.invoice?.card
  return c ? `${c.bankName} •••• ${c.last4Digits}` : ''
})

function onRowClick() {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  emit('item-click', props.item)
}

function onToggleRecurring() {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  emit('set-recurring', props.item)
}

</script>