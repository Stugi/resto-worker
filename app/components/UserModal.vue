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
                <div v-if="currentUser?.role === UserRole.SUPER_ADMIN">
                    <label class="block text-sm font-medium text-text mb-2">
                        Роль
                    </label>
                    <select
                        v-model="form.role"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
                    >
                        <option :value="UserRole.SUPER_ADMIN">Супер Админ</option>
                        <option :value="UserRole.OWNER">Владелец</option>
                        <option :value="UserRole.MANAGER">Менеджер</option>
                    </select>
                </div>

                <!-- Организация (только для SUPER_ADMIN) -->
                <div v-if="currentUser?.role === UserRole.SUPER_ADMIN && (form.role === UserRole.OWNER || form.role === UserRole.MANAGER)">
                    <label class="block text-sm font-medium text-text mb-2">
                        Организация
                    </label>
                    <select
                        v-model="form.organizationId"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
                        required
                    >
                        <option value="">Выберите организацию</option>
                        <option
                            v-for="org in organizations"
                            :key="org.id"
                            :value="org.id"
                        >
                            {{ org.name }}
                        </option>
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
