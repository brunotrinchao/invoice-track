<template>
  <div class="flex flex-col items-stretch gap-3.5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 rounded-2xl border border-default bg-elevated p-4 shadow-xs">
    <FiltersMultiSelect
      label="Bancos"
      v-model="selectedBanks"
      :options="bankOptions"
      placeholder="Todos os bancos"
    />

    <!-- Período: presets pré-determinados (dashboard) OU datepicker de mês (faturas) -->
    <div v-if="periodMode === 'presets'" class="flex flex-col gap-1">
      <span class="text-xs font-extrabold uppercase tracking-wide text-muted">Período</span>
      <UiAppSelect
        v-model="selectedPreset"
        :options="PRESET_OPTIONS"
        class="min-w-[160px]"
        @update:model-value="onPresetChange"
      />
    </div>
    <FiltersDateRangePicker
      v-else
      :from="selectedFrom"
      :to="selectedTo"
      @update="onRangeUpdate"
    />

    <div class="flex flex-col gap-1">
      <span class="text-xs font-extrabold uppercase tracking-wide text-muted">Status</span>
      <UiAppSelect
        v-model="selectedStatus"
        :options="STATUS_OPTIONS"
      />
    </div>

    <div v-if="showSort" class="flex flex-col gap-1">
      <span class="text-xs font-extrabold uppercase tracking-wide text-muted">Ordenar por</span>
      <UiAppSelect
        v-model="selectedSort"
        :options="SORT_OPTIONS"
      />
    </div>

    <button
      type="button"
      class="rounded-xl border border-accented bg-elevated px-3.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white cursor-pointer"
      @click="clear"
    >Limpar</button>

    <!-- Slot p/ ações extras (ex: exportar) — mobile: full-width; desktop: à direita -->
    <div class="ml-auto flex items-end w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'unpaid', label: 'Não pago' },
]

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Mais recentes' },
  { value: 'date_asc', label: 'Mais antigas' },
  { value: 'amount_desc', label: 'Maior valor' },
  { value: 'amount_asc', label: 'Menor valor' },
  { value: 'due_date_asc', label: 'Vencimento mais próximo' },
  { value: 'due_date_desc', label: 'Vencimento mais distante' },
]

const props = withDefaults(
  defineProps<{
    banks: string[]
    bankModel?: string[]
    statusModel?: string
    sortModel?: string
    showSort?: boolean
    from?: string
    to?: string
    /** presets: períodos pré-determinados (dashboard) | month: datepicker de mês (faturas) */
    periodMode?: 'presets' | 'month'
  }>(),
  {
    showSort: false,
    periodMode: 'presets',
  },
)

const emit = defineEmits<{
  update: [value: { banks: string[]; status: string; sort: string; from: string; to: string }]
}>()

const selectedBanks = ref<string[]>([...(props.bankModel ?? [])])
const selectedStatus = ref(props.statusModel ?? '')
const selectedSort = ref(props.sortModel ?? 'date_desc')
const selectedFrom = ref(props.from ?? '')
const selectedTo = ref(props.to ?? '')

const bankOptions = computed(() => props.banks.map((bank) => ({ value: bank, label: bank })))

function sameArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, i) => value === b[i])
}

watch(
  () => props.bankModel,
  (v) => {
    const next = v ?? []
    if (!sameArray(selectedBanks.value, next)) selectedBanks.value = [...next]
  },
)
watch(
  () => props.statusModel,
  (v) => {
    selectedStatus.value = v ?? ''
  },
)
watch(
  () => props.sortModel,
  (v) => {
    selectedSort.value = v ?? 'date_desc'
  },
)
watch(
  () => props.from,
  (v) => {
    selectedFrom.value = v ?? ''
  },
)
watch(
  () => props.to,
  (v) => {
    selectedTo.value = v ?? ''
  },
)

watch(
  () => [selectedBanks.value, selectedStatus.value, selectedSort.value, selectedFrom.value, selectedTo.value],
  () => emit('update', {
    banks: [...selectedBanks.value],
    status: selectedStatus.value,
    sort: selectedSort.value,
    from: selectedFrom.value,
    to: selectedTo.value,
  }),
  { immediate: true },
)

function onRangeUpdate(value: { from: string; to: string }) {
  selectedFrom.value = value.from
  selectedTo.value = value.to
}

// ===== Modo presets (dashboard) =====
const PRESET_OPTIONS = [
  { value: 'all', label: 'Tudo' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'last_6_months', label: '6 meses atrás' },
  { value: 'last_12_months', label: '12 meses atrás' },
  { value: 'next_months', label: 'Próximos meses' },
  { value: 'next_1_year', label: 'Próximo 1 ano' },
]

const selectedPreset = ref('all')

function toMonthYear(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(monthYear: string, n: number): string {
  const [y, m] = monthYear.split('-').map(Number)
  return toMonthYear(new Date(y, m - 1 + n, 1))
}

function computePresetRange(presetKey: string): { from: string; to: string } {
  const current = toMonthYear(new Date())
  const year = current.split('-')[0]
  switch (presetKey) {
    case 'this_month':
      return { from: current, to: current }
    case 'this_year':
      return { from: `${year}-01`, to: `${year}-12` }
    case 'last_6_months':
      return { from: addMonths(current, -5), to: current }
    case 'last_12_months':
      return { from: addMonths(current, -11), to: current }
    case 'next_months':
      return { from: current, to: addMonths(current, 5) }
    case 'next_1_year':
      return { from: current, to: addMonths(current, 11) }
    case 'all':
    default:
      return { from: '', to: '' }
  }
}

function matchPreset(f: string, t: string): string {
  for (const opt of PRESET_OPTIONS) {
    const range = computePresetRange(opt.value)
    if (range.from === f && range.to === t) return opt.value
  }
  return 'all'
}

function onPresetChange(val: string | number) {
  const range = computePresetRange(String(val))
  selectedFrom.value = range.from
  selectedTo.value = range.to
}

watch(
  () => [props.from, props.to],
  ([f, t]) => {
    if (props.periodMode === 'presets') {
      selectedPreset.value = matchPreset(f ?? '', t ?? '')
    }
  },
  { immediate: true },
)

function clear() {
  selectedBanks.value = []
  selectedStatus.value = ''
  selectedSort.value = 'date_desc'
  selectedFrom.value = ''
  selectedTo.value = ''
}
</script>