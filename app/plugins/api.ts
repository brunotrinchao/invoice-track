/**
 * Inicializa a base URL da API Express uma única vez no boot da app.
 * Fonte: runtimeConfig.public.apiUrl (NUXT_PUBLIC_API_URL, app/nuxt.config.ts).
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  setApiBase(config.public.apiUrl || '')
})