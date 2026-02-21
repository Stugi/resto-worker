<template>
    <!-- Modal Overlay -->
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="$emit('cancel')"
    >
        <!-- Modal Content -->
        <div class="bg-bg-card rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-border">
                <h2 class="text-xl font-semibold text-text">
                    Подтверждение удаления
                </h2>
            </div>

            <!-- Body -->
            <div class="p-6">
                <p class="text-text-secondary mb-4">
                    {{ message }}
                </p>
                <p class="text-sm text-status-red-icon font-medium">
                    Это действие нельзя отменить.
                </p>
            </div>

            <!-- Footer -->
            <div
                class="px-6 py-4 border-t border-border flex gap-3 justify-end"
            >
                <BaseButton
                    @click="$emit('cancel')"
                    variant="secondary"
                    :disabled="loading"
                >
                    Отмена
                </BaseButton>
                <BaseButton
                    @click="$emit('confirm')"
                    :loading="loading"
                    loading-text="Удаление..."
                    class="!bg-[var(--red-icon)] hover:opacity-90 text-white"
                >
                    Удалить
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    message: string;
    loading?: boolean;
}

defineProps<Props>();

defineEmits<{
    cancel: [];
    confirm: [];
}>();
</script>
