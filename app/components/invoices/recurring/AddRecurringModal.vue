<template>
  <AppModal
    :open="open"
    title="Nueva compra recorrente"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <AppSelect
        v-model="cardId"
        label="Cartão"
        :options="cardOptions"
        placeholder="Selecciona un cartão"
      />

      <AppInput
        v-model="description"
        label="Descripción"
        placeholder="Ej: Netflix"
      />

      <AppInput
        v-model="amount"
        label="Valor"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AppInput
          v-model="startMonthYear"
          label="Mês de início"
          type="month"
        />
        <AppInput
          v-model="endMonthYear"
          label="Mês de término (opcional)"
          type="month"
        />
      </div>

      <p
        v-if="error"
        class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
      >{{ error }}</p>

      <div class="flex justify-end gap-2">
        <AppButton
          variant="secondary"
          @click="emit('close')"
        >Cancelar</AppButton>
        <AppButton
          :loading="loading"
          :disabled="!canSubmit"
          @click="onSubmit"
        >Crear</AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { Card } from '~/types/Card'
import { useRecurring } from '~/composables/useRecurring'

interface AppSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  open: boolean
  cards: Card[]
}>()

const emit = defineEmits<{
  close: []
  submitted: [recurringId: string]
}>()

const { open, cards } = props

const { createRecurring } = useRecurring()

const loading = ref(false)
const error = ref('')

const cardId = ref('')
const description = ref('')
const amount = ref('')
const startMonthYear = ref('')
const endMonthYear = ref('')

watch(
  () => open,
  () => {
    if (!open) return
    cardId.value = ''
    description.value = ''
    amount.value = ''
    startMonthYear.value = ''
    endMonthYear.value = ''
    error.value = ''
  },
  { immediate: true },
)

const cardOptions = computed<AppSelectOption[]>(() =>
  cards.map((card) => ({
    value: card.id,
    label: `${card.bankName} ${card.last4Digits}`,
  })),
)

const canSubmit = computed(() =>
  cardId.value && description.value.trim() && Number(amount.value) > 0 && startMonthYear.value,
)

async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    const recurring = await createRecurring({
      cardId: cardId.value,
      description: description.value.trim(),
      amount: Number(amount.value),
      startMonthYear: startMonthYear.value,
      endMonthYear: endMonthYear.value || null,
    })
    emit('submitted', recurring.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear la recorrência'
  } finally {
    loading.value = false
  }
}
</script>