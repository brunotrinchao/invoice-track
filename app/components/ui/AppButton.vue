<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="classes"
    @click="onClick"
  >
    <span v-if="loading" class="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    <slot />
  </button>
</template>

<script setup lang="ts">
const variants = {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30 hover:brightness-110',
  secondary: 'bg-dark-card border border-dark-border text-slate-200 hover:border-brand-500/50',
  danger: 'bg-gradient-to-r from-rose-600 to-red-500 text-white hover:brightness-110',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/5',
} as const

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-base rounded-xl',
} as const

const props = defineProps<{
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const { variant = 'primary', size = 'md', type = 'button', disabled = false, loading = false } = props

function onClick(event: MouseEvent) {
  if (!disabled && !loading) emit('click', event)
}

const classes = `${variants[variant]} ${sizes[size]} inline-flex items-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`
</script>