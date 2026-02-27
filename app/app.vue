<template>
  <div style="min-height: 100vh; min-height: 100dvh;">
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
  },
  script: [
    {
      // Мгновенная инициализация темы ДО рендера — без FOUC
      innerHTML: `(function(){try{var t=localStorage.getItem('resto-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
      tagPosition: 'head',
    }
  ]
})

onMounted(() => {
  init()
})
</script>
