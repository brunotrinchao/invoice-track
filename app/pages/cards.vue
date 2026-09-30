<template>
  <div class="flex flex-col gap-6">
    <header>
      <h1 class="text-2xl font-bold text-highlighted">Cartões cadastrados ({{ cardStore.cards.length }})</h1>
      <p class="text-sm text-muted">
        Gerencie os cartões identificados automaticamente pelas faturas.
      </p>
    </header>

    <div
      v-if="cardStore.error"
      class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ cardStore.error }}</div>

    <p
      v-if="cardStore.cards.length === 0"
      class="rounded-2xl bg-dark-card px-6 py-10 text-center"
    >
      <Icon
        name="lucide:credit-card"
        class="mx-auto h-12 w-12 text-slate-400"
      />
      <span class="mt-3 block text-lg font-bold text-highlighted">Nenhum cartão cadastrado ainda</span>
      <span class="text-xs text-muted">Os cartões são criados automaticamente ao importar uma fatura.</span>
    </p>

    <div
      v-else
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      <CardsCreditCardWidget
        v-for="card in cardStore.cards"
        :key="card.id"
        :card="card"
        :selected="selectedCardIds.includes(card.id)"
        @delete="onDeleteCard"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardStore } from '~/stores/cardStore'

const cardStore = useCardStore()

const selectedCardIds = ref<string[]>([])

await cardStore.fetchAll()

async function onDeleteCard(cardId: string) {
  const ok = typeof window !== 'undefined' && window.confirm(
    'Excluir este cartão? As faturas associadas serão excluidas também.',
  )
  if (!ok) return
  try {
    await cardStore.remove(cardId)
  } catch (e) {
    cardStore.error = e instanceof Error ? e.message : 'Erro ao eliminar cartão.'
  }
}
</script>