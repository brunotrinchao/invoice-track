// Globals para compilar SFCs Nuxt en vitest: Nuxt auto-importa ref/computed/watch
// en los .vue, pero fuera de Nuxt hay que exponerlos globalmente.
import { computed, defineComponent, onMounted, ref, unref, watch } from 'vue'

const g = globalThis as Record<string, unknown>

g.ref = ref
g.unref = unref
g.computed = computed
g.watch = watch
g.onMounted = onMounted
g.defineComponent = defineComponent