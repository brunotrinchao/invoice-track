<template>
  <div class="flex w-full items-end gap-2">
    <AppInput
      v-model="from"
      label="Desde"
      type="month"
    />
    <span class="pb-2.5 text-slate-500">→</span>
    <AppInput
      v-model="to"
      label="Hasta"
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

watch(
  () => [from.value, to.value],
  () => emit('update', { from: from.value, to: to.value }),
)
</script>