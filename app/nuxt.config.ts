// https://nuxt.com/docs/api/configuration/nuxt-config
// Este config vive dentro de app/, así que Nuxt usa app/ como root de la app.
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@nuxt/icon',
    '@nuxt/ui',
    'motion-v/nuxt',
  ],

  css: [
    '@vuepic/vue-datepicker/dist/main.css',
  ],

  // Tailwind CSS v4 via @tailwindcss/vite (requerido por @nuxt/ui v3).
  vite: {
    plugins: [tailwindcss()],
  },

  // Auto-import de componentes por nombre de archivo (sin prefijo de directorio):
  // components/ui/AppCard.vue → <AppCard>, components/cards/CardFilter.vue → <CardFilter>
  // components: {
  //   pathPrefix: false,
  // },

  devtools: {
    enabled: true,
  },

  // App de API separada (Express): modo SPA — sin SSR ni prerender.
  // Las páginas hacen fetch a /api en client-side; el server Express
  // sirve app/.output/public como estático.
  ssr: false,

  app: {
    head: {
      title: 'Nossos Cartões',
      meta: [
        { name: 'description', content: 'Previsibilidade de faturas de cartão de crédito' },
      ],
    },
  },

  // API backend Express: URL absoluta via NUXT_PUBLIC_API_URL (app/.env).
  // Dev: http://localhost:3001 (CORS já habilitado no Express).
  // Prod: vacío → same-origin /api (reverse proxy externo).
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || '',
    },
  },

  compatibilityDate: '2025-01-15',
})