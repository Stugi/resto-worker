<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <LayoutHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex">
      <!-- Sidebar -->
      <LayoutSidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

      <!-- Main Content -->
      <main class="flex-1 min-h-[calc(100vh-4rem)]">
        <div class="p-4 md:p-6 lg:p-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarOpen = ref(false)

// Close sidebar when route changes (mobile)
const route = useRoute()
watch(() => route.path, () => {
  sidebarOpen.value = false
})
</script>
