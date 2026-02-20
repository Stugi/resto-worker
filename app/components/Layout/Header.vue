<template>
    <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
            <!-- Logo and Title -->
            <div class="flex items-center gap-4">
                <button
                    @click="$emit('toggle-sidebar')"
                    class="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <svg
                        class="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>

                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 bg-gradient-to-br from-action to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-action/20"
                    >
                        <span class="text-2xl">🍽️</span>
                    </div>
                    <h1
                        class="text-xl md:text-2xl font-semibold tracking-tight text-text"
                    >
                        RESTO <span class="text-action">WORKER</span>
                    </h1>
                </div>
            </div>

            <!-- Theme Toggle -->
            <button
                @click="toggle"
                class="relative w-10 h-5 rounded-full transition-colors duration-200"
                :class="isDark ? 'bg-gray-600' : 'bg-gray-300'"
                :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
            >
                <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
                    :class="isDark ? 'translate-x-5' : 'translate-x-0'"
                />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
const { isDark, toggle } = useTheme()

defineEmits<{
    "toggle-sidebar": [];
}>();
</script>
