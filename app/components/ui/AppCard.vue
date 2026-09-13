<template>
  <div
    :class="cardClasses"
    class="glass-card rounded-2xl"
  >
    <div
      v-if="title || $slots.header"
      class="flex items-center justify-between px-4 py-3"
    >
      <h3 class="text-sm font-semibold text-slate-300">{{ title }}</h3>
      <slot name="header" />
    </div>
    <div class="p-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  padded?: boolean
  hover?: boolean
}>()

const { title = '', padded = true, hover = false } = props

const cardClasses = `${padded ? '' : 'p-0'} ${hover ? 'transition-colors hover:border-brand-500/50' : ''}`
</script>