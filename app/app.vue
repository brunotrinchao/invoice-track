<template>
  <UApp>
    <div class="min-h-screen bg-dark-bg text-slate-900 dark:text-slate-200 antialiased transition-colors duration-200">
      <nav class="sticky top-0 z-30 border-b border-dark-border bg-dark-card/90 backdrop-blur-md">
        <div class="w-full flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div class="flex items-center gap-6">
            <NuxtLink
              to="/"
              class="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-white"
            >
              <Icon name="lucide:receipt" class="h-5 w-5 text-brand-500" />
              Invoice Track
            </NuxtLink>
            <div class="flex items-center gap-1">
              <NuxtLink
                v-for="tab in TABS"
                :key="tab.to"
                :to="tab.to"
                class="rounded-xl px-3 py-2 text-xs font-bold transition-[background-color,color] duration-150 ease-[var(--ease-out-ui)]"
                :class="isActive(tab.to) ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'"
              >
                {{ tab.label }}
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 px-3.5 py-2 text-xs font-extrabold !text-white shadow-md shadow-brand-500/20 transition-[background-color,transform] active:scale-[0.97] cursor-pointer"
              @click="importOpen = true"
            >
              <Icon name="lucide:upload" class="h-4 w-4" />
              <span class="hidden sm:inline">Importar</span>
            </button>
            <button
              type="button"
              aria-label="Alternar tema"
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-dark-border bg-dark-card text-slate-700 dark:text-slate-400 transition-colors hover:text-slate-950 dark:hover:text-slate-200 cursor-pointer"
              @click="toggleTheme()"
            >
              <Icon :name="isLight ? 'lucide:moon' : 'lucide:sun'" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>
      <main class="w-full px-4 sm:px-6 lg:px-8 py-6">
        <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
      </main>
    </div>

    <!-- Drawer global de importação — disponível em qualquer tela -->
    <ImportDrawer :open="importOpen" @close="importOpen = false" />
  </UApp>
</template>

<script setup>
import '~/assets/css/main.css'
import { useTheme } from '~/composables/useTheme'

const TABS = [
  { to: '/', label: 'Dashboard' },
  { to: '/invoices', label: 'Faturas' },
  { to: '/cards', label: 'Cartões' },
  { to: '/settings', label: 'Configurações' },
]

const route = useRoute()
const { isLight, toggleTheme, initTheme } = useTheme()

/** Drawer global de importação — acessível de qualquer página. */
const importOpen = ref(false)

onMounted(() => {
  initTheme()
})

function isActive(to) {
  return route.path === to || (to !== '/' && route.path.startsWith(to))
}
</script>