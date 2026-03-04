<template>
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
    >
        <div class="bg-bg-card rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 class="text-lg font-semibold text-text">Уведомления</h2>
                <button
                    @click="$emit('close')"
                    class="p-1.5 text-text-secondary hover:text-text hover:bg-bg-hover rounded-lg transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-3">
                <!-- Пустое состояние -->
                <div v-if="notifications.length === 0" class="text-center py-6">
                    <div class="w-14 h-14 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-7 h-7 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p class="text-sm text-text-secondary">Нет уведомлений</p>
                </div>

                <!-- Карточки уведомлений -->
                <div
                    v-for="n in notifications"
                    :key="n.id"
                    :class="[
                        'p-4 rounded-lg border',
                        n.severity === 'danger'
                            ? 'bg-status-red-bg border-status-red-border'
                            : n.severity === 'warning'
                            ? 'bg-status-yellow-bg border-status-yellow-border'
                            : 'bg-bg-secondary border-border'
                    ]"
                >
                    <h4
                        :class="[
                            'text-sm font-medium',
                            n.severity === 'danger'
                                ? 'text-status-red-text'
                                : n.severity === 'warning'
                                ? 'text-status-yellow-text'
                                : 'text-text'
                        ]"
                    >
                        {{ n.title }}
                    </h4>
                    <p v-if="n.description" class="text-xs text-text-secondary mt-1">
                        {{ n.description }}
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-border flex justify-end">
                <BaseButton @click="$emit('close')" variant="secondary">
                    Закрыть
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineEmits<{ close: [] }>()

const { notifications } = useNotifications()
</script>
