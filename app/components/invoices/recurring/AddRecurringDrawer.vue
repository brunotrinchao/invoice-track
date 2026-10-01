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
          class="relative h-full w-full max-w-md border-l border-default bg-elevated text-slate-950 dark:text-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto"
          role="dialog"
          aria-modal="true"
          :initial="reduced ? { opacity: 0 } : DRAWER_RIGHT.initial"
          :animate="reduced ? { opacity: 1 } : DRAWER_RIGHT.enter"
          :exit="reduced ? { opacity: 0 } : DRAWER_RIGHT.leave"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default/80 p-4.5 bg-elevated/60">
            <div>
              <h2 class="text-base font-extrabold text-highlighted">Nova compra recorrente</h2>
              <p class="text-xs font-bold text-muted mt-0.5">Adicionar nova regra de cobrança recorrente</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
              @click="onClose"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-extrabold text-muted">Cartão</label>
              <select
                v-model="cardId"
                class="rounded-2xl border border-accented bg-default px-3.5 py-2 text-xs font-extrabold text-highlighted focus:border-brand-500 focus:outline-none"
              >
                <option value="" disabled>Selecione um cartão</option>
                <option
                  v-for="opt in cardOptions"
                  :key="opt.value"
                  :value="opt.value"
                >{{ opt.label }}</option>
              </select>
            </div>

            <CardsRecurringItemForm
              :initial="null"
              :saving="loading"
              :error-message="error"
              @submit="onFormSubmit"
              @cancel="onClose"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { FADE_FAST, DRAWER_RIGHT } from '~/utils/motion'
import type { Card } from '~/types/Card'
import { useRecurring } from '~/composables/useRecurring'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'

interface AppSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  open: boolean
  cards: Card[]
}>()

const emit = defineEmits<{
  close: []
  submitted: [recurringId: string]
}>()

const { cards } = props

const { createRecurring } = useRecurring()
const { register } = useOverlayStack()
const reduced = useReducedMotion()

const currentZIndex = ref(100)
let overlayHandle: OverlayHandle | null = null

const openRef = ref(false)
watch(
  () => props.open,
  (v) => {
    openRef.value = v
    if (v) {
      if (!overlayHandle) {
        overlayHandle = register('drawer', onClose)
        currentZIndex.value = overlayHandle.zIndex
      }
    } else if (overlayHandle) {
      overlayHandle.unregister()
      overlayHandle = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (overlayHandle) {
    overlayHandle.unregister()
    overlayHandle = null
  }
})

const loading = ref(false)
const error = ref('')

const cardId = ref('')

function onFormSubmit(value: { description: string; amount: number | ''; startMonthYear: string; endMonthYear: string }) {
  description.value = String(value.description)
  amount.value = Number(value.amount) || 0
  startMonthYear.value = String(value.startMonthYear)
  endMonthYear.value = String(value.endMonthYear || '')
  void onSubmit()
}
const description = ref('')
const amount = ref<number | ''>('')
const startMonthYear = ref('')
const endMonthYear = ref('')

watch(
  () => openRef.value,
  () => {
    if (!openRef.value) return
    cardId.value = ''
    description.value = ''
    amount.value = ''
    startMonthYear.value = ''
    endMonthYear.value = ''
    error.value = ''
  },
  { immediate: true },
)

const cardOptions = computed<AppSelectOption[]>(() =>
  cards.map((card) => ({
    value: card.id,
    label: `${card.bankName} •••• ${card.last4Digits}`,
  })),
)

const canSubmit = computed(() =>
  cardId.value && description.value.trim() && Number(amount.value) > 0 && startMonthYear.value,
)

async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    const recurring = await createRecurring({
      cardId: cardId.value,
      description: description.value.trim(),
      amount: Number(amount.value),
      startMonthYear: startMonthYear.value,
      endMonthYear: endMonthYear.value || null,
    })
    emit('submitted', recurring.id)
    onClose()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao criar a recorrência.'
  } finally {
    loading.value = false
  }
}

function onClose() {
  openRef.value = false
  emit('close')
}
</script>