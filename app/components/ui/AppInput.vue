<template>
  <div class="w-full">
    <label
      v-if="props.label"
      :for="inputId"
      class="mb-1 block text-xs font-extrabold text-muted"
    >{{ props.label }}</label>
    <input
      :id="inputId"
      :type="props.type || 'text'"
      :value="props.modelValue ?? ''"
      :placeholder="props.placeholder ?? ''"
      :disabled="props.disabled ?? false"
      :class="inputClasses"
      @input="onInput"
      @change="onChange"
    >
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: string | number
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  name?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [event: Event]
}>()

const { type = 'text', name = undefined } = props

const inputId = name || `app-input-${Math.random().toString(36).slice(2, 8)}`

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  emit('update:modelValue', el.value)
}

function onChange(event: Event) {
  emit('change', event)
}

const inputClasses = 'w-full rounded-xl border border-accented bg-elevated px-3.5 py-2.5 text-sm font-extrabold text-default placeholder:text-slate-500 shadow-xs transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50'
</script>