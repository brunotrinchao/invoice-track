<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="invoice.items.length === 0"
      class="rounded-xl bg-dark-card px-4 py-3 text-sm text-dark-muted"
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
    />
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
</script>