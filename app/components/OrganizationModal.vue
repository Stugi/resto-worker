<template>
    <!-- Modal Overlay -->
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
    >
        <!-- Modal Content -->
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-200">
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
                <div v-if="organization">
                    <label class="block text-sm font-medium text-text mb-2">
                        Статус биллинга
                    </label>
                    <select
                        v-model="form.billingStatus"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
                    >
                        <option value="TRIAL">Пробный период</option>
                        <option value="ACTIVE">Активна</option>
                        <option value="DISABLED">Отключена</option>
                    </select>
                </div>

                <!-- Error Message -->
                <div
                    v-if="error"
                    class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
                >
                    <p class="text-sm">{{ error }}</p>
                </div>
            </form>

            <!-- Footer -->
            <div
                class="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end"
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
