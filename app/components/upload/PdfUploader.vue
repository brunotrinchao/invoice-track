<template>
  <div class="w-full max-w-3xl mx-auto">
    <!-- PDF drop zone (múltiplos arquivos) -->
    <div
      class="relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-8 py-12 text-center transition-colors duration-200 cursor-pointer"
      :class="isDragging
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-slate-300 bg-white/5 hover:border-blue-400 hover:bg-blue-500/5'"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="openFilePicker"
    >
      <Icon
        name="lucide:file-up"
        class="mb-1 h-12 w-12 text-slate-400"
      />
      <p class="text-sm font-semibold text-slate-200">
        Arraste e solte aqui os PDFs das suas faturas
      </p>
      <p class="text-xs text-slate-400">
        ou clique para selecionar — vários arquivos permitidos (máx. 20MB cada)
      </p>
      <input
        ref="fileInput"
        type="file"
        accept="application/pdf"
        multiple
        class="hidden"
        @change="onFileSelected"
      >
    </div>

    <p
      v-if="errorMessage"
      role="alert"
      class="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >{{ errorMessage }}</p>

    <!-- Fila (apple-design: interface única do lote — item ativo expande, wayfinding total) -->
    <div v-if="queue.length > 0" class="mt-5 flex flex-col gap-2" aria-label="Fila de importação">
      <!-- P3: header macro do lote -->
      <div class="flex items-center justify-between px-1">
        <p class="text-xs font-extrabold text-muted">
          Importando <span class="text-highlighted">{{ doneCount + (activeId ? 1 : 0) }}</span> de {{ queue.length }}
        </p>
        <span
          v-if="doneCount === queue.length"
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
        >
          <Icon name="lucide:check" class="h-3 w-3" /> Lote concluído
        </span>
      </div>

      <AnimatePresence>
        <motion.div
          v-for="(item, idx) in queue"
          :key="item.id"
          class="overflow-hidden rounded-2xl glass-card"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, transform: 'translateX(-12px)' }"
          :transition="{ duration: 0.25, ease: EASE_OUT_UI, delay: Math.min(idx * 0.04, 0.2) }"
        >
          <!-- Row: sempre visível (compacto) -->
          <div
            class="flex items-center gap-3 px-4 py-3"
            :class="item.id === activeId ? 'border-l-2 border-brand-500' : ''"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Icon
                v-if="item.status === 'parsing'"
                name="lucide:loader-2"
                class="h-4.5 w-4.5 animate-spin"
              />
              <Icon
                v-else
                :name="item.status === 'done' ? 'lucide:check' : item.status === 'error' ? 'lucide:alert-circle' : 'lucide:file-text'"
                class="h-4.5 w-4.5"
                :class="item.status === 'done' ? 'text-emerald-500' : item.status === 'error' ? 'text-red-500' : ''"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-extrabold text-highlighted">{{ item.name }}</p>
              <p class="text-[10px] text-muted">
                {{ statusLabel(item.status) }} · {{ formatBytes(item.size) }}
                <template v-if="item.id === activeId"> · {{ activeStageLabel }}</template>
              </p>
            </div>
            <span
              class="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
              :class="statusChipClass(item.status)"
            >
              {{ statusLabel(item.status) }}
            </span>
            <button
              v-if="item.status === 'pending' || item.status === 'error' || item.status === 'done'"
              type="button"
              aria-label="Remover da fila"
              class="rounded-lg p-1 text-dimmed hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
              @click="onRemoveItem(item.id)"
            >
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- P1: item ativo expande — etapa IA + barra, no próprio item (sem overlay) -->
          <motion.div
            v-if="item.id === activeId"
            class="flex items-center gap-3 border-t border-default/60 bg-brand-500/[0.06] px-4 py-3"
            :initial="{ opacity: 0, height: 0 }"
            :animate="{ opacity: 1, height: 'auto' }"
            :exit="{ opacity: 0, height: 0 }"
            :transition="{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }"
          >
            <p class="min-w-0 flex-1 text-xs font-bold text-default">
              <Icon name="lucide:sparkles" class="mr-1.5 inline h-3.5 w-3.5 text-brand-500" />
              {{ activeStageLabel }}
            </p>
            <div class="h-1.5 w-28 overflow-hidden rounded-full bg-current/10">
              <div class="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
            </div>
          </motion.div>

          <!-- Erro do item -->
          <div
            v-if="item.status === 'error' && item.error"
            class="border-t border-default/60 px-4 py-2.5 text-[11px] font-bold text-red-500"
          >
            {{ item.error }}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>

    <!-- Password prompt modal -->
    <UiAppModal
      :open="showPasswordModal"
      title="Fatura protegida por senha"
      :closable="false"
    >
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onPasswordSubmit"
      >
        <p class="text-sm text-slate-300">
          {{ activeItemName ? `O arquivo ${activeItemName} está` : 'Este PDF está' }} cifrado. Insira a senha (ex: CPF ou data de nascimento).
        </p>
        <UiAppInput
          v-model="passwordInput"
          label="Senha do PDF"
          :type="showPasswordText ? 'text' : 'password'"
        />
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
            @click="showPasswordText = !showPasswordText"
          >
            {{ showPasswordText ? 'Ocultar senha' : 'Mostrar senha' }}
          </button>
          <div class="flex items-center gap-2">
            <UiAppButton
              variant="ghost"
              @click="onCancelPassword"
            >Cancelar</UiAppButton>
            <UiAppButton
              type="submit"
              :disabled="loading"
            >{{ loading ? 'Verificando…' : 'Desbloquear' }}</UiAppButton>
          </div>
        </div>
      </form>
    </UiAppModal>

    <UiAppToast
      :open="toastOpen"
      :message="toastMessage"
      :tone="toastTone"
      @close="toastOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import { EASE_OUT_UI } from '~/utils/motion'
import { useUploadQueue, type QueueItemStatus } from '~/composables/useUploadQueue'
import type { ParseResponse } from '~/types/ParseResponse'
import { useParse } from '~/composables/useParse'

/**
 * PDF uploader com fila sequencial: múltiplos arquivos, processados 1 a 1.
 * apple-design: a FILA é a única interface — item ativo expande com a etapa
 * da IA, sem overlay fullscreen que esconda o todo (wayfinding).
 */

const emit = defineEmits<{
  'invoice-parsed': [response: ParseResponse, file: File]
  'review-meta': [meta: { fileName: string; index: number; total: number }]
}>()

const { parseInvoice } = useParse()
const {
  queue, activeId, awaitingReview,
  addFiles, removeItem, nextPending, startItem, markNeedsPassword, finishItem, failItem,
} = useUploadQueue()

const isDragging = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const showPasswordModal = ref(false)
const passwordInput = ref('')
const showPasswordText = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const doneCount = computed(() => queue.value.filter((i) => i.status === 'done').length)

const activeStageLabel = computed(() => {
  if (loading.value) return 'Extraindo dados com IA (Gemini → contingência)…'
  return 'Preparando…'
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status: QueueItemStatus): string {
  switch (status) {
    case 'pending': return 'Na fila'
    case 'parsing': return 'Processando'
    case 'needs_password': return 'Senha'
    case 'done': return 'Importado'
    case 'error': return 'Erro'
    default: return status
  }
}

function statusChipClass(status: QueueItemStatus): string {
  switch (status) {
    case 'parsing': return 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
    case 'needs_password': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    case 'done': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    case 'error': return 'bg-red-500/15 text-red-600 dark:text-red-400'
    default: return 'bg-slate-500/15 text-muted'
  }
}

// ===== Fila =====

function enqueueFiles(files: FileList | File[]) {
  const items = addFiles(files)
  const invalid = items.filter((i) => i.status === 'error').length
  if (invalid > 0) {
    showToast(`${invalid} arquivo(s) ignorado(s): só PDF é aceito.`, 'error')
  }
  if (!loading.value && !awaitingReview.value) {
    void processNext()
  }
}

async function processNext(): Promise<void> {
  const item = nextPending()
  if (!item) {
    loading.value = false
    return
  }
  startItem(item)
  await processFile(item.file)
}

function onRemoveItem(id: string) {
  removeItem(id)
}

/** ImportFlow chama após save p/ retomar a fila */
function resumeQueue() {
  awaitingReview.value = false
  if (!loading.value) void processNext()
}

function hasPending(): boolean {
  return queue.value.some((i) => i.status === 'pending')
}

defineExpose({ resumeQueue, hasPending })

// ===== Processar (1 arquivo) =====
async function processFile(file: File, password?: string) {
  loading.value = true
  errorMessage.value = null

  try {
    const response = await parseInvoice(file, password)

    if (response.requiresPassword) {
      markNeedsPassword()
      showPasswordModal.value = true
      if (password) {
        errorMessage.value = 'Senha incorreta. Verifique e tente novamente (ex: CPF ou Data de Nascimento).'
      }
      loading.value = false
      return
    }

    const item = finishItem(response)
    // P2: meta p/ o modal de revisão (nome + posição no lote)
    emit('review-meta', {
      fileName: item?.name ?? file.name,
      index: doneCount.value,
      total: queue.value.length,
    })
    loading.value = false
    // Pausa a fila: modal de revisão assume; retoma em resumeQueue() pós-save
    emit('invoice-parsed', response, file)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado ao ler a fatura PDF.'
    errorMessage.value = msg
    if (activeId.value) failItem(activeId.value, msg)
    loading.value = false
  }
}

// ===== Entradas =====
function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    enqueueFiles(input.files)
  }
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files?.length) {
    enqueueFiles(event.dataTransfer.files)
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

// ===== Senha (do item ativo) =====
function onPasswordSubmit() {
  const item = queue.value.find((i) => i.status === 'needs_password')
  if (!item) return
  if (!passwordInput.value.trim()) {
    errorMessage.value = 'Digite a senha da fatura.'
    return
  }
  showPasswordModal.value = false
  void processFile(item.file, passwordInput.value)
}

function onCancelPassword() {
  showPasswordModal.value = false
  passwordInput.value = ''
  loading.value = false
  if (activeId.value) failItem(activeId.value, 'Senha cancelada.')
}

// ===== Toast interno (arquivo inválido) =====
const toastOpen = ref(false)
const toastMessage = ref('')
const toastTone = ref<'success' | 'error' | 'info'>('info')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, tone: 'success' | 'error' | 'info' = 'info') {
  toastMessage.value = msg
  toastTone.value = tone
  toastOpen.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastOpen.value = false }, 4000)
}
</script>