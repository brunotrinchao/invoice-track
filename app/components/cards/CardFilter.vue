<template>
  <div class="w-full">
    <label
      v-if="label"
      class="mb-1 block text-xs font-medium text-slate-300"
    >{{ label }}</label>
    <p
      v-if="loading"
      class="text-xs text-slate-300"
    >Cargando cartões…</p>
    <p
      v-else-if="error"
      class="text-xs text-red-400"
    >{{ error }}</p>
    <p
      v-else-if="cards.length === 0"
      class="text-xs text-slate-300"
    >Sem cartões.</p>
    <div
      v-else
      class="flex flex-wrap gap-2"
    >
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
import { apiUrl } from '~/utils/api'
import type { Card } from '~/types/Card'

const props = defineProps<{
  /** CardIds seleccionados. Vacío = todas las tarjetas. */
  modelValue?: string[]
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { label = 'Cartões' } = props

const cards = ref<Card[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(apiUrl('/api/cards'))
    if (!res.ok) throw new Error(`GET /api/cards -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; cards: Card[] }
    cards.value = data.cards
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao cargar os cartões'
  } finally {
    loading.value = false
  }
}

await load()

function isSelected(id: string) {
  return (props.modelValue ?? []).includes(id)
}

function toggle(id: string) {
  const current = props.modelValue ?? []
  const next = isSelected(id)
    ? current.filter((v) => v !== id)
    : [...current, id]
  emit('update:modelValue', next)
}

function chipClasses(id: string) {
  return isSelected(id)
    ? 'cursor-pointer inline-flex min-h-11 min-w-9 items-center justify-center rounded-full border border-brand-500 bg-brand-500/15 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors duration-200 hover:bg-brand-500/25'
    : 'cursor-pointer inline-flex min-h-11 min-w-9 items-center justify-center rounded-full border border-dark-border bg-dark-card px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors duration-200 hover:border-brand-500/50 hover:text-slate-200'
}
</script>
