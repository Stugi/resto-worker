<template>
    <div>
        <!-- Header -->
        <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
        >
            <div>
                <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
                    Пользователи
                </h1>
                <p class="text-text-secondary">
                    Управление пользователями системы
                </p>
            </div>

            <BaseButton @click="openCreateModal" variant="primary" size="md">
                Создать пользователя
            </BaseButton>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div
                class="animate-spin rounded-full h-12 w-12 border-b-2 border-action"
            ></div>
        </div>

        <!-- Desktop: Users Table -->
        <div
            v-if="users.length > 0"
            class="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
            <div class="overflow-x-auto">
                <table class="w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 w-24"></th>
                            <th
                                class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                            >
                                Имя
                            </th>
                            <th
                                class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                            >
                                Логин
                            </th>
                            <th
                                class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                            >
                                Телефон
                            </th>
                            <th
                                class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                            >
                                Роль
                            </th>
                            <th
                                v-if="currentUser?.role === UserRole.SUPER_ADMIN"
                                class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                            >
                                Организация
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr
                            v-for="user in users"
                            :key="user.id"
                            class="hover:bg-gray-50 transition-colors"
                        >
                            <td class="px-4 py-4 whitespace-nowrap">
                                <div class="flex gap-2">
                                    <button
                                        @click="openEditModal(user)"
                                        class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Редактировать"
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
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        v-if="user.id !== currentUser?.id"
                                        @click="openDeleteModal(user)"
                                        class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Удалить"
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
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                            <td class="px-4 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-text">
                                    {{ user.name }}
                                </div>
                            </td>
                            <td
                                class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary"
                            >
                                {{ user.login }}
                            </td>
                            <td
                                class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary"
                            >
                                {{ user.phone || "—" }}
                            </td>
                            <td class="px-4 py-4 whitespace-nowrap">
                                <span
                                    :class="[
                                        'inline-block px-3 py-1 rounded-full text-xs font-medium border',
                                        getRoleClass(user.role),
                                    ]"
                                >
                                    {{ getRoleLabel(user.role) }}
                                </span>
                            </td>
                            <td
                                v-if="currentUser?.role === UserRole.SUPER_ADMIN"
                                class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary"
                            >
                                {{ user.organization?.name || "—" }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Mobile: Users Cards -->
        <div
            v-if="users.length > 0"
            class="md:hidden space-y-3"
        >
            <div
                v-for="user in users"
                :key="user.id"
                class="bg-white rounded-lg border border-gray-200 p-4"
            >
                <!-- Header with name and actions -->
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-text truncate">
                            {{ user.name }}
                        </h3>
                        <p class="text-sm text-text-secondary">
                            {{ user.login }}
                        </p>
                    </div>
                    <div class="flex gap-2 ml-3">
                        <button
                            @click="openEditModal(user)"
                            class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </button>
                        <button
                            v-if="user.id !== currentUser?.id"
                            @click="openDeleteModal(user)"
                            class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Info grid -->
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-text-secondary">Телефон:</span>
                        <span class="text-text">{{ user.phone || "—" }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-text-secondary">Роль:</span>
                        <span
                            :class="[
                                'inline-block px-3 py-1 rounded-full text-xs font-medium border',
                                getRoleClass(user.role),
                            ]"
                        >
                            {{ getRoleLabel(user.role) }}
                        </span>
                    </div>
                    <div
                        v-if="currentUser?.role === UserRole.SUPER_ADMIN && user.organization"
                        class="flex justify-between"
                    >
                        <span class="text-text-secondary">Организация:</span>
                        <span class="text-text">{{
                            user.organization?.name || "—"
                        }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-else
            class="bg-white rounded-lg border border-gray-200 p-12 text-center"
        >
            <div
                class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
                <svg
                    class="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>
            </div>
            <h3 class="text-lg font-medium text-text mb-2">
                Нет пользователей
            </h3>
            <p class="text-text-secondary mb-4">
                Создайте первого пользователя для начала работы
            </p>
            <BaseButton @click="openCreateModal" variant="primary">
                Создать пользователя
            </BaseButton>
        </div>

        <!-- Create/Edit Modal -->
        <UserModal
            v-if="showModal"
            :user="selectedUser"
            @close="closeModal"
            @saved="handleSaved"
        />

        <!-- Delete Confirm Modal -->
        <DeleteConfirmModal
            v-if="showDeleteModal"
            :message="`Вы уверены, что хотите удалить пользователя «${userToDelete?.name}»?`"
            :loading="deleteLoading"
            @cancel="closeDeleteModal"
            @confirm="deleteUser"
        />
    </div>
</template>

<script setup lang="ts">
import { UserRole } from '#shared/constants/roles'

definePageMeta({
    layout: "default",
});

interface User {
    id: string;
    name: string;
    login: string;
    phone: string | null;
    role: "SUPER_ADMIN" | "OWNER" | "MANAGER";
    organization?: {
        id: string;
        name: string;
    };
}

const { user: currentUser } = useAuth();

const loading = ref(true);
const users = ref<User[]>([]);
const showModal = ref(false);
const selectedUser = ref<User | null>(null);
const showDeleteModal = ref(false);
const userToDelete = ref<User | null>(null);
const deleteLoading = ref(false);

// Загрузка пользователей
const fetchUsers = async () => {
    loading.value = true;
    try {
        const data = await $fetch("/api/users", {
        });
        users.value = data as User[];
    } catch (error) {
        console.error("Error fetching users:", error);
    } finally {
        loading.value = false;
    }
};

// Получить класс для роли
const getRoleClass = (role: string) => {
    switch (role) {
        case UserRole.SUPER_ADMIN:
            return "bg-purple-50 text-purple-700 border-purple-200";
        case UserRole.OWNER:
            return "bg-blue-50 text-blue-700 border-blue-200";
        case UserRole.MANAGER:
            return "bg-gray-100 text-gray-800 border-gray-300";
        default:
            return "bg-gray-100 text-gray-700 border-gray-200";
    }
};

// Получить label для роли
const getRoleLabel = (role: string) => {
    switch (role) {
        case UserRole.SUPER_ADMIN:
            return "Супер Админ";
        case UserRole.OWNER:
            return "Владелец";
        case UserRole.MANAGER:
            return "Менеджер";
        default:
            return "Неизвестно";
    }
};

// Открыть модалку создания
const openCreateModal = () => {
    selectedUser.value = null;
    showModal.value = true;
};

// Открыть модалку редактирования
const openEditModal = (user: User) => {
    selectedUser.value = user;
    showModal.value = true;
};

// Закрыть модалку
const closeModal = () => {
    showModal.value = false;
    selectedUser.value = null;
};

// Обработка сохранения
const handleSaved = () => {
    closeModal();
    fetchUsers();
};

// Открыть модалку удаления
const openDeleteModal = (user: User) => {
    userToDelete.value = user;
    showDeleteModal.value = true;
};

// Закрыть модалку удаления
const closeDeleteModal = () => {
    showDeleteModal.value = false;
    userToDelete.value = null;
};

// Удаление пользователя
const deleteUser = async () => {
    if (!userToDelete.value) return;

    deleteLoading.value = true;

    try {
        await $fetch(`/api/users/${userToDelete.value.id}`, {
            method: "DELETE",
        });
        closeDeleteModal();
        fetchUsers();
    } catch (error: any) {
        alert(error.data?.message || "Ошибка при удалении пользователя");
    } finally {
        deleteLoading.value = false;
    }
};

// Загрузка при монтировании
onMounted(() => {
    fetchUsers();
});
</script>
