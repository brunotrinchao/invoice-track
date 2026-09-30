<template>
  <div class="flex flex-col gap-1">
    <span class="text-xs font-extrabold uppercase tracking-wide text-muted">Período</span>
    <Datepicker
      v-model="pickedMonth"
      month-picker
      auto-apply
      :clearable="true"
      :enable-time-picker="false"
      :locale="ptBR"
      select-text="Selecionar"
      cancel-text="Cancelar"
      placeholder="Todos os meses"
      class="min-w-[180px]"
      @update:model-value="onMonthPicked"
    />
  </div>
</template>

<script setup lang="ts">
import { VueDatePicker as Datepicker } from '@vuepic/vue-datepicker'
import { ptBR } from 'date-fns/locale'

interface MonthValue {
  month: number
  year: number
  valid?: boolean
}

const props = defineProps<{
  from?: string // "YYYY-MM"
  to?: string // "YYYY-MM"
}>()

const emit = defineEmits<{
  update: [value: { from: string; to: string }]
}>()

const pickedMonth = ref<MonthValue | null>(null)

function syncFromProps() {
  const f = props.from ?? ''
  const t = props.to ?? ''
  if (f && f === t) {
    // Mês específico selecionado (externamente ou por "Limpar")
    const [y, m] = f.split('-').map(Number)
    if (y && m) {
      pickedMonth.value = { month: m - 1, year: y }
      return
    }
  }
  pickedMonth.value = null
}

function onMonthPicked(modelValue: MonthValue | null) {
  if (!modelValue) {
    emit('update', { from: '', to: '' })
    return
  }
  const my = `${modelValue.year}-${String(modelValue.month + 1).padStart(2, '0')}`
  emit('update', { from: my, to: my })
}

watch(
  () => [props.from, props.to],
  () => syncFromProps(),
  { immediate: true },
)
</script>
