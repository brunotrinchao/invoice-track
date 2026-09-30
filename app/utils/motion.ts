/**
 * Presets de spring estilo Apple (apple-design skill + animate skill).
 *
 * Padrão: critically damped (bounce 0) — sem overshoot na UI comum.
 * Bounce reservado p/ interações com momentum real (drawer arrastado, flick).
 * Todos os presets são interruptíveis (spring re-targeta do valor atual).
 */

/** Spring padrão — damping 1.0, response ~0.4s (Apple "move/reposition"). */
export const SPRING_DEFAULT = { type: 'spring', duration: 0.4, bounce: 0 } as const

/** Spring p/ sheets/drawers — leve bounce, só porque a entrada tem momentum (damping ~0.9). */
export const SPRING_SHEET = { type: 'spring', duration: 0.4, bounce: 0.15 } as const

/** Fade/curta para overlays/backdrops — ease-out forte, 200ms. */
export const EASE_OUT_UI = [0.23, 1, 0.32, 1] as const
export const FADE_FAST = { duration: 0.2, ease: EASE_OUT_UI } as const

/** Entrada de modais: scale 0.95 → 1 (nunca scale(0)) + opacity. */
export const MODAL_IN = {
  opacity: 1,
  scale: 1,
  transition: SPRING_DEFAULT,
} as const

export const MODAL_OUT = {
  opacity: 0,
  scale: 0.95,
  transition: { duration: 0.15, ease: EASE_OUT_UI },
} as const

/** Drawer lateral: entra de / sai para a MESMA direção (spatial consistency). */
export const DRAWER_RIGHT = {
  initial: { opacity: 0, transform: 'translateX(100%)' },
  enter: { opacity: 1, transform: 'translateX(0%)', transition: SPRING_SHEET },
  leave: { opacity: 0, transform: 'translateX(100%)', transition: { duration: 0.2, ease: EASE_OUT_UI } },
} as const

/** Press feedback instantâneo (pointer-down): scale 0.97, spring curto. */
export const PRESS = {
  whileTap: { scale: 0.97 },
  transition: { duration: 0.1, ease: EASE_OUT_UI },
} as const

/** Stagger de listas/dashboard — 40ms entre itens, entrada curta. */
export const STAGGER_PARENT = {
  transition: { staggerChildren: 0.04 },
} as const

export const STAGGER_CHILD = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT_UI } },
} as const
