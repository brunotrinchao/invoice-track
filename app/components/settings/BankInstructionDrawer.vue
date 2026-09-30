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
          class="relative h-full w-full max-w-xl border-l border-default bg-elevated text-slate-950 dark:text-slate-200 shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Instrução de extração por banco"
          :initial="reduced ? { opacity: 0 } : DRAWER_RIGHT.initial"
          :animate="reduced ? { opacity: 1 } : DRAWER_RIGHT.enter"
          :exit="reduced ? { opacity: 0 } : DRAWER_RIGHT.leave"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default/80 px-6 py-4.5 bg-elevated/60">
            <div class="min-w-0 pr-4">
              <h2 class="text-base font-extrabold text-highlighted truncate">
                {{ editing ? 'Editar instrução' : 'Nova instrução por PDF' }}
              </h2>
              <p class="mt-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                {{ stepLabels[step] }}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              class="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              @click="onClose"
            >
              <Icon name="lucide:x" class="h-4.5 w-4.5" />
            </button>
          </div>

          <!-- Body: 4 passos lineares -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- 1. Dropzone -->
            <div v-if="step === 'dropzone'">
              <div
                class="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center cursor-pointer transition-colors duration-200"
                :class="isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300 bg-white/5 hover:border-blue-400 hover:bg-blue-500/5'"
                @dragenter.prevent="isDragging = true"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="onFileDrop"
                @click="fileInput?.click()"
              >
                <Icon name="lucide:file-up" class="h-12 w-12 text-slate-400" />
                <p class="text-sm font-semibold text-slate-200">Fatura de exemplo</p>
                <p class="text-xs text-slate-400">A IA analisa o PDF e propõe as regras de extração</p>
                <input
                  ref="fileInput"
                  type="file"
                  accept="application/pdf"
                  class="hidden"
                  @change="onFileSelected"
                >
              </div>
            </div>

            <!-- 2. Analisando -->
            <div v-else-if="step === 'analyzing'" class="flex flex-col items-center gap-4 py-14">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                <Icon name="lucide:sparkles" class="h-7 w-7 animate-spin" />
              </div>
              <div class="text-center">
                <p class="text-sm font-extrabold text-highlighted">Analisando {{ fileName }}</p>
                <p class="mt-1 text-xs text-muted">A IA está lendo o formato da fatura…</p>
              </div>
            </div>

            <!-- 3. Preview editável -->
            <div v-else-if="step === 'preview'" class="flex flex-col gap-4">
              <div class="rounded-xl bg-brand-500/10 border border-brand-500/25 px-4 py-3 text-xs font-bold text-brand-700 dark:text-brand-300 flex items-start gap-2">
                <Icon name="lucide:shield-check" class="h-4 w-4 shrink-0 mt-0.5" />
                Revisão humana — ajuste antes de salvar. Estas regras entram no prompt de extração.
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-extrabold text-muted" for="bi-bank">Nome do banco/emissor</label>
                <input
                  id="bi-bank"
                  v-model="form.bankName"
                  type="text"
                  class="w-full rounded-xl border border-accented bg-default px-3 py-2 text-sm text-highlighted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-extrabold text-muted">Keywords (aliases que identificam a fatura)</label>
                <div class="flex flex-wrap items-center gap-1.5 rounded-xl border border-accented bg-default p-2">
                  <span
                    v-for="kw in form.keywords"
                    :key="kw"
                    class="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-400"
                  >
                    {{ kw }}
                    <button
                      type="button"
                      :aria-label="`Remover keyword ${kw}`"
                      class="opacity-60 hover:opacity-100 cursor-pointer"
                      @click="removeKeyword(kw)"
                    >
                      <Icon name="lucide:x" class="h-3 w-3" />
                    </button>
                  </span>
                  <input
                    v-model="keywordInput"
                    type="text"
                    aria-label="Nova keyword"
                    placeholder="digite + Enter"
                    class="min-w-[120px] flex-1 bg-transparent px-1 text-xs text-highlighted focus:outline-none"
                    @keydown.enter.prevent="addKeyword"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-extrabold text-muted" for="bi-rules">Regras de extração (uma por linha)</label>
                <textarea
                  id="bi-rules"
                  v-model="form.rules"
                  rows="10"
                  class="w-full rounded-xl border border-accented bg-default px-3 py-2 text-xs font-mono text-highlighted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <p v-if="formError" role="alert" class="text-xs font-bold text-red-500">{{ formError }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-default/80 px-6 py-4 bg-elevated/80 flex items-center justify-end gap-2">
            <UiAppButton variant="ghost" @click="onClose">Cancelar</UiAppButton>
            <UiAppButton
              v-if="step === 'preview'"
              variant="primary"
              :disabled="saving || !formValid"
              @click="onSave"
            >{{ saving ? 'Salvando…' : 'Salvar instrução' }}</UiAppButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    <UiAppToast
      :open="toastOpen"
      :message="toastMessage"
      :tone="toastTone"
      @close="toastOpen = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { FADE_FAST, DRAWER_RIGHT } from '~/utils/motion'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'
import { useBankInstructions } from '~/composables/useBankInstructions'
import type { BankInstruction } from '~/types/BankInstruction'

type Step = 'dropzone' | 'analyzing' | 'preview'

const props = defineProps<{
  open: boolean
  /** Modo edição: instrução existente → abre direto no preview */
  instruction?: BankInstruction | null
}>()

const emit = defineEmits<{ close: []; saved: [instruction: BankInstruction] }>()

const reduced = useReducedMotion()
const { save, extractFromPdf } = useBankInstructions()

const openRef = ref(false)
watch(
  () => props.open,
  (v) => { openRef.value = v },
  { immediate: true },
)

const { register, getZIndex } = useOverlayStack()
const overlayHandle = ref<OverlayHandle | null>(null)
const currentZIndex = computed(() =>
  overlayHandle.value ? getZIndex(overlayHandle.value.id) : 100,
)

watch(
  () => props.open,
  (v) => {
    if (v && !overlayHandle.value) {
      overlayHandle.value = register('drawer', onClose)
    } else if (!v && overlayHandle.value) {
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

// ===== Steps =====
const editing = computed(() => Boolean(props.instruction))
const step = ref<Step>('dropzone')
const stepLabels: Record<Step, string> = {
  dropzone: 'Envie um PDF de fatura deste banco',
  analyzing: 'IA analisando o PDF…',
  preview: 'Revisão humana — ajuste e salve',
}

const isDragging = ref(false)
const fileName = ref('')
const saving = ref(false)
const formError = ref('')
const form = ref({ bankName: '', keywords: [] as string[], rules: '' })
const keywordInput = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) {
      if (props.instruction) {
        form.value = {
          bankName: props.instruction.bankName,
          keywords: [...props.instruction.keywords],
          rules: props.instruction.rules,
        }
        step.value = 'preview'
      } else {
        form.value = { bankName: '', keywords: [], rules: '' }
        step.value = 'dropzone'
      }
      formError.value = ''
      keywordInput.value = ''
    }
  },
  { immediate: true },
)

const formValid = computed(() =>
  form.value.bankName.trim().length > 0 &&
  form.value.keywords.length > 0 &&
  form.value.rules.trim().length >= 20,
)

function addKeyword() {
  const kw = keywordInput.value.trim()
  if (kw && !form.value.keywords.includes(kw)) {
    form.value.keywords = [...form.value.keywords, kw]
  }
  keywordInput.value = ''
}

function removeKeyword(kw: string) {
  form.value.keywords = form.value.keywords.filter((k) => k !== kw)
}

// ===== Fluxo =====
async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await analyze(file)
}

function onFileDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void analyze(file)
}

async function analyze(file: File) {
  if (file.type !== 'application/pdf') {
    formError.value = 'Envie um arquivo PDF.'
    return
  }
  fileName.value = file.name
  step.value = 'analyzing'
  try {
    const proposal = await extractFromPdf(file)
    form.value = {
      bankName: proposal.bankName,
      keywords: proposal.keywords,
      rules: proposal.rules.join('\n'),
    }
    step.value = 'preview'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Falha ao analisar o PDF.'
    showToast(formError.value, 'error')
    step.value = 'dropzone'
  }
}

async function onSave() {
  saving.value = true
  formError.value = ''
  try {
    const saved = await save({
      bankName: form.value.bankName,
      keywords: form.value.keywords,
      rules: form.value.rules,
      source: props.instruction ? 'manual' : 'pdf',
    })
    showToast(`${saved.bankName} salvo. Próximas importações já usam as regras.`, 'success')
    emit('saved', saved)
    emit('close')
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}

function onClose() {
  emit('close')
}

// ===== Toast =====
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