<template>
  <div class="flex flex-col gap-4">
    <UiAppInput
      v-model="local.description"
      label="Descrição"
      placeholder="Ex: Netflix"
    />

    <UiAppInput
      v-model.number="local.amount"
      label="Valor"
      type="number"
      step="0.01"
      min="0"
      placeholder="0.00"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <UiAppInput
        v-model="local.startMonthYear"
        label="Mês de início"
        type="month"
      />
      <UiAppInput
        v-model="local.endMonthYear"
        label="Mês de término (opcional)"
        type="month"
      />
    </div>

    <p
      v-if="errorMessage"
      role="alert"
      class="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400"
    >{{ errorMessage }}</p>

    <div class="flex items-center justify-end gap-3 pt-1">
      <button
        type="button"
        class="rounded-2xl border border-accented bg-elevated px-4.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer"
        @click="$emit('cancel')"
      >Cancelar</button>
      <button
        type="button"
        class="rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 px-5 py-2.5 text-xs font-extrabold !text-white shadow-md shadow-brand-500/20 transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer disabled:opacity-50"
        :disabled="saving || !canSubmit"
        @click="onSubmit"
      >{{ submitLabel }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RecurringItem } from '~/types/RecurringItem'

export interface RecurringFormValue {
  description: string
  amount: number | ''
  startMonthYear: string
  endMonthYear: string
}

const props = defineProps<{
  /** Modo edição: pré-preenche o form */
  initial?: RecurringItem | null
  saving?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  submit: [value: RecurringFormValue]
  cancel: []
}>()

const submitLabel = computed(() => (props.initial ? 'Salvar' : 'Criar'))

function emptyForm(): RecurringFormValue {
  return { description: '', amount: '', startMonthYear: '', endMonthYear: '' }
}

const local = ref<RecurringFormValue>(emptyForm())

watch(
  () => props.initial,
  (item) => {
    local.value = item
      ? {
          description: item.description,
          amount: Number(item.amount),
          startMonthYear: item.startMonthYear,
          endMonthYear: item.endMonthYear ?? '',
        }
      : emptyForm()
  },
  { immediate: true },
)

const canSubmit = computed(
  () => Boolean(local.value.description.trim()) && Number(local.value.amount) > 0 && Boolean(local.value.startMonthYear),
)

function onSubmit() {
  if (!canSubmit.value || props.saving) return
  emit('submit', { ...local.value })
}
</script>
