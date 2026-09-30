<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getCardBrandLogoPath } from '~/utils/cardBrandLogo'

const props = withDefaults(
  defineProps<{
    brand?: string | null
    variant?: 'flat-rounded' | 'logo'
    sizeClass?: string
    iconClass?: string
  }>(),
  {
    brand: '',
    variant: 'flat-rounded',
    sizeClass: 'h-6 w-9',
    iconClass: 'h-6 w-6 text-white/90'
  }
)

const hasError = ref(false)
const logoPath = computed(() => getCardBrandLogoPath(props.brand, props.variant))

watch([() => props.brand, () => props.variant], () => {
  hasError.value = false
})

function onError() {
  hasError.value = true
}
</script>

<template>
  <div class="inline-flex items-center justify-center shrink-0">
    <img
      v-if="logoPath && !hasError"
      :src="logoPath"
      :alt="brand || 'Card Brand'"
      :class="['object-contain', sizeClass]"
      @error="onError"
    />
    <Icon
      v-else
      name="lucide:credit-card"
      :class="[iconClass || sizeClass]"
    />
  </div>
</template>
