<template>
  <div
    :class="[
      'animate-spin rounded-full border-b-2 border-secondary',
      sizeClass
    ]"
  ></div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-8 w-8'
    case 'md': return 'h-10 w-10'
    case 'lg': return 'h-12 w-12'
    case 'xl': return 'h-16 w-16'
  }
})
</script>
