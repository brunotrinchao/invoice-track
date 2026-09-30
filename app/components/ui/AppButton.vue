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
  primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30 hover:brightness-110 font-extrabold',
  secondary: 'bg-elevated border border-accented text-default hover:bg-slate-50 dark:hover:bg-white/10 font-extrabold',
  danger: 'bg-gradient-to-r from-rose-600 to-red-500 text-white hover:brightness-110 font-extrabold',
  ghost: 'bg-transparent text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-extrabold',
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

const classes = `${variants[variant]} ${sizes[size]} inline-flex cursor-pointer items-center gap-2 font-medium transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`
</script>