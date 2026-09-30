<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="openRef"
        class="fixed inset-0 flex justify-end bg-slate-950/60 dark:bg-black/80 backdrop-blur-md"
        :style="{ zIndex: currentZIndex }"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="FADE_FAST"
        @click.self="onClose"
      >
        <motion.div
          class="relative h-full w-full max-w-xl border-l border-default bg-elevated text-slate-950 dark:text-slate-200 shadow-2xl flex flex-col overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Importar fatura"
          :initial="reduced ? { opacity: 0 } : DRAWER_RIGHT.initial"
          :animate="reduced ? { opacity: 1 } : DRAWER_RIGHT.enter"
          :exit="reduced ? { opacity: 0 } : DRAWER_RIGHT.leave"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default/80 px-6 py-4.5 bg-elevated/60">
            <div class="flex flex-col min-w-0 pr-4">
              <h2 class="text-base font-extrabold text-highlighted truncate">Importar fatura PDF</h2>
              <p class="mt-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Extração por IA e revisão antes de salvar</p>
            </div>
            <button
              type="button"
              class="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar importador"
              @click="onClose"
            >
              <Icon name="lucide:x" class="h-4.5 w-4.5" />
            </button>
          </div>

          <!-- Body: fluxo completo (uploader + revisão) -->
          <div class="flex-1 overflow-y-auto p-6">
            <ImportFlow @parsed="onParsed" @batch-done="onBatchDone" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { FADE_FAST, DRAWER_RIGHT } from '~/utils/motion'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** Lote terminou → fecha drawer (após navegar p/ /invoices). */
function onBatchDone() {
  emit('close')
}

const reduced = useReducedMotion()

const openRef = ref(false)
watch(
  () => props.open,
  (v) => { openRef.value = v },
  { immediate: true },
)

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
        overlayHandle.value = register('drawer', onClose)
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

/**
 * Parse ok → modal de revisão (z maior, do stack) cobre o drawer — que fica
 * aberto por baixo: a fila retoma nele após cada save (fluxo 1 a 1).
 * Fechar o drawer aqui destruiria o modal (filho) e a fila.
 */
function onParsed() {
  /* drawer permanece aberto — revisão acontece por cima */
}

function onClose() {
  emit('close')
}
</script>