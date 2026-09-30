import type { ParseResponse } from '~/types/ParseResponse'

/**
 * Fila de importação sequencial de PDFs (1 a 1):
 * lista pendentes → processa 1 por vez → pausa p/ revisão → retoma.
 */

export type QueueItemStatus = 'pending' | 'parsing' | 'needs_password' | 'done' | 'error'

export interface QueueItem {
  id: string
  file: File
  name: string
  size: number
  status: QueueItemStatus
  error?: string
  response?: ParseResponse
}

let seq = 0

export function useUploadQueue() {
  const queue = ref<QueueItem[]>([])
  const activeId = ref<string | null>(null)

  /** true quando fila pausada aguardando revisão/save do modal */
  const awaitingReview = ref(false)

  function addFiles(files: FileList | File[]): QueueItem[] {
    // Arquivos não-PDF entram como item de erro — visibilidade > descarte silencioso
    const added: QueueItem[] = []
    for (const file of Array.from(files)) {
      seq += 1
      added.push({
        id: `q${seq}`,
        file,
        name: file.name,
        size: file.size,
        status: file.type === 'application/pdf' ? 'pending' : 'error',
        error: file.type !== 'application/pdf' ? 'Não é um PDF' : undefined,
      })
    }
    queue.value = [...queue.value, ...added]
    return added
  }

  function removeItem(id: string): boolean {
    if (activeId.value === id) return false // item em parsing não sai
    queue.value = queue.value.filter((i) => i.id !== id)
    return true
  }

  function nextPending(): QueueItem | undefined {
    return queue.value.find((i) => i.status === 'pending')
  }

  function startItem(item: QueueItem): void {
    item.status = 'parsing'
    activeId.value = item.id
  }

  function finishItem(response: ParseResponse): QueueItem | undefined {
    const item = queue.value.find((i) => i.id === activeId.value)
    if (!item) return undefined
    item.status = 'done'
    item.response = response
    activeId.value = null
    awaitingReview.value = false
    return item
  }

  function markNeedsPassword(): void {
    const item = queue.value.find((i) => i.id === activeId.value)
    if (item) item.status = 'needs_password'
  }

  function failItem(id: string, message: string): void {
    const item = queue.value.find((i) => i.id === id)
    if (!item) return
    item.status = 'error'
    item.error = message
    if (activeId.value === id) activeId.value = null
  }

  function reset(): void {
    queue.value = []
    activeId.value = null
    awaitingReview.value = false
  }

  return {
    queue, activeId, awaitingReview,
    addFiles, removeItem, nextPending, startItem, markNeedsPassword, finishItem, failItem, reset,
  }
}