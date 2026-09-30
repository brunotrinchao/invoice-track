<template>
  <div class="rounded-2xl glass-card p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <Icon name="lucide:building-2" class="h-4 w-4 text-brand-500 shrink-0" />
          <h3 class="text-sm font-extrabold text-highlighted truncate">{{ instruction.bankName }}</h3>
          <span
            class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
            :class="sourceBadgeClass"
          >{{ sourceLabel }}</span>
        </div>
        <div class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="kw in instruction.keywords"
            :key="kw"
            class="inline-flex items-center rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400"
          >{{ kw }}</span>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Editar instrução"
          class="rounded-lg p-1.5 text-dimmed hover:bg-brand-500/10 hover:text-brand-600 transition-colors cursor-pointer"
          @click="$emit('edit', instruction)"
        >
          <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Excluir instrução"
          class="rounded-lg p-1.5 text-dimmed hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
          @click="$emit('remove', instruction)"
        >
          <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <details class="mt-2 group">
      <summary class="cursor-pointer list-none text-[11px] font-bold text-muted hover:text-default transition-colors select-none">
        <Icon name="lucide:chevron-down" class="inline h-3 w-3 transition-transform group-open:rotate-180" />
        {{ rulesList.length }} regras de extração
      </summary>
      <ul class="mt-2 space-y-1">
        <li
          v-for="(rule, i) in rulesList"
          :key="i"
          class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300"
        >{{ rule }}</li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { BankInstruction } from '~/types/BankInstruction'

const props = defineProps<{ instruction: BankInstruction }>()

defineEmits<{
  edit: [instruction: BankInstruction]
  remove: [instruction: BankInstruction]
}>()

const rulesList = computed(() =>
  props.instruction.rules.split('\n').map((r) => r.trim()).filter(Boolean),
)

const sourceLabel = computed(() => {
  switch (props.instruction.source) {
    case 'seed': return 'base'
    case 'pdf': return 'IA + PDF'
    default: return 'manual'
  }
})

const sourceBadgeClass = computed(() => {
  switch (props.instruction.source) {
    case 'pdf': return 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
    case 'seed': return 'bg-slate-500/15 text-muted'
    default: return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  }
})
</script>