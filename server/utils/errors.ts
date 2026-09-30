import { logger } from './logger'

/** Mensagem de erro segura — nunca vaza stack para o client. */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    logger.debug({ err: e }, 'Erro não-Error capturado')
  } catch {
    /* logger indisponível — nunca lançar de um error handler */
  }
  return String(e)
}

/** Erro de cota/rate limit da IA (HTTP 429) — aborta o pipeline imediatamente. */
export class AiRateLimitError extends Error {
  /** Segundos que a API pediu para aguardar (RetryInfo), quando informado. */
  retryAfterSec: number
  constructor(message: string, retryAfterSec: number) {
    super(message)
    this.name = 'AiRateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

/** Extrai "Please retry in 36s" / "retryDelay":"36s" da mensagem de erro da API. */
export function parseAiRetryDelay(message: string): number {
  const m = message.match(/retry[^\d]*(\d+)(?:\.(\d+))?\s*s/i)
  return m ? Math.ceil(Number(`${m[1]}.${m[2] ?? 0}`)) : 0
}

/** Detecta erro HTTP 429 (quota/rate limit) da API Gemini. */
export function isAiRateLimitError(e: unknown): e is AiRateLimitError {
  return e instanceof AiRateLimitError
}

/** Converte erro qualquer em AiRateLimitError quando for 429. */
export function throwIfAiRateLimit(error: unknown, context: string): void {
  const msg = getErrorMessage(error)
  if (/\b429\b|Too Many Requests|quota exceeded|exceeded your current quota/i.test(msg)) {
    throw new AiRateLimitError(`${context}: ${msg.slice(0, 300)}`, parseAiRetryDelay(msg))
  }
}

/** Status HTTP correspondente a erro Prisma conhecido (P2002 unique → 409, P2025 → 404). */
export function prismaErrorStatus(e: unknown): number {
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code?: unknown }).code)
      : ''
  if (code === 'P2002') return 409
  if (code === 'P2025') return 404
  return 0
}