/**
 * Instrução dinâmica por banco (mirror de server/services/bankInstructionService.ts).
 */
export interface BankInstruction {
  id: string
  bankName: string
  keywords: string[]
  rules: string
  source: 'seed' | 'pdf' | 'manual'
}

export interface MetaInstructionProposal {
  bankName: string
  brand: string
  keywords: string[]
  rules: string[]
}