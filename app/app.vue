<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// Применяем CSS переменные глобально
useHead({
  htmlAttrs: {
    lang: 'ru'
  },
  bodyAttrs: {
    class: 'font-sans antialiased'
  }
})
</script>

<style>
:root {
  --bg: #ffffff;
  --bg-secondary: #fafafa;
  --text: #000000;
  --text-secondary: #666666;
  --border: #e0e0e0;
  --action: #2a2a2a;
  --action-hover: #1a1a1a;
  --success: #16a34a;
  --danger: #dc2626;
}

[data-theme="dark"] {
  --bg: #000000;
  --bg-secondary: #0a0a0a;
  --text: #ffffff;
  --text-secondary: #999999;
  --border: #2a2a2a;
  --action: #e5e5e5;
  --action-hover: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg);
  color: var(--text);
  transition: background 0.2s, color 0.2s;
}
</style>
