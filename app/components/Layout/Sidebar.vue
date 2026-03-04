<template>
    <!-- Mobile Overlay -->
    <div
        v-if="isOpen"
        @click="$emit('close')"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
    />

    <!-- Sidebar -->
    <aside
        :class="[
            'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-bg border-r border-border transform transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ]"
    >
        <div class="flex flex-col h-full">
            <!-- Mobile Close Button -->
            <div
                class="lg:hidden flex items-center justify-between p-4 border-b border-border"
            >
                <span class="font-bold text-text">Меню</span>
                <button
                    @click="$emit('close')"
                    class="p-2 hover:bg-bg-hover rounded-lg transition-colors"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto p-4">
                <ClientOnly>
                    <div
                        v-for="(section, idx) in sections"
                        :key="section.key"
                        :class="idx < sections.length - 1 ? 'mb-6' : ''"
                    >
                        <h3
                            class="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-3 px-3"
                        >
                            {{ section.label }}
                        </h3>
                        <div class="space-y-1">
                            <NuxtLink
                                v-for="item in section.items"
                                :key="item.path"
                                :to="item.path"
                                @click="$emit('close')"
                                :class="[
                                    'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isActive(item.path)
                                        ? 'bg-bg-secondary text-text'
                                        : 'text-text-secondary hover:bg-bg-hover hover:text-text',
                                ]"
                            >
                                {{ item.label }}
                            </NuxtLink>
                        </div>
                    </div>
                </ClientOnly>
            </nav>

            <!-- User Info and Logout -->
            <div class="p-4 border-t border-border space-y-3">
                <!-- User Info -->
                <ClientOnly>
                    <div class="flex items-center gap-2.5 px-3 py-2">
                        <div
                            class="w-8 h-8 bg-gradient-to-r from-accent to-accent-end rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                        >
                            {{ userInitials }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-text text-sm truncate max-w-[130px]">
                                {{ user?.name || "Пользователь" }}
                            </p>
                            <p class="text-text-secondary text-xs">
                                {{ roleLabel }}
                            </p>
                        </div>
                        <!-- Колокольчик уведомлений -->
                        <button
                            @click="showNotifications = true"
                            class="relative p-1.5 text-text-secondary hover:text-text hover:bg-bg-hover rounded-lg transition-colors shrink-0"
                            title="Уведомления"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                0
                            </span>
                        </button>
                    </div>
                </ClientOnly>

                <!-- Модалка уведомлений -->
                <NotificationModal v-if="showNotifications" @close="showNotifications = false" />

                <!-- Divider -->
                <div class="border-t border-border"></div>

                <!-- Logout Button -->
                <button
                    @click="handleLogout"
                    class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-status-red-icon hover:bg-status-red-bg rounded-lg transition-colors"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    <span>Выход</span>
                </button>

                <!-- Copyright (только на десктопе) -->
                <div class="hidden lg:block text-xs text-text-secondary px-3">
                    <p class="font-medium">
                        CosmicMind
                        <span class="font-normal opacity-50"
                            >v{{ appVersion }}</span
                        >
                    </p>
                    <p>© 2026 Все права защищены</p>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { RoleLabels } from "#shared/constants/roles";
import { getNavigationSections } from "#shared/constants/navigation";

interface Props {
    isOpen: boolean;
}

defineProps<Props>();

defineEmits<{
    close: [];
}>();

const route = useRoute();
const { user, logout } = useAuth();
const { appVersion } = useRuntimeConfig().public;

const showNotifications = ref(false);

const userInitials = computed(() => {
    if (!user.value?.name) return "U";
    const parts = user.value.name.split(" ");
    return parts
        .map((p) => p[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
});

const roleLabel = computed(() => {
    return user.value?.role
        ? RoleLabels[user.value.role as keyof typeof RoleLabels]
        : "";
});

const handleLogout = async () => {
    await logout();
};

// Навигация — одна computed, всё из конфига
const sections = computed(() => {
    const role = user.value?.role;
    if (!role) return [];
    return getNavigationSections(role);
});

const isActive = (path: string) => {
    if (path === "/") return route.path === "/";
    return route.path.startsWith(path);
};
</script>
