<template>
    <!-- Modal Overlay -->
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
    >
        <!-- Modal Content -->
        <div class="bg-bg-card rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-border">
                <h2 class="text-xl font-semibold text-text">
                    {{
                        organization
                            ? "Редактировать организацию"
                            : "Создать организацию"
                    }}
                </h2>
            </div>

            <!-- Body -->
            <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
                <!-- Название -->
                <BaseInput
                    id="name"
                    v-model="form.name"
                    label="Название организации"
                    placeholder="ООО Моя компания"
                    required
                />

                <!-- Биллинг статус (только при редактировании) -->
                <BaseSelect
                    v-if="organization"
                    v-model="form.billingStatus"
                    :options="[
                        { value: 'TRIAL', label: 'Пробный период' },
                        { value: 'ACTIVE', label: 'Активна' },
                        { value: 'DISABLED', label: 'Отключена' }
                    ]"
                    label="Статус биллинга"
                    placeholder="Выберите статус"
                />

                <!-- Error Message -->
                <div
                    v-if="error"
                    class="bg-status-red-bg border border-status-red-border text-status-red-text px-4 py-3 rounded"
                >
                    <p class="text-sm">{{ error }}</p>
                </div>
            </form>

            <!-- Footer -->
            <div
                class="px-6 py-4 border-t border-border flex gap-3 justify-end"
            >
                <BaseButton
                    @click="$emit('close')"
                    variant="secondary"
                    :disabled="loading"
                >
                    Отмена
                </BaseButton>
                <BaseButton
                    @click="handleSubmit"
                    :loading="loading"
                    :loading-text="
                        organization ? 'Сохранение...' : 'Создание...'
                    "
                    variant="primary"
                >
                    {{ organization ? "Сохранить" : "Создать" }}
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    organization?: {
        id: string;
        name: string;
        billing?: {
            status: string;
        };
    } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    saved: [];
}>();

const loading = ref(false);
const error = ref("");

const form = reactive({
    name: props.organization?.name || "",
    billingStatus: props.organization?.billing?.status || "TRIAL",
});

const handleSubmit = async () => {
    error.value = "";

    if (!form.name.trim()) {
        error.value = "Название организации обязательно";
        return;
    }

    loading.value = true;

    try {
        if (props.organization) {
            // Редактирование
            await $fetch(`/api/organizations/${props.organization.id}`, {
                method: "PATCH",
                body: {
                    name: form.name,
                    billingStatus: form.billingStatus,
                },
            });
        } else {
            // Создание
            await $fetch("/api/organizations", {
                method: "POST",
                body: {
                    name: form.name,
                },
            });
        }

        emit("saved");
    } catch (err: any) {
        error.value = err.data?.message || err.message || "Произошла ошибка";
    } finally {
        loading.value = false;
    }
};
</script>
