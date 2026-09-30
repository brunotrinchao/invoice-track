import { useOverlayStack } from '~/composables/useOverlayStack'

export default defineNuxtPlugin((_nuxtApp) => {
  const stack = useOverlayStack()

  if (import.meta.client) {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stack.closeTopmost()
      }
    })
  }

  return {
    provide: {
      overlayStack: stack,
    },
  }
})
