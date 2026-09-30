// Base URL del backend Express.
// Se inicializa desde app.vue con useRuntimeConfig().public.apiUrl
// (definido en nuxt.config runtimeConfig, leído de NUXT_PUBLIC_API_URL).
let _base = ''

export function setApiBase(base: string) {
  _base = base
}

export function apiUrl(path: string): string {
  return `${_base}${path}`
}