<template>
  <div class="flex flex-col gap-6 max-w-3xl">
    <header>
      <h1 class="text-2xl font-bold text-highlighted">Configurações</h1>
      <p class="text-sm text-muted">Manutenção da base de dados e preferências do sistema</p>
    </header>

    <!-- ===== 1. Base de dados: status + perigo numa única seção temática ===== -->
    <section class="flex flex-col gap-3">
      <div class="flex items-center gap-2 px-1">
        <Icon name="lucide:database" class="h-4 w-4 text-brand-500" />
        <h2 class="text-xs font-extrabold uppercase tracking-wider text-muted">Base de dados</h2>
        <span v-if="!loadingStatus && !statusError" class="text-[11px] text-dimmed">{{ totalRecords }} registros</span>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div v-for="row in statusRows" :key="row.label" class="rounded-xl glass-card px-4 py-3.5">
          <p class="text-[10px] font-extrabold uppercase tracking-wider text-muted">{{ row.label }}</p>
          <p class="mt-1 text-lg font-bold text-highlighted">{{ row.value }}</p>
        </div>
      </div>

      <!-- Perigo: mesmo tema (base), peso visual distinto -->
      <div class="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5" />Limpar base de dados
            </p>
            <p class="mt-0.5 text-[11px] text-muted">Remove todos os cartões, faturas, lançamentos e recorrências — irreversível.</p>
          </div>
          <UiAppButton variant="danger" size="sm" @click="openConfirm">Limpar</UiAppButton>
        </div>
      </div>
    </section>

<!-- ===== 2. Instruções da IA: seção própria, header com ícone e contagem ===== -->
    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Icon name="lucide:sparkles" class="h-4 w-4 text-brand-500" />
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-muted">Instruções da IA</h2>
          <span class="text-[11px] text-dimmed">{{ instructions.length }} banco(s)</span>
        </div>
        <UiAppButton size="sm" @click="openCreate">
          <Icon name="lucide:file-up" class="mr-1.5 h-3.5 w-3.5" />Adicionar por PDF
        </UiAppButton>
      </div>

      <p v-if="loadingInstructions" class="text-xs text-muted px-1">Carregando instruções…</p>
      <p v-else-if="instructionsError" role="alert" class="text-xs text-red-500 px-1">{{ instructionsError }}</p>
      <div v-else-if="instructions.length === 0" class="glass-card rounded-2xl px-6 py-8 text-center">
        <Icon name="lucide:graduation-cap" class="mx-auto h-8 w-8 text-dimmed" />
        <p class="mt-2 text-xs text-muted">Nenhuma instrução cadastrada</p>
        <p class="mt-0.5 text-[11px] text-dimmed">Envie uma fatura de exemplo para a IA aprender o formato</p>
      </div>
      <div v-else class="grid grid-cols-1 gap-3">
        <SettingsBankInstructionCard
          v-for="inst in instructions"
          :key="inst.id"
          :instruction="inst"
          @edit="openEdit"
          @remove="askRemove"
        />
      </div>
    </section>

    <!-- Drawer de instrução -->
    <SettingsBankInstructionDrawer
      :open="instructionDrawerOpen"
      :instruction="editingInstruction"
      @close="closeInstructionDrawer"
      @saved="onInstructionSaved"
    />

    <!-- Confirmação destrutiva: exige digitar a frase (agência do usuário) -->
    <UiAppModal
      :open="confirmOpen"
      title="Limpar toda a base de dados?"
      description="Esta ação apaga permanentemente todos os registros. Não pode ser desfeita."
      max-width="md"
      @close="closeConfirm"
    >
      <div class="flex flex-col gap-4">
        <div class="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-xs text-red-600 dark:text-red-400 font-bold flex items-start gap-2">
          <Icon name="lucide:alert-triangle" class="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Serão removidos: {{ statusRows.find(r => r.label === 'Cartões')?.value ?? '?' }} cartão(ões),
            {{ statusRows.find(r => r.label === 'Faturas')?.value ?? '?' }} fatura(s),
            {{ statusRows.find(r => r.label === 'Itens')?.value ?? '?' }} lançamento(s) e
            {{ statusRows.find(r => r.label === 'Recorrentes')?.value ?? '?' }} recorrente(s).
          </span>
        </div>
        <p class="text-xs text-muted">Digite <strong class="text-red-500">LIMPAR TUDO</strong> para habilitar a ação:</p>
        <input
          v-model="confirmText"
          type="text"
          aria-label="Digitar LIMPAR TUDO para confirmar"
          class="w-full rounded-xl border border-accented bg-default px-3 py-2 text-sm text-highlighted focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <p v-if="clearError" role="alert" class="text-xs text-red-500 font-bold">{{ clearError }}</p>
        <div class="flex items-center justify-end gap-2">
          <UiAppButton variant="ghost" @click="closeConfirm">Cancelar</UiAppButton>
          <UiAppButton
            variant="danger"
            :disabled="confirmText !== 'LIMPAR TUDO' || clearing"
            @click="clearDatabase"
          >{{ clearing ? 'Limpando…' : 'Apagar tudo' }}</UiAppButton>
        </div>
      </div>
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
import { apiUrl } from '~/utils/api'
import { useBankInstructions } from '~/composables/useBankInstructions'
import type { BankInstruction } from '~/types/BankInstruction'

/** Total de registros p/ o header da seção base. */
const totalRecords = computed(() => statusRows.value.reduce((sum, r) => sum + r.value, 0))
import type { BankInstruction } from '~/types/BankInstruction'

definePageMeta({ title: 'Configurações' })

const loadingStatus = ref(true)
const statusError = ref('')
const statusRows = ref<{ label: string; value: number }[]>([])

async function loadStatus() {
  loadingStatus.value = true
  statusError.value = ''
  try {
    const res = await fetch(apiUrl('/api/settings/status'))
    if (!res.ok) throw new Error(`GET /api/settings/status -> ${res.status}`)
    const data = (await res.json()) as { success: boolean; status: Record<string, number> }
    statusRows.value = [
      { label: 'Cartões', value: data.status.cards },
      { label: 'Faturas', value: data.status.invoices },
      { label: 'Itens', value: data.status.items },
      { label: 'Taxas', value: data.status.fees },
      { label: 'Recorrentes', value: data.status.recurring },
    ]
  } catch (e) {
    statusError.value = e instanceof Error ? e.message : 'Erro ao carregar status.'
  } finally {
    loadingStatus.value = false
  }
}

// ===== Confirmação destrutiva =====
const confirmOpen = ref(false)
const confirmText = ref('')
const clearing = ref(false)
const clearError = ref('')

function openConfirm() {
  confirmText.value = ''
  clearError.value = ''
  confirmOpen.value = true
}

function closeConfirm() {
  confirmOpen.value = false
}

async function clearDatabase() {
  if (confirmText.value !== 'LIMPAR TUDO') return
  clearing.value = true
  clearError.value = ''
  try {
    const res = await fetch(apiUrl('/api/settings/data'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'LIMPAR TUDO' }),
    })
    const data = (await res.json()) as { success: boolean; error?: string; message?: string }
    if (!res.ok || !data.success) {
      throw new Error(data.error || `DELETE /api/settings/data -> ${res.status}`)
    }
    confirmOpen.value = false
    showToast(data.message || 'Base limpa.', 'success')
    await loadStatus()
  } catch (e) {
    clearError.value = e instanceof Error ? e.message : 'Erro ao limpar base.'
  } finally {
    clearing.value = false
  }
}

// ===== Toast =====
const toastOpen = ref(false)
const toastMessage = ref('')
const toastTone = ref<'success' | 'error' | 'info'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, tone: 'success' | 'error' | 'info' = 'success') {
  toastMessage.value = msg
  toastTone.value = tone
  toastOpen.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastOpen.value = false }, 4000)
}

// ===== Instruções por banco =====
const {
  items: instructions, loading: loadingInstructions, error: instructionsError,
  list: loadInstructions, remove: removeInstruction,
} = useBankInstructions()

const instructionDrawerOpen = ref(false)
const editingInstruction = ref<BankInstruction | null>(null)

function openCreate() {
  editingInstruction.value = null
  instructionDrawerOpen.value = true
}

function openEdit(inst: BankInstruction) {
  editingInstruction.value = inst
  instructionDrawerOpen.value = true
}

function closeInstructionDrawer() {
  instructionDrawerOpen.value = false
  editingInstruction.value = null
}

async function onInstructionSaved() {
  await loadInstructions()
}

async function askRemove(inst: BankInstruction) {
  const ok = typeof window !== 'undefined' && window.confirm(
    `Excluir a instrução de ${inst.bankName}? As próximas importações deste banco ficarão sem regras específicas.`,
  )
  if (!ok) return
  try {
    await removeInstruction(inst.id)
    showToast(`Instrução de ${inst.bankName} removida.`, 'info')
    await loadInstructions()
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Erro ao remover instrução.', 'error')
  }
}

onMounted(() => {
  void loadStatus()
  void loadInstructions()
})
</script>