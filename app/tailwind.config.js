/** @type {import('tailwindcss').Config} */
export default {
  // Paths relativos a app/ (raíz de la app Nuxt). El módulo @nuxtjs/tailwindcss
  // añade además los paths de Nuxt (pages, components, layouts) vía
  // autoContentDetection.
  content: [
    './{pages,components,layouts,composables,stores,types,assets,plugins,middleware,utils}/**/*.{vue,js,ts}',
    './app.vue',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        dark: {
          bg: '#0b0f19',
          card: '#151c2c',
          border: '#232d42',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}