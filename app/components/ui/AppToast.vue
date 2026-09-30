<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="open"
        role="status"
        :aria-live="tone === 'error' ? 'assertive' : 'polite'"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl border"
        :class="toneClasses"
        :initial="{ opacity: 0, transform: 'translateY(12px) scale(0.97)' }"
        :animate="{ opacity: 1, transform: 'translateY(0px) scale(1)' }"
        :exit="{ opacity: 0, transform: 'translateY(12px) scale(0.97)' }"
        :transition="reduced ? { duration: 0.15 } : SPRING_DEFAULT"
      >
        <Icon :name="toneIcon" class="h-5 w-5 shrink-0" />
        <span class="min-w-0">{{ message }}</span>
        <button
          type="button"
          aria-label="Fechar notificação"
          class="ml-1 rounded-lg p-1 opacity-70 transition-colors hover:opacity-100 cursor-pointer"
          @click="$emit('close')"
        >
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { SPRING_DEFAULT } from '~/utils/motion'

defineProps<{
  open: boolean
  message: string
  tone?: 'success' | 'error' | 'info'
}>()

defineEmits<{ close: [] }>()

const reduced = useReducedMotion()

const toneClasses = computed(() => {
  switch (tone) {
    case 'error':
      return 'bg-red-600 text-white border-red-500/40'
    case 'info':
      return 'bg-default border-default text-default'
    default:
      return 'bg-emerald-600 text-white border-emerald-500/40'
  }
})

const toneIcon = computed(() => {
  switch (tone) {
    case 'error':
      return 'lucide:alert-circle'
    case 'info':
      return 'lucide:info'
    default:
      return 'lucide:check-circle'
  }
})
</script>