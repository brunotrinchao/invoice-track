<template>
  <Teleport to="body">
    <AnimatePresence>
      <div
        v-if="open"
        class="fixed inset-0 flex items-center justify-center bg-slate-950/60 dark:bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
        :style="{ zIndex: currentZIndex }"
        @click.self="handleBackdropClick"
      >
        <motion.div
          :class="[
            'relative w-full flex flex-col rounded-3xl border border-default bg-default text-slate-950 dark:text-slate-200 shadow-2xl overflow-hidden max-h-[90vh]',
            maxWidthClass
          ]"
          role="dialog"
          aria-modal="true"
          :initial="{ opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="MODAL_OUT"
          :transition="reduced ? FADE_FAST : SPRING_DEFAULT"
        >
          <!-- Header -->
          <div v-if="title || description || $slots.header" class="flex items-center justify-between border-b border-default/80 px-6 py-4.5 bg-elevated/60">
            <slot name="header">
              <div class="flex flex-col min-w-0 pr-4">
                <h2 v-if="title" class="text-base font-extrabold text-highlighted truncate">{{ title }}</h2>
                <p v-if="description" class="mt-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{{ description }}</p>
              </div>
            </slot>
            <button
              v-if="closable"
              type="button"
              class="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
              @click="handleClose"
            >
              <Icon name="lucide:x" class="h-4.5 w-4.5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="border-t border-default/80 px-6 py-4 bg-elevated/80">
            <slot name="footer" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'
import { MODAL_OUT, SPRING_DEFAULT, FADE_FAST } from '~/utils/motion'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    closable?: boolean
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  }>(),
  {
    title: '',
    description: '',
    closable: true,
    maxWidth: 'lg',
  },
)

const emit = defineEmits<{
  close: []
  'update:open': [val: boolean]
}>()

const reduced = useReducedMotion()

const { register, getZIndex } = useOverlayStack()
const overlayHandle = ref<OverlayHandle | null>(null)

const currentZIndex = computed(() => {
  if (!overlayHandle.value) return 100
  return getZIndex(overlayHandle.value.id)
})

watch(
  () => props.open,
  (v) => {
    if (v) {
      if (!overlayHandle.value) {
        overlayHandle.value = register('modal', handleClose)
      }
    } else if (overlayHandle.value) {
      overlayHandle.value.unregister()
      overlayHandle.value = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (overlayHandle.value) {
    overlayHandle.value.unregister()
    overlayHandle.value = null
  }
})

const maxWidthClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  }
  return map[props.maxWidth] || 'max-w-lg'
})

function handleClose() {
  if (props.closable) {
    emit('close')
    emit('update:open', false)
  }
}

function handleBackdropClick() {
  handleClose()
}
</script>