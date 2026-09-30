<template>
  <UiAppModal
    :open="true"
    title="Fatura Duplicada — Comparativo e Fusão de Lançamentos"
    :description="`${formatMonthYearLong(monthReferenced)} · ${cardInfo.bankName} (•••• ${cardInfo.last4Digits})`"
    max-width="6xl"
    @close="onClose"
  >
    <template #default>
      <div class="flex flex-col gap-6">
        <!-- Top Alert & Summary Banner -->
        <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-5 text-amber-950 dark:text-amber-200 shadow-xs">
          <div class="flex items-center gap-4 min-w-0">
            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-200 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300">
              <Icon name="lucide:alert-circle" class="h-6 w-6 text-amber-950 dark:text-amber-300" />
            </div>
            <div class="text-xs min-w-0">
              <p class="font-extrabold text-amber-950 dark:text-amber-300 text-sm">Fatura já cadastrada no sistema</p>
              <p class="text-amber-900 dark:text-slate-200 mt-0.5 font-bold">Compare os lançamentos salvos no banco com a nova extração do PDF. Escolha mesclar apenas as diferenças ou substituir totalmente.</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-xs font-bold">
            <div class="flex items-center gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-100 dark:bg-emerald-500/15 px-4 py-2 text-emerald-950 dark:text-emerald-300 shadow-xs">
              <span class="inline-block h-5 w-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <Icon name="lucide:sparkles" class="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              <span class="font-extrabold text-emerald-950 dark:text-emerald-300">{{ newItemsCount }} {{ newItemsCount === 1 ? 'item inédito' : 'itens inéditos' }} no PDF</span>
            </div>
            <div class="flex items-center gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/15 px-4 py-2 text-amber-950 dark:text-amber-300 shadow-xs">
              <span class="inline-block h-5 w-1 rounded-full bg-amber-600 dark:bg-amber-400" />
              <Icon name="lucide:scale" class="h-4 w-4 text-amber-800 dark:text-amber-400" />
              <span class="font-extrabold text-amber-950 dark:text-amber-300">Diferença: {{ formatMoney(totalDifference) }}</span>
            </div>
          </div>
        </div>

        <!-- Side-by-Side Comparison Grid -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Left Column: Existing DB Invoice -->
          <div class="flex flex-col gap-4 rounded-3xl border border-default/80 bg-elevated p-5.5 shadow-xs">
            <div class="flex items-center justify-between border-b border-default/60 pb-4">
              <div class="flex items-center gap-3 min-w-0">
                <UiBankLogo :bank-name="cardInfo.bankName" class="h-6 w-6 flex-shrink-0" />
                <div class="min-w-0">
                  <h3 class="text-sm font-extrabold text-highlighted flex items-center gap-2">
                    <Icon name="lucide:database" class="h-4 w-4 text-purple-700 dark:text-purple-400" />
                    Cadastrada no Sistema (MySQL)
                  </h3>
                  <p class="text-xs text-muted font-bold">{{ existingItems.length }} lançamentos registrados</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs uppercase font-extrabold tracking-wider text-muted">TOTAL BANCO</p>
                <div class="flex items-center gap-1.5 mt-0.5 justify-end">
                  <span class="inline-block h-4 w-1 rounded-full bg-purple-600 dark:bg-purple-400" />
                  <p class="text-base font-extrabold text-purple-950 dark:text-purple-300 font-mono">{{ formatMoney(existingTotal) }}</p>
                </div>
              </div>
            </div>

            <!-- Existing Items Table -->
            <div class="overflow-x-auto rounded-2xl border border-default/40 bg-default/60">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-default/60 text-muted bg-elevated/40 font-extrabold">
                    <th class="py-3 px-3.5">Origem</th>
                    <th class="py-3 px-3.5">Descrição</th>
                    <th class="py-3 px-3.5 text-right">Valor</th>
                    <th class="py-3 px-3.5 text-center">Parc.</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default/30">
                  <tr
                    v-for="item in existingItems"
                    :key="item.id"
                    class="text-default hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td class="py-2.5 px-3.5">
                      <span
                        :class="[
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider',
                          item.isRecurring ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30' :
                          item.extractedBy === 'manual' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30' :
                          'bg-blue-100 dark:bg-blue-500/20 text-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                        ]"
                      >
                        {{ item.isRecurring ? 'Recorrente' : (item.extractedBy || 'Importado') }}
                      </span>
                    </td>
                    <td class="py-2.5 px-3.5 font-extrabold text-highlighted max-w-[180px] truncate" :title="item.description">
                      {{ item.description }}
                    </td>
                    <td class="py-2.5 px-3.5 text-right font-extrabold font-mono text-default">
                      {{ formatMoney(item.originalAmount) }}
                    </td>
                    <td class="py-2.5 px-3.5 text-center text-muted font-mono font-bold">
                      {{ item.currentInstallment }}/{{ item.totalInstallments }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Column: New PDF Extracted Invoice -->
          <div class="flex flex-col gap-4 rounded-3xl border border-brand-200 dark:border-brand-500/30 bg-elevated p-5.5 shadow-xs">
            <div class="flex items-center justify-between border-b border-default/60 pb-4">
              <div class="flex items-center gap-3 min-w-0">
                <UiBankLogo :bank-name="cardInfo.bankName" class="h-6 w-6 flex-shrink-0" />
                <div class="min-w-0">
                  <h3 class="text-sm font-extrabold text-highlighted flex items-center gap-2">
                    <Icon name="lucide:file-text" class="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Nova Fatura (Extraída do PDF)
                  </h3>
                  <p class="text-xs text-muted font-bold">{{ pdfItems.length }} lançamentos encontrados</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs uppercase font-extrabold tracking-wider text-muted">TOTAL PDF</p>
                <div class="flex items-center gap-1.5 mt-0.5 justify-end">
                  <span class="inline-block h-4 w-1 rounded-full bg-brand-600 dark:bg-brand-500" />
                  <p class="text-base font-extrabold text-brand-700 dark:text-brand-400 font-mono">{{ formatMoney(pdfTotal) }}</p>
                </div>
              </div>
            </div>

            <!-- PDF Items Table with Diff Badges -->
            <div class="overflow-x-auto rounded-2xl border border-default/40 bg-default/60">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-default/60 text-muted bg-elevated/40 font-extrabold">
                    <th class="py-3 px-3.5">Status</th>
                    <th class="py-3 px-3.5">Descrição</th>
                    <th class="py-3 px-3.5 text-right">Valor</th>
                    <th class="py-3 px-3.5 text-center">Parc.</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default/30">
                  <tr
                    v-for="(item, idx) in analyzedPdfItems"
                    :key="idx"
                    :class="[
                      'transition-colors',
                      item.diffStatus === 'NEW' ? 'bg-emerald-50/70 dark:bg-emerald-500/[0.05] hover:bg-emerald-100/80 dark:hover:bg-emerald-500/[0.10]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    ]"
                  >
                    <td class="py-2.5 px-3.5">
                      <span
                        :class="[
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold tracking-wider',
                          item.diffStatus === 'NEW' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30' :
                          item.diffStatus === 'CHANGED' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30' :
                          'bg-elevated text-slate-800 dark:text-slate-300 border border-accented/50'
                        ]"
                      >
                        <Icon v-if="item.diffStatus === 'NEW'" name="lucide:sparkles" class="h-3 w-3 text-emerald-800 dark:text-emerald-400" />
                        <Icon v-else-if="item.diffStatus === 'CHANGED'" name="lucide:arrow-left-right" class="h-3 w-3 text-amber-800 dark:text-amber-400" />
                        {{ item.diffStatus === 'NEW' ? 'Novo Item' : item.diffStatus === 'CHANGED' ? 'Valor Alterado' : 'Mantido' }}
                      </span>
                    </td>
                    <td class="py-2.5 px-3.5 font-extrabold text-highlighted max-w-[180px] truncate" :title="item.description">
                      {{ item.description }}
                    </td>
                    <td class="py-2.5 px-3.5 text-right font-extrabold font-mono text-default">
                      {{ formatMoney(item.originalAmount) }}
                    </td>
                    <td class="py-2.5 px-3.5 text-center text-muted font-mono font-bold">
                      {{ item.currentInstallment }}/{{ item.totalInstallments }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p v-if="errorMsg" class="text-center text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-2xl p-3.5">
          {{ errorMsg }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-4 p-1">
        <button
          type="button"
          class="rounded-2xl border border-accented bg-elevated px-4.5 py-3 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer flex items-center gap-2"
          @click="onClose"
        >
          <Icon name="lucide:x" class="h-4 w-4 text-muted" />
          <span>Cancelar Importação</span>
        </button>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/15 px-5 py-3 text-xs font-extrabold text-amber-950 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/25 transition-[background-color,color,border-color,box-shadow,transform,opacity] disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs"
            :disabled="saving"
            @click="handleSave('all')"
          >
            <Icon v-if="saving" name="lucide:loader-2" class="h-4 w-4 animate-spin text-amber-900 dark:text-amber-400" />
            <Icon v-else name="lucide:replace" class="h-4 w-4 text-amber-900 dark:text-amber-400" />
            <span>{{ saving ? 'Processando...' : 'Sobrescrever Fatura Completa' }}</span>
          </button>

          <button
            type="button"
            class="rounded-2xl border border-brand-600 bg-brand-600 dark:bg-brand-500 hover:bg-brand-700 dark:hover:bg-brand-600 px-6 py-3 text-xs font-extrabold !text-white shadow-lg shadow-brand-500/30 transition-[background-color,color,border-color,box-shadow,transform,opacity] disabled:opacity-50 cursor-pointer flex items-center gap-2"
            :disabled="saving"
            @click="handleSave('differences')"
          >
            <Icon v-if="saving" name="lucide:loader-2" class="h-4 w-4 animate-spin !text-white" />
            <Icon v-else name="lucide:git-merge" class="h-4 w-4 !text-white" />
            <span class="!text-white font-extrabold">{{ saving ? 'Gravando no MySQL...' : 'Importar Apenas Diferenças (Recomendado)' }}</span>
          </button>
        </div>
      </div>
    </template>
  </UiAppModal>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useParse } from '~/composables/useParse'
import type { ParseResponse, ParsedInvoiceItem } from '~/types/ParseResponse'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'

/**
 * Duplicate invoice side-by-side comparison and merge modal.
 * Max contrast rules for Light and Dark modes.
 */

const props = defineProps<{
  parseResponse: ParseResponse
  onClose: () => void
  onConfirmed: () => void
}>()

const { confirmInvoice } = useParse()
const { register } = useOverlayStack()

const currentZIndex = ref(100)
let overlayHandle: OverlayHandle | null = null

onMounted(() => {
  overlayHandle = register('modal', () => props.onClose())
  currentZIndex.value = overlayHandle.zIndex
})

onUnmounted(() => {
  if (overlayHandle) {
    overlayHandle.unregister()
    overlayHandle = null
  }
})

const { data, existingInvoice } = props.parseResponse
const monthReferenced = data.monthReferenced

const cardInfo = computed(() => {
  if (existingInvoice?.card) return existingInvoice.card
  if (data.cards && data.cards.length > 0) return data.cards[0]
  return { bankName: 'Cartão', brand: '', last4Digits: '' }
})

const existingItems = computed(() => existingInvoice?.items || [])
const existingTotal = computed(() => existingInvoice?.totalAmount || 0)

const pdfCard = computed(() => data.cards[0] || { items: [] })
const pdfItems = computed(() => pdfCard.value.items || [])
const pdfTotal = computed(() =>
  data.declaredInvoiceTotal && data.declaredInvoiceTotal > 0
    ? data.declaredInvoiceTotal
    : pdfCard.value.totalAmount || pdfItems.value.reduce((sum, i) => sum + Number(i.originalAmount || i.amount || 0), 0)
)

const totalDifference = computed(() => Math.round((pdfTotal.value - existingTotal.value) * 100) / 100)

const analyzedPdfItems = computed(() => {
  return pdfItems.value.map((item) => {
    const amount = Number(item.originalAmount ?? item.amount ?? 0)
    const match = existingItems.value.find(
      (e) => e.description.toLowerCase().trim() === item.description.toLowerCase().trim() &&
        e.currentInstallment === Number(item.currentInstallment || 1) &&
        e.totalInstallments === Number(item.totalInstallments || 1)
    )

    let diffStatus: 'NEW' | 'CHANGED' | 'KEPT' = 'NEW'
    if (match) {
      if (Math.abs(match.originalAmount - amount) < 0.01) {
        diffStatus = 'KEPT'
      } else {
        diffStatus = 'CHANGED'
      }
    }

    return {
      ...item,
      originalAmount: amount,
      diffStatus,
    }
  })
})

const newItemsCount = computed(() => analyzedPdfItems.value.filter((i) => i.diffStatus === 'NEW').length)

const saving = ref(false)
const errorMsg = ref<string | null>(null)

function formatMonthYearLong(yearMonthStr: string): string {
  if (!yearMonthStr || !yearMonthStr.includes('-')) return yearMonthStr
  const [y, m] = yearMonthStr.split('-')
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const mIdx = parseInt(m, 10) - 1
  if (mIdx >= 0 && mIdx < 12) return `${months[mIdx]} / ${y}`
  return yearMonthStr
}

async function handleSave(mode: 'all' | 'differences') {
  saving.value = true
  errorMsg.value = null

  try {
    const payloadCards = data.cards.map((c) => ({
      bankName: c.bankName,
      brand: c.brand,
      last4Digits: c.last4Digits,
      totalAmount: c.totalAmount,
      items: c.items.map((i) => ({
        description: i.description,
        amount: Number(i.originalAmount ?? i.amount ?? 0),
        currentInstallment: Number(i.currentInstallment || 1),
        totalInstallments: Number(i.totalInstallments || 1),
        itemType: i.itemType || 'PURCHASE',
      })),
    }))

    await confirmInvoice({
      monthReferenced,
      dueDate: data.dueDate || undefined,
      overwriteMode: mode,
      pdfPassword: data.usedPassword || undefined,
      cards: payloadCards,
      declaredInvoiceTotal: data.declaredInvoiceTotal || undefined,
    })

    props.onConfirmed()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Erro ao gravar alterações no MySQL.'
  } finally {
    saving.value = false
  }
}
</script>
