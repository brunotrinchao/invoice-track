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

            <UiAppInput
              v-model="description"
              label="Descrição"
              placeholder="Ex: Netflix"
            />

            <UiAppInput
              v-model.number="amount"
              label="Valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <UiAppInput
                v-model="startMonthYear"
                label="Mês de início"
                type="month"
              />
              <UiAppInput
                v-model="endMonthYear"
                label="Mês de término (opcional)"
                type="month"
              />
            </div>

            <p
              v-if="error"
              role="alert"
              class="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400"
            >{{ error }}</p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-default/80 p-4 bg-elevated/80">
            <button
              type="button"
              class="rounded-2xl border border-accented bg-elevated px-4.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer"
              @click="onClose"
            >Cancelar</button>
            <button
              type="button"
              class="rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 px-5 py-2.5 text-xs font-extrabold !text-white shadow-md shadow-brand-500/20 transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer disabled:opacity-50"
              :disabled="loading || !canSubmit"
              @click="onSubmit"
            >Criar</button>
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