<template>
  <div ref="container" class="relative flex flex-col gap-1">
    <span
      v-if="label"
      class="text-xs font-extrabold uppercase tracking-wide text-muted"
    >{{ label }}</span>

    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-xl border border-accented bg-elevated px-3.5 py-2.5 text-sm font-extrabold transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
      :class="open ? 'text-brand-700 dark:text-brand-400' : 'text-default'"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <span class="truncate text-slate-800 dark:text-slate-200 font-extrabold">{{ buttonLabel }}</span>
      <span class="flex items-center gap-1.5">
        <span
          v-if="modelValue.length > 0"
          class="rounded-full bg-brand-500/20 px-1.5 text-xs font-extrabold text-brand-700 dark:text-brand-400"
        >{{ modelValue.length }}</span>
        <Icon
          name="lucide:chevron-down"
          :class="['h-3.5 w-3.5 text-muted', open ? 'rotate-180' : '']"
        />
      </span>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-accented bg-elevated p-2 shadow-xl"
    >
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-extrabold text-default transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
      >
        <input
          type="checkbox"
          class="h-3.5 w-3.5 rounded accent-brand-500 cursor-pointer"
          :checked="isSelected(opt.value)"
          @change="toggle(opt.value)"
        >
        <span class="truncate">{{ opt.label }}</span>
      </label>
      <p
        v-if="options.length === 0"
        class="px-2 py-1.5 text-xs text-dimmed font-bold"
      >Sem opções.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Import explícito: tests/setup.ts no expone onBeforeUnmount como global.
import { onBeforeUnmount } from 'vue'

interface MultiSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string[]
  options: MultiSelectOption[]
  label?: string
  placeholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const container = ref<HTMLDivElement | null>(null)
const open = ref(false)

function toggleOpen() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (container.value && !container.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

// Popover custom (sin UPopover: @nuxt/ui 3.0.0 no compila con @vue/compiler-sfc 3.5.42).
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

const buttonLabel = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder ?? 'Selecionar'
  return `${props.modelValue.length} seleccionados`
})

function isSelected(value: string) {
  return props.modelValue.includes(value)
}

function toggle(value: string) {
  // Inmutable: siempre un array nuevo.
  const next = [...props.modelValue]
  const idx = next.indexOf(value)
  if (idx >= 0) {
    next.splice(idx, 1)
  } else {
    next.push(value)
  }
  emit('update:modelValue', next)
}
</script>