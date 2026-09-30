<template>
  <div class="flex flex-col gap-6">
    <UploadPdfUploader
      ref="uploaderRef"
      @invoice-parsed="onInvoiceParsed"
      @review-meta="onReviewMeta"
    />

    <UiAppToast
      :open="toastOpen"
      :message="toastMessage"
      :tone="toastTone"
      @close="toastOpen = false"
    />

    <UploadInvoiceDiffModal
      v-if="parseResponse && parseResponse.isDuplicate"
      :parse-response="parseResponse"
      :on-close="onModalClose"
      :on-confirmed="onConfirmedSave"
    />

    <UploadConfirmationModal
      v-else-if="parseResponse"
      :parse-response="parseResponse"
      :review-meta="reviewMeta"
      :on-close="onModalClose"
      :on-confirmed="onConfirmedSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { ParseResponse } from '~/types/ParseResponse'
import { useCardStore } from '~/stores/cardStore'

const emit = defineEmits<{ parsed: []; batchDone: [] }>()

/**
 * Fluxo completo de importação (upload → parse → revisão → save).
 * Usado pela página /import E pelo drawer global (nav) — fonte única.
 */
const cardStore = useCardStore()
const router = useRouter()

const uploaderRef = ref<{ resumeQueue: () => void; hasPending: () => boolean } | null>(null)
const parseResponse = ref<ParseResponse | null>(null)
/** P2: arquivo + posição no lote — passado ao modal de revisão e ao toast */
const reviewMeta = ref<{ fileName: string; index: number; total: number } | null>(null)

function onReviewMeta(meta: { fileName: string; index: number; total: number }) {
  reviewMeta.value = meta
}
const toastOpen = ref(false)
const toastMessage = ref('')
const toastTone = ref<'success' | 'error' | 'info'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, tone: 'success' | 'error' | 'info' = 'success') {
  toastMessage.value = msg
  toastTone.value = tone
  toastOpen.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastOpen.value = false
  }, 4000)
}

function onInvoiceParsed(response: ParseResponse, file: File) {
  parseResponse.value = response
  if (file && !reviewMeta.value) {
    reviewMeta.value = { fileName: file.name, index: 1, total: 1 }
  }
  emit('parsed')
}

function onModalClose() {
  parseResponse.value = null
  reviewMeta.value = null
}

async function onConfirmedSave() {
  const meta = reviewMeta.value
  parseResponse.value = null
  reviewMeta.value = null
  showToast(
    meta ? `${meta.fileName} guardado no MySQL (${meta.index} de ${meta.total}).` : 'Fatura guardada no MySQL com sucesso.',
  )
  // cardStore é compartilhado entre páginas — refresh reflete novo cartão/fatura
  await cardStore.fetchAll()

  // Fila: pendente? Retoma 1 a 1. Vazia → fecha drawer + navega p/ faturas.
  if (uploaderRef.value?.hasPending?.()) {
    uploaderRef.value.resumeQueue()
  } else {
    showToast('Lote concluído.', 'success')
    emit('batchDone')
    router.push('/invoices')
  }
}
</script>