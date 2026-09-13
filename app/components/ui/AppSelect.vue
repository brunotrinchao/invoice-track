<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="selectId"
      class="mb-1 block text-xs font-medium text-slate-400"
    >{{ label }}</label>
    <select
      :id="selectId"
      :value="modelValue"
      :disabled="disabled"
      :class="selectClasses"
      @change="onChange"
    >
      <option
        v-if="placeholder"
        value=""
        disabled
      >{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >{{ opt.label }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
export interface AppSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue?: string
  label?: string
  options: AppSelectOption[]
  placeholder?: string
  disabled?: boolean
  name?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { modelValue = '', label = undefined, options, placeholder = '', disabled = false, name = undefined } = props

const selectId = name || `app-select-${Math.random().toString(36).slice(2, 8)}`

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}

const selectClasses = 'w-full rounded-xl border border-dark-border bg-dark-card px-3.5 py-2.5 text-sm text-slate-200 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50'
</script>