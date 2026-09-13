// Declaraciones para imports .vue en tests (vitest resuelve los SFC; tsc no).
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}