<template>
  <span
    :class="badgeClasses"
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
const tones = {
  gray: 'bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/30',
  blue: 'bg-brand-500/10 text-brand-500 ring-1 ring-brand-500/30',
  green: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30',
  red: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30',
  amber: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
  purple: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30',
} as const

const props = defineProps<{ tone?: keyof typeof tones }>()

const { tone = 'gray' } = props

const badgeClasses = tones[tone]
</script>