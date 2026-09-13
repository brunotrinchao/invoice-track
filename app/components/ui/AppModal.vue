<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
      appear
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="onBackdrop"
      >
        <div
          class="glass-modal w-full max-w-lg rounded-2xl border border-dark-border bg-dark-card p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">{{ title }}</h2>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              aria-label="Cerrar"
              @click="onClose"
            >
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="mt-4">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
  closable?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const { open, title = '', closable = true } = props

function onClose() {
  if (closable) emit('close')
}

function onBackdrop() {
  if (closable) emit('close')
}
</script>