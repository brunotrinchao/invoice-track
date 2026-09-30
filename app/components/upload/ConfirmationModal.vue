<template>
  <UiAppModal
    :open="true"
    :title="isDuplicate ? 'Fatura duplicada — revisar antes de substituir' : 'Conferência e revisão de fatura extraída'"
    :description="modalDescription"
    max-width="5xl"
    @close="onClose"
  >
    <template #default>
      <div class="flex flex-col gap-6">
        <!-- Duplicate Invoice Alert Banner -->
        <div v-if="isDuplicate" class="flex items-center gap-4 rounded-3xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-5 text-amber-950 dark:text-amber-200 shadow-xs">
          <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-200 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300">
            <Icon name="lucide:alert-triangle" class="h-6 w-6" />
          </div>
          <div class="text-xs min-w-0">
            <p class="font-extrabold text-amber-950 dark:text-amber-300 text-sm">Fatura Duplicada Detectada</p>
            <p class="text-amber-900 dark:text-slate-200 mt-0.5 font-bold">Esta fatura já possui lançamentos cadastrados no sistema. Para atualizar e substituir as compras existentes, marque a opção <strong>"Substituir se já existir"</strong> abaixo.</p>
          </div>
        </div>

        <!-- Banner & Controls -->
        <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-default/80 bg-elevated/90 p-5 shadow-sm">
          <div class="flex items-center gap-3.5">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
              <Icon name="lucide:sliders-horizontal" class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm font-extrabold text-highlighted">Configurações da Fatura</p>
              <p class="text-xs text-muted font-bold">Confira os valores e selecione os itens que deseja salvar.</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-muted">Mês de referência:</label>
              <input
                v-model="monthReferenced"
                type="month"
                aria-label="Mês de referência"
                class="rounded-2xl border border-accented bg-default px-3.5 py-2 text-xs text-highlighted font-extrabold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-muted">Vencimento:</label>
              <input
                v-model="dueDate"
                type="date"
                aria-label="Vencimento"
                class="rounded-2xl border border-accented bg-default px-3.5 py-2 text-xs text-highlighted font-extrabold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
              />
            </div>
            <label class="flex items-center gap-2.5 cursor-pointer text-xs font-extrabold text-default hover:text-brand-600 dark:hover:text-white select-none">
              <input
                v-model="overwriteExisting"
                type="checkbox"
                aria-label="Substituir fatura se já existir"
                class="h-4.5 w-4.5 rounded-lg border-accented bg-default text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span>Substituir se já existir</span>
            </label>
            <label class="flex items-center gap-2.5 cursor-pointer text-xs font-extrabold text-default hover:text-emerald-600 dark:hover:text-emerald-400 select-none">
              <input
                v-model="markAsPaid"
                type="checkbox"
                aria-label="Fatura já paga"
                class="h-4.5 w-4.5 rounded-lg border-accented bg-default text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Fatura já paga</span>
            </label>
          </div>
        </div>

        <!-- Cards Tabs (if multiple cards) -->
        <div v-if="cards.length > 1" class="flex gap-2.5 border-b border-default/80 pb-3.5 overflow-x-auto">
          <button
            v-for="(c, idx) in cards"
            :key="idx"
            type="button"
            :class="[
              'flex items-center gap-2.5 rounded-2xl px-4.5 py-2.5 text-xs font-bold transition-[background-color,color,border-color,box-shadow,transform,opacity] cursor-pointer',
              activeCardIndex === idx
                ? 'bg-brand-50 dark:bg-brand-500/20 border border-brand-300 dark:border-brand-500/50 text-brand-800 dark:text-brand-300 shadow-xs font-extrabold'
                : 'border border-default/80 bg-elevated/60 text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-card'
            ]"
            @click="activeCardIndex = idx"
          >
            <UiBankLogo :bank-name="c.bankName" class="h-4.5 w-4.5" />
            <span>{{ c.bankName }} •••• {{ c.last4Digits }}</span>
          </button>
        </div>

        <!-- Selected Card Items Table -->
        <div v-if="currentCard" class="flex flex-col gap-4 rounded-3xl border border-default/80 bg-elevated/90 p-5.5 shadow-sm">
          <!-- Duplicata do cartão selecionado/atribuído -->
          <div
            v-if="existingForCard[activeCardIndex]"
            role="alert"
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3.5 text-amber-950 dark:text-amber-200"
          >
            <p class="text-xs font-bold">
              Este cartão já possui fatura de {{ formatMonthYearLong(monthReferenced) }} com
              {{ existingForCard[activeCardIndex].itemCount }} lançamento(ns) ({{ formatMoney(existingForCard[activeCardIndex].total) }}).
              Confirme abaixo para mesclar/sobrescrever.
            </p>
            <label class="flex items-center gap-2 text-xs font-extrabold cursor-pointer select-none">
              <input
                v-model="overwriteExisting"
                type="checkbox"
                class="h-4.5 w-4.5 rounded-lg border-accented bg-default text-brand-600 cursor-pointer"
              />
              <span>Substituir se já existir</span>
            </label>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <UiBankLogo :bank-name="currentCard.bankName" class="h-6 w-6" />
              <h3 class="text-sm font-extrabold text-highlighted">
                Compras — {{ currentCard.bankName }} (•••• {{ currentCard.last4Digits }})
              </h3>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-muted shrink-0" :for="`card-select-${activeCardIndex}`">Cartão:</label>
              <UiAppSelect
                :id="`card-select-${activeCardIndex}`"
                :model-value="selectedExistingCard[activeCardIndex] ?? ''"
                :options="cardSelectOptions"
                class="min-w-[210px]"
                aria-label="Associar a um cartão existente"
                @update:model-value="onAssignExistingCard(activeCardIndex, $event)"
              />
            </div>
            <div class="flex items-center gap-2.5">
              <button
                type="button"
                class="rounded-2xl border border-brand-300 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-4 py-2 text-xs font-extrabold text-brand-800 dark:text-brand-300 transition-[background-color,color,border-color,box-shadow,transform,opacity] hover:bg-brand-100 dark:hover:bg-brand-500/20 cursor-pointer flex items-center gap-1.5 shadow-xs"
                @click="addCardPurchaseItem(activeCardIndex)"
              >
                <Icon name="lucide:plus" class="h-3.5 w-3.5 text-brand-600" />
                Nova Compra
              </button>
              <button
                type="button"
                class="rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-950 dark:text-emerald-300 transition-[background-color,color,border-color,box-shadow,transform,opacity] hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer flex items-center gap-1.5 shadow-xs"
                @click="addCardCreditItem(activeCardIndex)"
              >
                <Icon name="lucide:plus" class="h-3.5 w-3.5 text-emerald-600" />
                Novo Crédito
              </button>
            </div>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-default/60 bg-slate-50/50 dark:bg-dark-bg/60">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-default/60 text-muted bg-elevated/40 font-extrabold">
                  <th class="py-3 px-3.5 w-12 text-center">Incluir</th>
                  <th class="py-3 px-3.5">Descrição</th>
                  <th class="py-3 px-3.5 w-36">Valor (R$)</th>
                  <th class="py-3 px-3.5 w-32 text-center">Parcelas</th>
                  <th class="py-3 px-3.5 w-16 text-right">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default/30">
                <tr
                  v-for="(item, idx) in currentCard.items"
                  :key="idx"
                  :class="[item.selected ? 'text-highlighted' : 'text-slate-400 dark:text-dark-muted opacity-40']"
                >
                  <td class="py-2.5 px-3.5 text-center">
                    <input
                      type="checkbox"
                      :checked="item.selected"
                      class="h-4.5 w-4.5 rounded-md border-accented bg-default text-brand-600 focus:ring-brand-500 cursor-pointer"
                      @change="toggleCardItemSelection(activeCardIndex, idx)"
                    />
                  </td>
                  <td class="py-2.5 px-3.5">
                    <input
                      v-model="item.description"
                      type="text"
                      aria-label="Descrição da compra"
                      class="w-full rounded-xl border border-accented bg-default px-3 py-1.5 text-xs font-extrabold text-highlighted focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
                    />
                  </td>
                  <td class="py-2.5 px-3.5">
                    <input
                      v-model.number="item.originalAmount"
                      type="number"
                      step="0.01"
                      aria-label="Valor da compra"
                      class="w-full rounded-xl border border-accented bg-default px-3 py-1.5 text-xs text-highlighted font-mono font-extrabold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
                    />
                  </td>
                  <td class="py-2.5 px-3.5">
                    <div class="flex items-center justify-center gap-1">
                      <input
                        v-model.number="item.currentInstallment"
                        type="number"
                        min="1"
                        aria-label="Parcela atual"
                        class="w-12 rounded-xl border border-accented bg-default px-2 py-1.5 text-xs text-highlighted font-mono font-extrabold text-center focus:border-brand-500 focus:outline-none"
                      />
                      <span class="text-dimmed font-extrabold">/</span>
                      <input
                        v-model.number="item.totalInstallments"
                        type="number"
                        min="1"
                        aria-label="Total de parcelas"
                        class="w-12 rounded-xl border border-accented bg-default px-2 py-1.5 text-xs text-highlighted font-mono font-extrabold text-center focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </td>
                  <td class="py-2.5 px-3.5 text-right">
                    <button
                      type="button"
                      aria-label="Remover compra"
                      class="rounded-xl p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      @click="removeCardItem(activeCardIndex, idx)"
                    >
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Invoice Fees & Credits -->
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <!-- Fees -->
          <div class="flex flex-col gap-3.5 rounded-3xl border border-default/80 bg-elevated/90 p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Icon name="lucide:receipt-text" class="h-4 w-4 text-amber-700 dark:text-amber-400" />
                Tarifas / Encargos
              </h4>
              <button
                type="button"
                class="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-950 dark:text-amber-300 transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/20 cursor-pointer flex items-center gap-1"
                @click="addInvoiceFeeItem()"
              >
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                Adicionar Tarifa
              </button>
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(fee, idx) in invoiceFees"
                :key="idx"
                class="flex items-center gap-2.5 rounded-2xl bg-default/60 p-2.5 border border-default/50"
              >
                <input
                  type="checkbox"
                  :checked="fee.selected"
                  class="h-4.5 w-4.5 rounded-md border-accented bg-default text-brand-600 focus:ring-brand-500 cursor-pointer"
                  @change="toggleFeeSelection(idx)"
                />
                <input
                  v-model="fee.description"
                  type="text"
                  aria-label="Descrição da tarifa"
                  class="flex-1 rounded-xl border border-accented bg-default px-3 py-1.5 text-xs text-highlighted font-bold focus:border-brand-500 focus:outline-none"
                />
                <input
                  v-model.number="fee.originalAmount"
                  type="number"
                  step="0.01"
                  aria-label="Valor da tarifa"
                  class="w-24 rounded-xl border border-accented bg-default px-3 py-1.5 text-xs text-highlighted font-mono font-extrabold focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Remover tarifa"
                  class="rounded-xl p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  @click="removeFeeItem(idx)"
                >
                  <Icon name="lucide:trash-2" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Credits -->
          <div class="flex flex-col gap-3.5 rounded-3xl border border-default/80 bg-elevated/90 p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Icon name="lucide:badge-percent" class="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Créditos / Descontos
              </h4>
              <button
                type="button"
                class="rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-950 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer flex items-center gap-1"
                @click="addInvoiceCreditItem()"
              >
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                Adicionar Crédito
              </button>
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(cred, idx) in invoiceCredits"
                :key="idx"
                class="flex items-center gap-2.5 rounded-2xl bg-default/60 p-2.5 border border-default/50"
              >
                <input
                  type="checkbox"
                  :checked="cred.selected"
                  class="h-4.5 w-4.5 rounded-md border-accented bg-default text-brand-600 focus:ring-brand-500 cursor-pointer"
                  @change="toggleCreditSelection(idx)"
                />
                <input
                  v-model="cred.description"
                  type="text"
                  aria-label="Descrição do crédito"
                  class="flex-1 rounded-xl border border-accented bg-default px-3 py-1.5 text-xs text-highlighted font-bold focus:border-brand-500 focus:outline-none"
                />
                <input
                  v-model.number="cred.originalAmount"
                  type="number"
                  step="0.01"
                  aria-label="Valor do crédito"
                  class="w-24 rounded-xl border border-accented bg-default px-3 py-1.5 text-xs text-highlighted font-mono font-extrabold focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Remover crédito"
                  class="rounded-xl p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  @click="removeCreditItem(idx)"
                >
                  <Icon name="lucide:trash-2" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Reconciliation Box (SE-T Stat Cards Style) -->
        <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-default/80 bg-elevated/90 p-5 shadow-sm">
          <div class="flex flex-wrap items-center gap-8">
            <div class="flex items-center gap-3">
              <span class="inline-block h-8 w-1 rounded-full bg-slate-400 dark:bg-slate-700" />
              <div>
                <p class="text-xs uppercase font-extrabold tracking-wider text-muted">Total Declarado PDF</p>
                <p class="text-base font-extrabold text-highlighted font-mono mt-0.5">{{ formatMoney(totalGlobalDeclared) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="inline-block h-8 w-1 rounded-full bg-brand-600 dark:bg-brand-500" />
              <div>
                <p class="text-xs uppercase font-extrabold tracking-wider text-muted">Total Selecionado</p>
                <p class="text-base font-extrabold text-brand-700 dark:text-brand-400 font-mono mt-0.5">{{ formatMoney(totalGlobalSelected) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="inline-block h-8 w-1 rounded-full bg-amber-500" />
              <div>
                <p class="text-xs uppercase font-extrabold tracking-wider text-muted">Diferença</p>
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold font-mono mt-0.5',
                    isGlobalTotalMatched
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                  ]"
                >
                  {{ isGlobalTotalMatched ? 'Batido ✓' : formatMoney(totalGlobalDifference) }}
                </span>
              </div>
            </div>
          </div>

          <p v-if="errorMsg" class="text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-2xl px-3.5 py-2">
            {{ errorMsg }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3.5 p-1">
        <button
          type="button"
          class="rounded-2xl border border-accented bg-elevated px-4.5 py-3 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-[background-color,color,border-color,box-shadow,transform,opacity]"
          @click="onClose"
        >Cancelar</button>
        <button
          type="button"
          class="rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 px-6 py-3 text-xs font-extrabold !text-white shadow-lg shadow-brand-500/25 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="saving || (isDuplicate && !overwriteExisting)"
          @click="handleConfirmSave"
        >
          <Icon v-if="saving" name="lucide:loader-2" class="h-4 w-4 animate-spin !text-white" />
          <Icon v-else name="lucide:check-circle" class="h-4 w-4 !text-white" />
          <span class="!text-white font-extrabold">{{ isDuplicate && !overwriteExisting ? 'Marque Substituir para Salvar' : (saving ? 'Gravando no MySQL...' : 'Confirmar e Salvar Fatura') }}</span>
        </button>
      </div>
    </template>
  </UiAppModal>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/money'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useParse } from '~/composables/useParse'
import { useCardStore } from '~/stores/cardStore'
import { apiUrl } from '~/utils/api'
import type { ParseResponse, ParsedInvoiceItem, ParsedCardTransactions } from '~/types/ParseResponse'
import type { Invoice } from '~/types/Invoice'
import { useOverlayStack, type OverlayHandle } from '~/composables/useOverlayStack'

/**
 * Human-in-the-loop confirmation modal for parsed invoices.
 * Designed based on the SE-T modern UI design system (pastel cards, electric blue CTAs, rounded-3xl surfaces).
 */

type SelectableItem = ParsedInvoiceItem & { selected: boolean }

const props = defineProps<{
  parseResponse: ParseResponse
  /** P2: arquivo origem + posição no lote (múltiplos uploads) */
  reviewMeta?: { fileName: string; index: number; total: number } | null
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
  // Cartões existentes p/ re-associar quando a IA não identifica (ex: Atacadão)
  if (cardStore.cards.length === 0) void cardStore.fetchAll()
})

onUnmounted(() => {
  if (overlayHandle) {
    overlayHandle.unregister()
    overlayHandle = null
  }
})

const { data, isDuplicate } = props.parseResponse

function getItemCategory(desc: string, amount: number, totalInstallments: number = 1, bankName?: string): string {
  if (bankName === 'Atacadão' && totalInstallments > 1) {
    return 'PURCHASE'
  }
  if (amount < 0 || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(desc)) {
    return 'CREDIT'
  }
  const upper = (desc || '').toUpperCase()
  if (upper.includes('MULTA')) return 'FINE'
  if (upper.includes('JUROS') || upper.includes('MORA') || upper.includes('ROTATIVO') || upper.includes('ENCARGO') || upper.includes('ENCARGOS')) return 'INTEREST'
  if (upper.includes('IOF') || upper.includes('IMPOSTO') || upper.includes('TRIBUTO')) return 'TAX'
  if (upper.includes('TARIFA') || upper.includes('ANUIDADE') || upper.includes('TAXA') || upper.includes('SEGURO') || upper.includes('PROTEÇÃO') || upper.includes('PROTECAO')) {
    return 'FEE'
  }
  return 'PURCHASE'
}

function formatMonthYearLong(yearMonthStr: string): string {
  if (!yearMonthStr || !yearMonthStr.includes('-')) return yearMonthStr
  const [y, m] = yearMonthStr.split('-')
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const mIdx = parseInt(m, 10) - 1
  if (mIdx >= 0 && mIdx < 12) return `${months[mIdx]} / ${y}`
  return yearMonthStr
}

const monthReferenced = ref(data.monthReferenced)
const dueDate = ref(data.dueDate || '')
const overwriteExisting = ref(false)
const markAsPaid = ref(false)

/** Cartões existentes do usuário — para re-associar quando a IA erra o cartão (ex: Atacadão). */
const cardStore = useCardStore()
const cardSelectOptions = computed(() => [
  { value: '', label: 'Identificação da IA (manter)' },
  ...cardStore.cards.map((c) => ({
    value: c.id,
    label: `${c.bankName} •••• ${c.last4Digits}`,
  })),
])
const selectedExistingCard = ref<Record<number, string>>({})

/** Duplicata detectada por card idx após atribuição/seleção. */
const existingForCard = ref<Record<number, { itemCount: number; total: number } | null>>({})

async function checkExistingForCard(idx: number) {
  const card = cards.value[idx]
  if (!card) {
    existingForCard.value[idx] = null
    return
  }
  try {
    const qs = new URLSearchParams({
      cardId: 'all',
      monthYear: monthReferenced.value,
    })
    const res = await fetch(apiUrl(`/api/invoices?${qs.toString()}`))
    if (!res.ok) return
    const data = (await res.json()) as { success: boolean; invoices: Invoice[] }
    const match = (data.invoices ?? []).find(
      (inv) =>
        inv.card &&
        inv.card.bankName === card.bankName &&
        inv.card.last4Digits === card.last4Digits &&
        inv.items?.length > 0,
    )
    existingForCard.value[idx] = match
      ? { itemCount: match.items.length, total: Number(match.totalAmount ?? 0) }
      : null
    if (match) overwriteExisting.value = true
  } catch {
    /* silencioso — banner só enriquece UX */
  }
}

function onAssignExistingCard(idx: number, cardId: string | number) {
  const card = cardStore.cards.find((c) => c.id === String(cardId))
  if (!card) {
    delete selectedExistingCard.value[idx]
    existingForCard.value[idx] = null
    return
  }
  selectedExistingCard.value[idx] = String(cardId)
  // Re-associar identidade do card extraído ao cartão escolhido
  cards.value[idx] = {
    ...cards.value[idx],
    bankName: card.bankName,
    brand: card.brand,
    last4Digits: card.last4Digits,
  }
  void checkExistingForCard(idx)
}

/** Qual IA gerou a extração exibida (Gemini principal / fallback / local). */
const extractionSourceLabel = computed(() => {
  switch (data.extractedBy) {
    case 'gemini':
      return 'Extraída por Gemini'
    case 'gpt':
      return 'Extraída por IA de contingência (fallback)'
    case 'regex':
      return 'Extraída por algoritmo local'
    default:
      return 'Extraída por IA'
  }
})

const initialCards: ParsedCardTransactions[] = []
const initialInvoiceFees: SelectableItem[] = []
const initialInvoiceCredits: SelectableItem[] = []

for (const c of data.cards) {
  const cardItems: SelectableItem[] = []
  for (const i of c.items) {
    const val = Number(i.originalAmount ?? i.amount ?? 0)
    const totInst = Number(i.totalInstallments || 1)
    const cat = i.itemType || getItemCategory(i.description, val, totInst)
    const itemObj: SelectableItem = {
      ...i,
      originalAmount: val,
      amount: val,
      currentInstallment: Number(i.currentInstallment || 1),
      totalInstallments: Number(i.totalInstallments || 1),
      selected: i.selected ?? true,
    }
    if (cat === 'FEE') {
      initialInvoiceFees.push(itemObj)
    } else if (cat === 'CREDIT') {
      initialInvoiceCredits.push(itemObj)
    } else {
      cardItems.push(itemObj)
    }
  }
  initialCards.push({ ...c, items: cardItems })
}

const cards = ref<ParsedCardTransactions[]>(initialCards)
const invoiceFees = ref<SelectableItem[]>(initialInvoiceFees)
const invoiceCredits = ref<SelectableItem[]>(initialInvoiceCredits)

const activeCardIndex = ref(0)
const saving = ref(false)
const errorMsg = ref<string | null>(null)

const currentCard = computed(() => cards.value[activeCardIndex.value] || cards.value[0])

function toggleCardItemSelection(cardIdx: number, itemIdx: number) {
  const item = cards.value[cardIdx].items[itemIdx]
  item.selected = !item.selected
}

function removeCardItem(cardIdx: number, itemIdx: number) {
  cards.value[cardIdx].items.splice(itemIdx, 1)
}

function addCardPurchaseItem(cardIdx: number) {
  cards.value[cardIdx].items.push({
    description: 'Compra Manual no Cartão',
    originalAmount: 50.0,
    amount: 50.0,
    currentInstallment: 1,
    totalInstallments: 1,
    selected: true,
  })
}

function addCardCreditItem(cardIdx: number) {
  cards.value[cardIdx].items.push({
    description: 'Estorno / Crédito no Cartão',
    originalAmount: -50.0,
    amount: -50.0,
    currentInstallment: 1,
    totalInstallments: 1,
    selected: true,
  })
}

function toggleFeeSelection(idx: number) {
  invoiceFees.value[idx].selected = !invoiceFees.value[idx].selected
}

function removeFeeItem(idx: number) {
  invoiceFees.value.splice(idx, 1)
}

function addInvoiceFeeItem(defaultAmount?: number) {
  const val = defaultAmount ? Math.abs(defaultAmount) : 15.0
  invoiceFees.value.push({
    description: 'Tarifa / Encargos / Multa / IOF da Fatura',
    originalAmount: val,
    amount: val,
    currentInstallment: 1,
    totalInstallments: 1,
    selected: true,
  })
}

function toggleCreditSelection(idx: number) {
  invoiceCredits.value[idx].selected = !invoiceCredits.value[idx].selected
}

function removeCreditItem(idx: number) {
  invoiceCredits.value.splice(idx, 1)
}

function addInvoiceCreditItem(defaultCreditAmount?: number) {
  const val = defaultCreditAmount ? -Math.abs(defaultCreditAmount) : -50.0
  invoiceCredits.value.push({
    description: 'Crédito Geral / Desconto na Fatura',
    originalAmount: val,
    amount: val,
    currentInstallment: 1,
    totalInstallments: 1,
    selected: true,
  })
}

const totalPurchasesOnly = computed(() =>
  cards.value.reduce(
    (sum, c) => sum + c.items.filter((i) => i.selected && Number(i.originalAmount || 0) > 0).reduce((iSum, i) => iSum + Number(i.originalAmount || 0), 0),
    0,
  ),
)

const totalCardCreditsOnly = computed(() =>
  cards.value.reduce(
    (sum, c) => sum + c.items.filter((i) => i.selected && Number(i.originalAmount || 0) < 0).reduce((iSum, i) => iSum + Number(i.originalAmount || 0), 0),
    0,
  ),
)

const totalFeesSelected = computed(() =>
  invoiceFees.value.filter((i) => i.selected).reduce((sum, i) => sum + Number(i.originalAmount || 0), 0),
)

const totalInvoiceCreditsSelected = computed(() =>
  invoiceCredits.value.filter((i) => i.selected).reduce((sum, i) => {
    const val = Number(i.originalAmount || 0)
    return sum + (val > 0 ? -val : val)
  }, 0),
)

const totalAllCreditsCombined = computed(() => totalCardCreditsOnly.value + totalInvoiceCreditsSelected.value)

const totalGlobalSelected = computed(() => totalPurchasesOnly.value + totalFeesSelected.value + totalAllCreditsCombined.value)

const totalGlobalDeclared = computed(() =>
  data.declaredInvoiceTotal && data.declaredInvoiceTotal > 0
    ? data.declaredInvoiceTotal
    : cards.value.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0),
)

const totalGlobalDifference = computed(() => Math.round((totalGlobalSelected.value - totalGlobalDeclared.value) * 100) / 100)

const isGlobalTotalMatched = computed(() => Math.abs(totalGlobalDifference.value) < 0.02)

async function handleConfirmSave() {
  const totalSelectedItems =
    cards.value.reduce((sum, c) => sum + c.items.filter((i) => i.selected).length, 0) +
    invoiceFees.value.filter((i) => i.selected).length +
    invoiceCredits.value.filter((i) => i.selected).length

  if (isDuplicate && !overwriteExisting.value) {
    errorMsg.value = 'Esta fatura já existe. Marque a opção "Substituir se já existir" para prosseguir com a substituição.'
    return
  }

  if (totalSelectedItems === 0) {
    errorMsg.value = 'Selecione ao menos um item ou taxa para salvar a fatura.'
    return
  }

  saving.value = true
  errorMsg.value = null

  try {
    const payloadCards = cards.value.map((c, idx) => {
      const cardPurchases = c.items
        .filter((i) => i.selected)
        .map((i) => {
          const val = Number(i.originalAmount ?? i.amount ?? 0)
          return {
            description: i.description,
            amount: val,
            currentInstallment: Number(i.currentInstallment || 1),
            totalInstallments: Number(i.totalInstallments || 1),
            itemType: i.itemType || getItemCategory(i.description, val),
          }
        })

      if (idx === 0) {
        const feesPayload = invoiceFees.value
          .filter((i) => i.selected)
          .map((i) => {
            const val = Math.abs(Number(i.originalAmount ?? i.amount ?? 0))
            const cat = i.itemType || getItemCategory(i.description, val)
            const itemType = cat === 'PURCHASE' || cat === 'CREDIT' ? 'FEE' : cat
            return {
              description: i.description,
              amount: val,
              currentInstallment: Number(i.currentInstallment || 1),
              totalInstallments: Number(i.totalInstallments || 1),
              itemType,
            }
          })
        const creditsPayload = invoiceCredits.value
          .filter((i) => i.selected)
          .map((i) => {
            const val = Number(i.originalAmount ?? i.amount ?? 0)
            return {
              description: i.description,
              amount: val > 0 ? -val : val,
              currentInstallment: Number(i.currentInstallment || 1),
              totalInstallments: Number(i.totalInstallments || 1),
              itemType: 'CREDIT',
            }
          })
        cardPurchases.push(...feesPayload, ...creditsPayload)
      }

      return {
        bankName: c.bankName,
        brand: c.brand,
        last4Digits: c.last4Digits,
        totalAmount: cardPurchases.reduce((s, i) => s + Number(i.amount || 0), 0),
        items: cardPurchases,
      }
    })

    await confirmInvoice({
      monthReferenced: monthReferenced.value,
      dueDate: dueDate.value || undefined,
      overwriteExisting: overwriteExisting.value,
      isPaid: markAsPaid.value,
      pdfPassword: data.usedPassword || undefined,
      cards: payloadCards,
      declaredInvoiceTotal: data.declaredInvoiceTotal || undefined,
    })

    props.onConfirmed()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Erro ao gravar fatura no MySQL.'
  } finally {
    saving.value = false
  }
}
</script>