<template>
  <button
    :type="type"
    :class="classes"
    :disabled="isDisabled || loading"
    @click="onClick"
  >
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

const props = withDefaults(
  defineProps<{
    variant?: keyof typeof variants
    size?: keyof typeof sizes
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', disabled: false, loading: false },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

function onClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) emit('click', event)
}

const classes = computed(
  () =>
    `${variants[props.variant]} ${sizes[props.size]} inline-flex cursor-pointer items-center gap-2 font-medium transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`,
)
const isDisabled = computed(() => props.disabled)
</script>