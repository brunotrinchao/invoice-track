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
          class="relative h-full w-full max-w-md border-l border-default bg-elevated text-slate-950 dark:text-slate-200 shadow-2xl flex flex-col overflow-y-auto"
          role="dialog"
          aria-modal="true"
          :initial="reduced ? { opacity: 0 } : DRAWER_RIGHT.initial"
          :animate="reduced ? { opacity: 1 } : DRAWER_RIGHT.enter"
          :exit="reduced ? { opacity: 0 } : DRAWER_RIGHT.leave"
        >
          <div class="flex items-center justify-between border-b border-default/80 p-4.5 bg-elevated/60">
            <div>
              <h2 class="text-base font-extrabold text-highlighted">Recorrentes — {{ cardTitle }}</h2>
              <p class="text-xs font-bold text-muted mt-0.5">Cobranças aplicadas automaticamente a cada fatura</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/60 text-muted hover:text-slate-950 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
              @click="onClose"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </div>
          <div class="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <p v-if="loadError" role="alert" class="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400">{{ loadError }}</p>
            <template v-else-if="mode === 'list'">
              <button
                type="button"
                class="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 px-4 py-2.5 text-xs font-extrabold !text-white shadow-md shadow-brand-500/20 transition-[background-color,transform] active:scale-[0.97] cursor-pointer"
                @click="openCreate"
              >
                <Icon name="lucide:plus" class="h-4 w-4" />
                Nova cobrança
              </button>
              <div v-if="listLoading" class="flex flex-col gap-2" aria-busy="true">
                <div v-for="i in 2" :key="i" class="h-14 rounded-2xl bg-current/10" />
              </div>
              <p v-else-if="items.length === 0" class="text-center text-xs text-muted py-8">
                Nenhuma cobrança recorrente neste cartão.
              </p>
              <div v-else class="flex flex-col gap-2">
                <div
                  v-for="(it, idx) in items"
                  :key="it.id"
                  class="flex items-center gap-3 rounded-2xl bg-default/60 border border-default/50 p-3"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                    <Icon name="lucide:repeat" class="h-4 w-4" />
                  </div>
                  <div class="flex flex-col min-w-0 flex-1">
                    <span class="text-xs font-extrabold text-highlighted truncate">{{ it.description }}</span>
                    <span class="text-[11px] text-muted">{{ formatPeriod(it) }} · {{ money(it.amount) }}</span>
                  </div>
                  <span
                    class="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-extrabold"
                    :class="it.active ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'"
                  >{{ it.active ? 'Ativa' : 'Pausada' }}</span>
                  <button
                    type="button"
                    class="rounded-xl p-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 transition-colors cursor-pointer"
                    aria-label="Editar"
                    @click="openEdit(it)"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-xl p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    :aria-label="it.active ? 'Pausar' : 'Ativar'"
                    @click="toggleActive(it)"
                  >
                    <Icon :name="it.active ? 'lucide:pause' : 'lucide:play'" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-xl p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    aria-label="Excluir"
                    @click="deletingItem = it"
                  >
                    <Icon name="lucide:trash-2" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </template>
            <CardsRecurringItemForm
              v-else
              :initial="editingItem"
              :saving="busy"
              :error-message="formError"
              @submit="onFormSubmit"
              @cancel="backToList"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>

  <Teleport to="body">
    <UiAppModal
      :open="deletingItem !== null"
      title="Excluir cobrança recorrente?"
      description="As instâncias ainda não pagas serão removidas das faturas; pagadas são preservadas."
      max-width="md"
      @close="deletingItem = null"
    >
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-end gap-2">
          <UiAppButton variant="ghost" @click="deletingItem = null">Cancelar</UiAppButton>
          <UiAppButton variant="danger" :disabled="busy" @click="onDelete">Excluir</UiAppButton>
        </div>
      </div>
    </UiAppModal>
  </Teleport>
</template>

<script setup lang="ts">
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import { FADE_FAST, DRAWER_RIGHT } from '~/utils/motion'
import type { Card } from '~/types/Card'
import type { RecurringItem } from '~/types/RecurringItem'
import { useRecurring } from '~/composables/useRecurring'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'
import { formatMoney } from '~/utils/money'

const props = defineProps<{ open: boolean; card: Card | null }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { listByCard, createRecurring, updateRecurring, deleteRecurring, setActive } = useRecurring()
const { register } = useOverlayStack()
const reduced = useReducedMotion()

const currentZIndex = ref(100)
let overlayHandle: OverlayHandle | null = null
const openRef = ref(false)

const mode = ref<'list' | 'create' | 'edit'>('list')
const items = ref<RecurringItem[]>([])
const listLoading = ref(false)
const loadError = ref('')
const editingItem = ref<RecurringItem | null>(null)
const formError = ref('')
const busy = ref(false)
const deletingItem = ref<RecurringItem | null>(null)

const cardTitle = computed(() => props.card ? `${props.card.bankName} •••• ${props.card.last4Digits}` : '')

watch(
  () => props.open,
  (v) => {
    openRef.value = v
    if (v) {
      if (!overlayHandle) {
        overlayHandle = register('drawer', onClose)
        currentZIndex.value = overlayHandle.zIndex
      }
      void loadItems()
      mode.value = 'list'
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

async function loadItems() {
  if (!props.card) return
  listLoading.value = true
  loadError.value = ''
  try {
    items.value = await listByCard(props.card.id)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Erro ao carregar recorrentes.'
  } finally {
    listLoading.value = false
  }
}

function openCreate() {
  editingItem.value = null
  formError.value = ''
  mode.value = 'create'
}

function openEdit(it: RecurringItem) {
  editingItem.value = it
  formError.value = ''
  mode.value = 'edit'
}

function backToList() {
  mode.value = 'list'
  editingItem.value = null
  formError.value = ''
}

async function onFormSubmit(value: { description: string; amount: number | ''; startMonthYear: string; endMonthYear: string }) {
  if (!props.card) return
  busy.value = true
  formError.value = ''
  try {
    if (mode.value === 'edit' && editingItem.value) {
      await updateRecurring(editingItem.value.id, {
        description: value.description,
        amount: Number(value.amount),
        startMonthYear: value.startMonthYear,
        endMonthYear: value.endMonthYear || null,
      })
    } else {
      await createRecurring({
        cardId: props.card.id,
        description: value.description,
        amount: Number(value.amount),
        startMonthYear: value.startMonthYear,
        endMonthYear: value.endMonthYear || null,
      })
    }
    emit('changed')
    backToList()
    await loadItems()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Erro ao salvar recorrente.'
  } finally {
    busy.value = false
  }
}

async function toggleActive(it: RecurringItem) {
  busy.value = true
  try {
    await setActive(it.id, !it.active)
    emit('changed')
    await loadItems()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Erro ao alterar status.'
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (!deletingItem.value) return
  busy.value = true
  try {
    await deleteRecurring(deletingItem.value.id)
    deletingItem.value = null
    emit('changed')
    await loadItems()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Erro ao excluir.'
  } finally {
    busy.value = false
  }
}

function money(v: number | string) { return formatMoney(Number(v)) }

function formatPeriod(it: RecurringItem): string {
  const start = it.startMonthYear
  const end = it.endMonthYear
  if (!end) return `De ${start} — ∞`
  return `${start} → ${end}`
}

function onClose() {
  openRef.value = false
  emit('close')
}

</script>
