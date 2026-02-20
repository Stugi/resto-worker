<template>
  <div />
</template>

<script setup lang="ts">
import { getDefaultRoute } from '#shared/constants/navigation'

definePageMeta({
  layout: 'default'
})

const { user } = useAuth()

// Редирект на первую полезную страницу по роли
onMounted(() => {
  navigateTo(getDefaultRoute(user.value?.role || ''))
})
</script>
