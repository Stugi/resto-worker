<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const { init } = useTheme()

useHead({
  htmlAttrs: {
    lang: 'ru'
  },
  bodyAttrs: {
    class: 'font-sans antialiased'
  }
})

onMounted(() => {
  init()
})
</script>
