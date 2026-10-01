<template>
  <div
    class="relative flex flex-col justify-between rounded-2xl p-5 shadow-lg transition-transform duration-200 hover-lift"
    :style="{ background: gradient }"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UiBankLogo :bank-name="card.bankName" size-class="h-6 w-6" />
        <span class="text-xs font-semibold text-white/90">{{ card.bankName }}</span>
      </div>
      <UiCardBrandLogo :brand="card.brand" variant="flat-rounded" size-class="h-7 w-10" />
    </div>
    <p class="mt-4 font-mono text-lg font-bold tracking-widest text-white">
      •••• {{ card.last4Digits }}
    </p>
    <div class="mt-2 flex items-center justify-between">
      <span class="text-xs font-bold uppercase tracking-widest text-white/80">{{ card.brand }}</span>
      <div class="flex items-center gap-2">
        <span
          v-if="selected"
          class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/30"
        >
          <Icon
            name="lucide:check"
            class="h-3 w-3 text-brand-500"
          />
        </span>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-brand-500 hover:text-white cursor-pointer"
          :aria-label="`Recorrentes do cartão ${card.bankName}`"
          @click="emit('recurring', card.id)"
        >
          <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
        </button>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
          :aria-label="`Excluir cartão ${card.bankName} •••• ${card.last4Digits}`"
          @click="emit('delete', card.id)"
        >
          <Icon
            name="lucide:trash-2"
            class="h-3.5 w-3.5"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '~/types/Card'

/**
 * Credit card visual widget with selection state and delete action.
 * Port of src/components/CreditCardWidget.tsx (React).
 */

const BANK_COLORS: Record<string, [string, string]> = {
  'Mercado Pago': ['#00b1ea', '#0e7490'],
  'Nubank': ['#8a05be', '#5b21b6'],
  'Itaú': ['#ff6200', '#c2410c'],
  'Bradesco': ['#cc092f', '#991b1b'],
  'Santander': ['#ec0000', '#b91c1c'],
  'Banco Inter': ['#ff7a00', '#ea580c'],
  'C6 Bank': ['#38bdf8', '#0369a1'],
  'XP Bank': ['#e8a317', '#b45309'],
  'PicPay': ['#11c76f', '#047857'],
  'BTG Pactual': ['#2563eb', '#1d4ed8'],
  'Atacadão' : ['#2563eb', '#1d4ed8']
}

const props = defineProps<{
  card: Card
  selected?: boolean
}>()

const emit = defineEmits<{ delete: [cardId: string]; recurring: [cardId: string] }>()

const gradient = computed(() => {
  const [from, to] = BANK_COLORS[props.card.bankName] ?? ['#334155', '#1e293b']
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
})
</script>