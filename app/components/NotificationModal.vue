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
            <div class="p-6">
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h3 class="text-base font-medium text-text mb-2">Раздел в разработке</h3>
                    <p class="text-sm text-text-secondary">
                        Уведомления скоро появятся. Здесь будут отображаться важные события по вашим ресторанам.
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
defineEmits<{
    close: [];
}>();
</script>
