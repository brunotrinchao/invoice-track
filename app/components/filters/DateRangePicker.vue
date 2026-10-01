<template>
  <div class="flex flex-col gap-1">
    <span class="text-xs font-extrabold uppercase tracking-wide text-muted">Período</span>

    <!-- Mobile: picker nativo do OS (thumb-friendly, sem overlay custom) -->
    <div v-if="isMobile" class="relative flex items-center">
      <input
        v-model="nativeMonth"
        type="month"
        aria-label="Mês da fatura"
        class="w-full rounded-xl border border-accented bg-elevated px-3.5 py-2.5 text-xs font-extrabold text-highlighted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-h-[44px]"
        :class="nativeMonth ? 'pr-9' : ''"
        @change="onNativeChange"
      >
      <button
        v-if="nativeMonth"
        type="button"
        aria-label="Limpar período"
        class="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
        @click="clearNative"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
      </button>
    </div>

    <!-- Desktop: vue-datepicker custom -->
    <Datepicker
      v-else
      v-model="pickedMonth"
      month-picker
      auto-apply
      :clearable="true"
      :enable-time-picker="false"
      :locale="ptBR"
      select-text="Selecionar"
      cancel-text="Cancelar"
      placeholder="Todos os meses"
      class="w-full min-w-[180px]"
      @update:model-value="onMonthPicked"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
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
const nativeMonth = ref('')

/** Mobile usa <input type="month"> nativo (picker do OS); desktop usa o custom */
const isMobile = ref(false)
let mq: MediaQueryList | null = null
function syncMq() {
  isMobile.value = mq?.matches ?? false
}
onMounted(() => {
  mq = window.matchMedia('(max-width: 639px)')
  syncMq()
  mq.addEventListener('change', syncMq)
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', syncMq)
})

function syncFromProps() {
  const f = props.from ?? ''
  const t = props.to ?? ''
  if (f && f === t) {
    const [y, m] = f.split('-').map(Number)
    if (y && m) {
      pickedMonth.value = { month: m - 1, year: y }
      nativeMonth.value = f
      return
    }
  }
  pickedMonth.value = null
  nativeMonth.value = ''
}

function onMonthPicked(modelValue: MonthValue | null) {
  if (!modelValue) {
    emit('update', { from: '', to: '' })
    return
  }
  const my = `${modelValue.year}-${String(modelValue.month + 1).padStart(2, '0')}`
  emit('update', { from: my, to: my })
}

function onNativeChange() {
  const v = nativeMonth.value // "YYYY-MM" nativo
  emit('update', v ? { from: v, to: v } : { from: '', to: '' })
}

function clearNative() {
  nativeMonth.value = ''
  emit('update', { from: '', to: '' })
}

watch(
  () => [props.from, props.to],
  () => syncFromProps(),
  { immediate: true },
)
</script>
