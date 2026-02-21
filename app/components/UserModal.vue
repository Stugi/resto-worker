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
                        user
                            ? "Редактировать пользователя"
                            : "Создать пользователя"
                    }}
                </h2>
            </div>

            <!-- Body -->
            <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
                <!-- Имя -->
                <BaseInput
                    id="name"
                    v-model="form.name"
                    label="Имя"
                    placeholder="Иван Иванов"
                    required
                />

                <!-- Логин -->
                <BaseInput
                    id="login"
                    v-model="form.login"
                    label="Логин"
                    placeholder="ivan"
                    required
                />

                <!-- Пароль -->
                <BaseInput
                    id="password"
                    v-model="form.password"
                    type="password"
                    :label="user ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'"
                    placeholder="••••••••"
                    :required="!user"
                />

                <!-- Телефон -->
                <BaseInput
                    id="phone"
                    v-model="form.phone"
                    label="Телефон"
                    placeholder="+7 (999) 999-99-99"
                />

                <!-- Роль (только для SUPER_ADMIN) -->
                <BaseSelect
                    v-if="currentUser?.role === UserRole.SUPER_ADMIN"
                    v-model="form.role"
                    :options="[
                        { value: UserRole.SUPER_ADMIN, label: 'Супер Админ' },
                        { value: UserRole.OWNER, label: 'Владелец' },
                        { value: UserRole.MANAGER, label: 'Менеджер' }
                    ]"
                    label="Роль"
                    placeholder="Выберите роль"
                />

                <!-- Организация (только для SUPER_ADMIN) -->
                <BaseSelect
                    v-if="currentUser?.role === UserRole.SUPER_ADMIN && (form.role === UserRole.OWNER || form.role === UserRole.MANAGER)"
                    v-model="form.organizationId"
                    :options="[{ value: '', label: 'Выберите организацию' }, ...organizations.map(o => ({ value: o.id, label: o.name }))]"
                    label="Организация"
                    placeholder="Выберите организацию"
                    required
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
                        user ? 'Сохранение...' : 'Создание...'
                    "
                    variant="primary"
                >
                    {{ user ? "Сохранить" : "Создать" }}
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { UserRole } from '#shared/constants/roles'

interface Props {
    user?: {
        id: string;
        name: string;
        login: string;
        phone: string | null;
        role: string;
        organization?: {
            id: string;
            name: string;
        };
    } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    saved: [];
}>();

const { user: currentUser } = useAuth();

const loading = ref(false);
const error = ref("");
const organizations = ref<Array<{ id: string; name: string }>>([]);

const form = reactive({
    name: props.user?.name || "",
    login: props.user?.login || "",
    password: "",
    phone: props.user?.phone || "",
    role: props.user?.role || (currentUser.value?.role === UserRole.OWNER ? UserRole.MANAGER : UserRole.SUPER_ADMIN),
    organizationId: props.user?.organization?.id || "",
});

// Загрузка организаций для SUPER_ADMIN
const fetchOrganizations = async () => {
    if (currentUser.value?.role !== UserRole.SUPER_ADMIN) return;

    try {
        const data = await $fetch("/api/organizations", {
        });
        organizations.value = data as Array<{ id: string; name: string }>;
    } catch (err) {
        console.error("Error fetching organizations:", err);
    }
};

const handleSubmit = async () => {
    error.value = "";

    if (!form.name.trim()) {
        error.value = "Имя обязательно";
        return;
    }

    if (!form.login.trim()) {
        error.value = "Логин обязателен";
        return;
    }

    if (!props.user && !form.password.trim()) {
        error.value = "Пароль обязателен";
        return;
    }

    loading.value = true;

    try {
        const body: any = {
            name: form.name,
            login: form.login,
            phone: form.phone || undefined,
        };

        if (form.password) {
            body.password = form.password;
        }

        if (currentUser.value?.role === UserRole.SUPER_ADMIN) {
            body.role = form.role;
            if (form.role === UserRole.OWNER || form.role === UserRole.MANAGER) {
                body.organizationId = form.organizationId;
            }
        }

        if (props.user) {
            // Редактирование
            await $fetch(`/api/users/${props.user.id}`, {
                method: "PATCH",
                body,
            });
        } else {
            // Создание
            await $fetch("/api/users", {
                method: "POST",
                body,
            });
        }

        emit("saved");
    } catch (err: any) {
        error.value = err.data?.message || err.message || "Произошла ошибка";
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchOrganizations();
});
</script>
