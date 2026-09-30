/**
 * Formatação monetária centralizada (BRL).
 * Auto-importado pelo Nuxt em componentes/composables/stores.
 */
export function formatMoney(value?: number | null): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}