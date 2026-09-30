<template>
  <div class="flex w-full items-end gap-2">
    <UiAppInput
      v-model="from"
      label="Desde"
      type="month"
    />
    <span class="pb-2.5 text-slate-500">→</span>
    <UiAppInput
      v-model="to"
      label="Até"
      type="month"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** "YYYY-MM" — vacío = sin límite */
  from?: string
  /** "YYYY-MM" — vacío = sin límite */
  to?: string
}>()

const emit = defineEmits<{ update: [value: { from: string; to: string }] }>()

const from = ref(props.from ?? '')
const to = ref(props.to ?? '')

// Sincroniza el estado local cuando el padre cambia from/to externamente
watch(
  () => props.from,
  (v) => {
    from.value = v ?? ''
  },
)
watch(
  () => props.to,
  (v) => {
    to.value = v ?? ''
  },
)

// Emite el estado inicial y cada cambio del usuario
watch(
  () => [from.value, to.value],
  () => emit('update', { from: from.value, to: to.value }),
  { immediate: true },
)
</script>