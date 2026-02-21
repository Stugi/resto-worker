<template>
  <div class="h-screen flex flex-col bg-bg-secondary overflow-hidden">
    <!-- Header -->
    <LayoutHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <LayoutSidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto">
        <div class="p-4 pb-20 md:p-6 lg:p-8 lg:pb-8">
          <slot />
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Nav -->
    <LayoutBottomNav />
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
