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

                <!-- Тариф (только при редактировании) -->
                <BaseSelect
                    v-if="organization && tariffOptions.length > 0"
                    v-model="form.tariffId"
                    :options="tariffOptions"
                    label="Тариф"
                    placeholder="Выберите тариф"
                />

                <!-- Подписка до (только при редактировании) -->
                <div v-if="organization" class="w-full">
                    <label class="block text-sm font-medium text-text mb-2">
                        Подписка до
                    </label>
                    <input
                        v-model="form.activeUntil"
                        type="date"
                        class="w-full px-4 py-2 border border-border-input rounded-lg outline-none transition-colors hover:border-border-input-hover focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-ring)] bg-bg-card text-text"
                    />
                </div>

                <!-- Сбросить счётчик транскрипций -->
                <label v-if="organization" class="flex items-center gap-3 cursor-pointer">
                    <input
                        v-model="form.resetUsage"
                        type="checkbox"
                        class="w-4 h-4 rounded border-border-input accent-accent"
                    />
                    <span class="text-sm text-text">Сбросить счётчик транскрипций</span>
                </label>

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
            tariffId?: string | null;
            activeUntil?: string | null;
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

// Загружаем тарифы
const { data: tariffs } = useFetch('/api/tariffs')

const tariffOptions = computed(() => {
    if (!tariffs.value) return []
    return (tariffs.value as any[]).map((t: any) => ({
        value: t.id,
        label: `${t.name} — ${t.price}₽/${t.period}д`
    }))
})

// Форматируем дату из ISO в YYYY-MM-DD для input[type=date]
const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const form = reactive({
    name: props.organization?.name || "",
    billingStatus: props.organization?.billing?.status || "TRIAL",
    tariffId: props.organization?.billing?.tariffId || "",
    activeUntil: formatDate(props.organization?.billing?.activeUntil),
    resetUsage: false,
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
                    tariffId: form.tariffId || undefined,
                    activeUntil: form.activeUntil || undefined,
                    resetUsage: form.resetUsage,
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
