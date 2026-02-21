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
        class="fixed bottom-14 left-0 right-0 z-50 bg-bg-card rounded-t-2xl shadow-xl border-t border-border pb-[env(safe-area-inset-bottom)]"
      >
        <div class="w-10 h-1 bg-border-input rounded-full mx-auto mt-3 mb-2" />
        <nav class="px-4 pb-3 space-y-1">
          <NuxtLink
            v-for="item in overflow"
            :key="item.path"
            :to="item.path"
            @click="moreOpen = false"
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-bg-hover'
            ]"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="heroicons[item.icon || 'home']" />
            </svg>
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </Transition>

    <!-- Bottom tab bar -->
    <ClientOnly>
      <nav class="fixed bottom-0 left-0 right-0 z-40 bg-bg-card border-t border-border">
        <div class="flex items-center justify-around h-14 px-1" :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }">
          <!-- Main tabs -->
          <NuxtLink
            v-for="item in tabs"
            :key="item.path"
            :to="item.path"
            class="flex flex-col items-center justify-center flex-1 h-full pt-1 transition-colors"
            :class="isActive(item.path) ? 'text-accent' : 'text-muted'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" :stroke-width="isActive(item.path) ? '2' : '1.5'">
              <path stroke-linecap="round" stroke-linejoin="round" :d="heroicons[item.icon || 'home']" />
            </svg>
            <span class="text-[10px] mt-0.5 font-medium">{{ item.label }}</span>
          </NuxtLink>

          <!-- More button -->
          <button
            v-if="overflow.length > 0"
            @click="moreOpen = !moreOpen"
            class="flex flex-col items-center justify-center flex-1 h-full pt-1 transition-colors"
            :class="moreOpen || isOverflowActive ? 'text-accent' : 'text-muted'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" :stroke-width="moreOpen ? '2' : '1.5'">
              <path stroke-linecap="round" stroke-linejoin="round" :d="heroicons['more']" />
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
import { heroicons } from '#shared/constants/icons'

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
