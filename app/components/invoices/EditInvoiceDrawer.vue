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
              <h2 class="text-base font-extrabold text-highlighted">Editar fatura</h2>
              <p class="text-xs font-bold text-muted mt-0.5">{{ monthLabel + (cardLabel ? ' · ' + cardLabel : '') }}</p>
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
            <div
              v-for="(row, idx) in rows"
              :key="row.key"
              class="rounded-2xl bg-default/60 p-3.5 border border-default/50"
            >
              <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
                <UInput
                  v-model="row.description"
                  label="Descrição"
                  placeholder="Ex: Netflix"
                  class="min-w-0 flex-1"
                />
                <UInput
                  v-model.number="row.amount"
                  label="Montante"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-28"
                />
                <UInput
                  v-model.number="row.currentInstallment"
                  label="Parcela"
                  type="number"
                  min="1"
                  class="w-20"
                />
                <span class="text-sm font-extrabold text-muted">/</span>
                <UInput
                  v-model.number="row.totalInstallments"
                  label="Total"
                  type="number"
                  min="1"
                  class="w-20"
                />
                <button
                  type="button"
                  class="rounded-xl p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  :aria-label="`Quitar item ${idx + 1}`"
                  @click="removeRow(idx)"
                >
                  <Icon name="lucide:trash-2" class="h-4 w-4" />
                </button>
              </div>
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
              :disabled="loading"
              @click="onSubmit"
            >Salvar</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { motion, AnimatePresence, useReducedMotion } from 'motion-v'
import type { Invoice } from '~/types/Invoice'
import type { InvoiceItemInput } from '~/composables/useInvoices'
import { useInvoices } from '~/composables/useInvoices'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'
import { FADE_FAST, DRAWER_RIGHT } from '~/utils/motion'

interface FormRow {
  key: string
  id?: string
  description: string
  amount: number | ''
  currentInstallment: number
  totalInstallments: number
  itemType?: 'PURCHASE' | 'FEE' | 'FINE' | 'INTEREST' | 'TAX' | 'CREDIT'
}

const props = defineProps<{
  open: boolean
  invoice: Invoice | null
}>()

const emit = defineEmits<{
  close: []
  saved: [invoice: Invoice]
}>()

const { updateInvoice } = useInvoices()
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

function onOpenUpdate(val: boolean) {
  openRef.value = val
  if (!val) emit('close')
}

const rows = ref<FormRow[]>([])
const loading = ref(false)
const error = ref('')

watch(
  () => [openRef.value, props.invoice],
  () => {
    if (!openRef.value || !props.invoice) return
    const items = props.invoice.items ?? []
    rows.value = items.map((i) => ({
      key: i.id,
      id: i.id,
      description: i.description,
      amount: Number(i.originalAmount),
      currentInstallment: i.currentInstallment ?? 1,
      totalInstallments: i.totalInstallments ?? 1,
      itemType: i.itemType,
    }))
    error.value = ''
  },
  { immediate: true },
)

const monthLabel = computed(() => {
  if (!props.invoice) return ''
  const [year, month] = props.invoice.monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const cardLabel = computed(() => {
  const c = props.invoice?.card
  return c ? `${c.bankName} •••• ${c.last4Digits}` : ''
})

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

async function onSubmit() {
  if (!props.invoice) return
  const validItems: InvoiceItemInput[] = []
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    if (!r.description.trim()) {
      error.value = `Insira uma descrição para o item ${i + 1}.`
      return
    }
    const num = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount))
    if (Number.isNaN(num) || num === 0) {
      error.value = `Insira um valor diferente de zero no item ${i + 1}.`
      return
    }
    validItems.push({
      id: r.id,
      description: r.description.trim(),
      amount: num,
      currentInstallment: r.currentInstallment || 1,
      totalInstallments: r.totalInstallments || 1,
      itemType: r.itemType,
    })
  }

  loading.value = true
  error.value = ''
  try {
    const updated = await updateInvoice(props.invoice.id, validItems)
    emit('saved', updated)
    onClose()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao atualizar fatura.'
  } finally {
    loading.value = false
  }
}

function onClose() {
  onOpenUpdate(false)
}
</script>