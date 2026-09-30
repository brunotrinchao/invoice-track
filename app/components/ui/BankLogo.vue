<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getBankLogoPath } from '~/utils/bankLogo'

const props = withDefaults(
  defineProps<{
    bankName?: string | null
    sizeClass?: string
    iconClass?: string
  }>(),
  {
    bankName: '',
    sizeClass: 'h-6 w-6',
    iconClass: 'h-5 w-5 text-slate-400'
  }
)

const hasError = ref(false)
const logoPath = computed(() => getBankLogoPath(props.bankName))

watch(() => props.bankName, () => {
  hasError.value = false
})

function onError() {
  hasError.value = true
}
</script>

<template>
  <div class="inline-flex items-center justify-center shrink-0 bg-white p-1 rounded">
    <img
      v-if="logoPath && !hasError"
      :src="logoPath"
      :alt="bankName || 'Bank Logo'"
      :class="['object-contain', sizeClass]"
      @error="onError"
    />
    <Icon
      v-else
      name="lucide:building-2"
      :class="[iconClass || sizeClass]"
    />
  </div>
</template>
