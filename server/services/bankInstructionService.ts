import { prisma } from '../db.js';
import { normalizeBankName } from './bankUtils.js';
import { logger } from '../utils/logger.js';

/**
 * Instruções dinâmicas por banco (tabela bank_instructions):
 * - incluídas no prompt de extração conforme cartões cadastrados
 * - CRUD via /api/settings/bank-instructions
 * - meta-extração: IA propõe regras a partir de um PDF de exemplo
 */

export interface BankInstructionDto {
  id: string;
  bankName: string;
  keywords: string[];
  rules: string;
  source: string;
}

export interface UpsertBankInstructionInput {
  bankName: string;
  keywords: string[];
  rules: string;
  source?: 'seed' | 'pdf' | 'manual';
}

function serialize(row: {
  id: string;
  bankName: string;
  keywords: string;
  rules: string;
  source: string;
}): BankInstructionDto {
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(row.keywords);
  } catch {
    keywords = [];
  }
  return { id: row.id, bankName: row.bankName, keywords, rules: row.rules, source: row.source };
}

// ===== Cache (60s) — prompt de extração consulta a cada parse =====
let cache: { data: BankInstructionDto[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

function invalidate() {
  cache = null;
}

/** Lista completa (serializada) — com cache. */
export async function listAll(): Promise<BankInstructionDto[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  const rows = await prisma.bankInstruction.findMany({ orderBy: { bankName: 'asc' } });
  const data = rows.map(serialize);
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

/**
 * Instruções ativas — duas vias (evita deadlock da primeira importação):
 * 1. cartão JÁ cadastrado cujo bankName matcheia keywords;
 * 2. keywords aparecem no TEXTO do PDF em processamento (cartão ainda não
 *    existe — ex: primeiro upload Atacadão). Sem texto → fallback todas.
 */
export async function getActiveInstructions(sampleText?: string): Promise<BankInstructionDto[]> {
  const all = await listAll();
  if (all.length === 0) return [];

  const sampleUpper = (sampleText ?? '').toUpperCase();

  const cards = await prisma.card.findMany({ select: { bankName: true } });
  if (cards.length === 0) return all;

  const registeredSet = new Set(cards.map((c) => normalizeBankName(c.bankName).toUpperCase()));

  const active = all.filter((inst) => {
    // Via 1: cartão cadastrado
    if (registeredSet.has(inst.bankName.toUpperCase())) return true;
    if (inst.keywords.some((k) => registeredSet.has(k.toUpperCase()))) return true;
    // Via 2: keyword presente no texto do PDF (primeira importação do banco)
    if (sampleUpper && inst.keywords.some((k) => sampleUpper.includes(k.toUpperCase()))) return true;
    return false;
  });
  return active.length > 0 ? active : all;
}

/** Seções de texto p/ o prompt de extração. */
export async function getInstructionSections(sampleText?: string): Promise<string> {
  const active = await getActiveInstructions(sampleText);
  if (active.length === 0) return '';
  const header = `\nGUIA DE PARTICULARIDADES POR BANCO E EMISSOR (regras cadastradas pelo usuário):\n`;
  const body = active
    .map((inst, i) => `${i + 1}. ${inst.bankName}:\n${inst.rules
      .split('\n')
      .filter(Boolean)
      .map((r) => `   ${r.trim()}`)
      .join('\n')}`)
    .join('\n');
  return `${header}${body}\n`;
}

export async function upsertBankInstruction(input: UpsertBankInstructionInput): Promise<BankInstructionDto> {
  const bankName = normalizeBankName(input.bankName);
  const data = {
    bankName,
    keywords: JSON.stringify(input.keywords.map((k) => k.trim()).filter(Boolean)),
    rules: input.rules.trim(),
    source: input.source ?? 'manual',
  };
  const row = await prisma.bankInstruction.upsert({
    where: { bankName },
    create: data,
    update: { keywords: data.keywords, rules: data.rules, source: data.source },
  });
  invalidate();
  logger.info({ bankName, source: data.source }, 'Instrução de banco salva');
  return serialize(row);
}

export async function deleteBankInstruction(id: string): Promise<void> {
  await prisma.bankInstruction.delete({ where: { id } });
  invalidate();
}

// ===== Meta-extração: IA propõe regras a partir de um PDF =====

export const INSTRUCTION_META_PROMPT = `Você é um analista de extratores de faturas de cartão de crédito brasileiras.
Dada a fatura anexada, produza REGRAS de extração para este emissor, no JSON exato:
{
  "bankName": "nome canônico do emissor (ex: 'Atacadão' para Banco CSF; 'Banco Inter')",
  "brand": "Mastercard | Visa | Elo | Amex",
  "keywords": ["3 a 6 aliases que identificam esta fatura no texto bruto", "ex: ATACADAO, CSF"],
  "rules": ["8 a 14 regras práticas, uma por item do array"]
}

Cada regra deve ser operacional e específica deste emissor (PT-BR), cobrindo quando existir:
- formato do número do cartão (ex: "CARTÃO: 5438******5176" → extrair os 4 ÚLTIMOS dígitos)
- padrão de data+descrição+valor dos lançamentos (o layout pode vir quebrado — explicar como associar)
- formato das parcelas (sufixo " - 3/3", coluna "Parcela 2 de 5", etc.)
- marcador de créditos/pagamentos (ex: valor com "-" no fim) — e que devem ser OMITIDOS como compra
- tarifas/anuidades a incluir como item
- seções da fatura a ler e ruído a IGNORAR (boleto, tabelas de parcelamento, taxas)
- formato do total (ex: "TOTAL DA FATURAR$ 383,27" colada)
- "monthReferenced" (mês de vencimento YYYY-MM) e "dueDate" (YYYY-MM-DD, onde encontrar)
NÃO invente regras genéricas — leia a fatura anexada e descreva o que ELA mostra.`;

/** Metarresposta da IA. */
export interface MetaInstruction {
  bankName: string;
  brand: string;
  keywords: string[];
  rules: string[];
}
