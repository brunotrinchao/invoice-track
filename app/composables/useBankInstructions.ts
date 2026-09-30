import type { BankInstruction, MetaInstructionProposal } from '~/types/BankInstruction'
import { apiUrl } from '~/utils/api'

/**
 * CRUD de instruções por banco (Configurações) + meta-extração via PDF.
 */
export function useBankInstructions() {
  const items = ref<BankInstruction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function list(): Promise<BankInstruction[]> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(apiUrl('/api/settings/bank-instructions'))
      if (!res.ok) throw new Error(`GET /api/settings/bank-instructions -> ${res.status}`)
      const data = (await res.json()) as { success: boolean; instructions: BankInstruction[] }
      items.value = data.instructions ?? []
      return items.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function save(input: { bankName: string; keywords: string[]; rules: string; source?: BankInstruction['source'] }): Promise<BankInstruction> {
    const res = await fetch(apiUrl('/api/settings/bank-instructions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = (await res.json()) as { success: boolean; instruction?: BankInstruction; error?: string }
    if (!res.ok || !data.success || !data.instruction) {
      throw new Error(data.error || `POST -> ${res.status}`)
    }
    return data.instruction
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/api/settings/bank-instructions/${id}`), { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE -> ${res.status}`)
  }

  async function extractFromPdf(file: File): Promise<MetaInstructionProposal> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(apiUrl('/api/settings/bank-instructions/extract-from-pdf'), {
      method: 'POST',
      body: formData,
    })
    const data = (await res.json()) as { success: boolean; instruction?: MetaInstructionProposal; error?: string }
    if (!res.ok || !data.success || !data.instruction) {
      throw new Error(data.error || `Extract -> ${res.status}`)
    }
    return data.instruction
  }

  return { items, loading, error, list, save, remove, extractFromPdf }
}