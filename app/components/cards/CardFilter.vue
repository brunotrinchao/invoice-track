<template>
  <div class="w-full">
    <label
      v-if="label"
      class="mb-1 block text-xs font-medium text-slate-400"
    >{{ label }}</label>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        :aria-pressed="isSelected(card.id)"
        :class="chipClasses(card.id)"
        @click="toggle(card.id)"
      >
        {{ card.bankName }} {{ card.last4Digits }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '~/types/Card'

const props = defineProps<{
  /** CardIds seleccionados. Vacío = todas las tarjetas. */
  modelValue?: string[]
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { modelValue = [], label = 'Cartões' } = props

const cards = ref<Card[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/cards')
    if (!res.ok) throw new Error(`GET /api/cards -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; cards: Card[] }
    cards.value = data.cards
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar los cartões'
  } finally {
    loading.value = false
  }
}

await load()

function isSelected(id: string) {
  return modelValue.includes(id)
}

function toggle(id: string) {
  const next = isSelected(id)
    ? modelValue.filter((v) => v !== id)
    : [...modelValue, id]
  emit('update:modelValue', next)
}

function chipClasses(id: string) {
  return isSelected(id)
    ? 'rounded-full border border-brand-500 bg-brand-500/15 px-3 py-1 text-xs font-medium text-brand-600'
    : 'rounded-full border border-dark-border bg-dark-card px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-brand-500/50 hover:text-slate-200'
}
</script>