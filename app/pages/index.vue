<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = useAuth()

// Редирект на первую полезную страницу по роли
onMounted(() => {
  const role = user.value?.role
  if (role === 'SUPER_ADMIN') {
    navigateTo('/organizations')
  } else if (role === 'OWNER') {
    navigateTo('/restaurants')
  } else {
    navigateTo('/transcripts')
  }
})
</script>
