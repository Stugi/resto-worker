<template>
  <div class="lg:hidden">
    <!-- More overlay -->
    <Transition name="fade">
      <div
        v-if="moreOpen"
        class="fixed inset-0 bg-black/50 z-40"
        @click="moreOpen = false"
      />
    </Transition>

    <!-- More bottom sheet -->
    <Transition name="slide-up">
      <div
        v-if="moreOpen && overflow.length > 0"
        class="fixed bottom-14 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div class="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
        <nav class="px-4 pb-3 space-y-1">
          <NuxtLink
            v-for="item in overflow"
            :key="item.path"
            :to="item.path"
            @click="moreOpen = false"
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-action/10 text-action'
                : 'text-text-secondary hover:bg-gray-50'
            ]"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[item.icon || 'home']" />
            </svg>
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </Transition>

    <!-- Bottom tab bar -->
    <ClientOnly>
      <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div class="flex items-center justify-around h-14 px-1" :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }">
          <!-- Main tabs -->
          <NuxtLink
            v-for="item in tabs"
            :key="item.path"
            :to="item.path"
            class="flex flex-col items-center justify-center flex-1 h-full pt-1 transition-colors"
            :class="isActive(item.path) ? 'text-action' : 'text-gray-400'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" :stroke-width="isActive(item.path) ? '2' : '1.5'">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[item.icon || 'home']" />
            </svg>
            <span class="text-[10px] mt-0.5 font-medium">{{ item.label }}</span>
          </NuxtLink>

          <!-- More button -->
          <button
            v-if="overflow.length > 0"
            @click="moreOpen = !moreOpen"
            class="flex flex-col items-center justify-center flex-1 h-full pt-1 transition-colors"
            :class="moreOpen || isOverflowActive ? 'text-action' : 'text-gray-400'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" :stroke-width="moreOpen ? '2' : '1.5'">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths.more" />
            </svg>
            <span class="text-[10px] mt-0.5 font-medium">Ещё</span>
          </button>
        </div>
      </nav>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { getBottomNavItems } from '#shared/constants/navigation'

const route = useRoute()
const { user } = useAuth()
const moreOpen = ref(false)

const navItems = computed(() => {
  const role = user.value?.role
  if (!role) return { tabs: [], overflow: [] }
  return getBottomNavItems(role, 4)
})

const tabs = computed(() => navItems.value.tabs)
const overflow = computed(() => navItems.value.overflow)

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const isOverflowActive = computed(() =>
  overflow.value.some(item => isActive(item.path))
)

// Close "More" on route change
watch(() => route.path, () => {
  moreOpen.value = false
})

// Heroicons outline SVG paths (24x24)
const iconPaths: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  microphone: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  store: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  target: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  more: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z',
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease-out;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
