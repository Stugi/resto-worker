<template>
    <header class="bg-bg-card border-b border-border px-6 py-4">
        <div class="flex items-center justify-between">
            <!-- Logo and Title -->
            <div class="flex items-center gap-4">
                <button
                    @click="$emit('toggle-sidebar')"
                    class="lg:hidden p-2 hover:bg-bg-hover rounded-lg transition-colors"
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
                        class="w-10 h-10 bg-gradient-to-br from-accent to-accent-end rounded-2xl flex items-center justify-center ring-1 ring-accent/20"
                        style="
                            box-shadow:
                                0 0 15px rgba(245, 166, 35, 0.3),
                                0 4px 6px rgba(245, 166, 35, 0.2);
                        "
                    >
                        <span class="text-2xl">🍽️</span>
                    </div>
                    <h1
                        class="text-xl md:text-2xl font-semibold tracking-tight text-text"
                    >
                        Cosmic<span
                            class="bg-gradient-to-r from-accent to-accent-end bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(245,166,35,0.6)]"
                            >Mind</span
                        >
                        <span
                            class="text-text-secondary font-normal text-base"
                        ></span>
                    </h1>
                </div>
            </div>

            <ThemeToggle />
        </div>
    </header>
</template>

<script setup lang="ts">
defineEmits<{
    "toggle-sidebar": [];
}>();
</script>
