import pino from 'pino'

/**
 * Logger estruturado server-side.
 * Nível via LOG_LEVEL (trace|debug|info|warn|error), default info.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
})

/** Conveniência para rotas: loga e responde 500 estruturado. */
export function respondError(
  res: import('express').Response,
  status: number,
  message: string,
): void {
  if (status >= 500) {
    logger.error({ status, message }, 'Resposta de erro HTTP 5xx')
  } else {
    logger.warn({ status, message }, 'Resposta de erro HTTP 4xx')
  }
  res.status(status).json({ success: false, error: message })
}