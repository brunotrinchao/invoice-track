import { ref } from 'vue'

export interface OverlayHandle {
  id: string
  type: 'modal' | 'drawer'
  depth: number
  zIndex: number
  backdropZIndex: number
  unregister: () => void
}

interface OverlayRecord {
  id: string
  type: 'modal' | 'drawer'
  onClose?: () => void
}

const overlayStack = ref<OverlayRecord[]>([])
let counter = 0

export function useOverlayStack() {
  function register(type: 'modal' | 'drawer', onClose?: () => void): OverlayHandle {
    const id = `overlay_${++counter}_${Date.now()}`
    const record: OverlayRecord = { id, type, onClose }
    overlayStack.value.push(record)

    const depth = overlayStack.value.length
    const zIndex = 100 * depth
    const backdropZIndex = zIndex - 10

    function unregister() {
      const idx = overlayStack.value.findIndex((o) => o.id === id)
      if (idx !== -1) {
        overlayStack.value.splice(idx, 1)
      }
    }

    return {
      id,
      type,
      depth,
      zIndex,
      backdropZIndex,
      unregister,
    }
  }

  function getDepth(id: string): number {
    const idx = overlayStack.value.findIndex((o) => o.id === id)
    return idx !== -1 ? idx + 1 : 1
  }

  function getZIndex(id: string): number {
    const idx = overlayStack.value.findIndex((o) => o.id === id)
    return idx !== -1 ? (idx + 1) * 100 : 100
  }

  function closeTopmost() {
    if (overlayStack.value.length === 0) return
    const top = overlayStack.value[overlayStack.value.length - 1]
    if (top.onClose) {
      top.onClose()
    }
  }

  return {
    stack: overlayStack,
    register,
    getDepth,
    getZIndex,
    closeTopmost,
  }
}
