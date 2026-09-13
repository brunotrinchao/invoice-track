// https://nuxt.com/docs/api/configuration/nuxt-config
// Este config vive dentro de app/, así que Nuxt usa app/ como root de la app.
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    'nuxt-icon',
  ],

  tailwindcss: {
    // El módulo busca assets/css/tailwind.css por defecto; apuntamos a main.css
    cssPath: '~/assets/css/main.css',
  },

  // El CSS global se importa desde app.vue (forma canónica Nuxt 3).
  // NOTA: Nuxt 3.21 no soporta postcss.config.js — usa options.postcss.

  devtools: {
    enabled: true,
  },

  compatibilityDate: '2025-01-15',
})