<template>
    <div>
        <!-- Header -->
        <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
        >
            <div>
                <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
                    Организации
                </h1>
                <p class="text-text-secondary">
                    Управление организациями и биллингом
                </p>
            </div>

            <BaseButton @click="openCreateModal" variant="primary" size="md">
                Создать организацию
            </BaseButton>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div
                class="animate-spin rounded-full h-12 w-12 border-b-2 border-action"
            ></div>
        </div>

        <!-- Organizations Grid -->
        <div
            v-else-if="organizations.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
            <div
                v-for="org in organizations"
                :key="org.id"
                class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
                <!-- Название -->
                <h3 class="text-lg font-semibold text-text mb-3">
                    {{ org.name }}
                </h3>

                <!-- Статистика -->
                <div class="space-y-2 mb-4">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-text-secondary">Пользователей:</span>
                        <span class="font-medium text-text">{{
                            org._count.users
                        }}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-text-secondary">Ресторанов:</span>
                        <span class="font-medium text-text">{{
                            org._count.restaurants
                        }}</span>
                    </div>
                </div>

                <!-- Подписка и тариф -->
                <div class="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2.5">
                    <!-- Статус + тариф -->
                    <div class="flex items-center justify-between">
                        <span
                            :class="[
                                'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                getBillingStatusClass(org.billing?.status),
                            ]"
                        >
                            {{ getBillingStatusLabel(org.billing?.status) }}
                        </span>
                        <span
                            v-if="org.billing?.tariff"
                            class="text-sm font-medium text-text"
                        >
                            {{ org.billing.tariff.name }}
                            <span class="text-text-secondary font-normal">
                                — {{ formatPrice(org.billing.tariff.price) }}
                            </span>
                        </span>
                        <span v-else class="text-xs text-text-secondary italic">
                            Тариф не выбран
                        </span>
                    </div>

                    <!-- Дата окончания -->
                    <div v-if="org.billing?.activeUntil || org.billing?.trialEndsAt" class="flex items-center gap-1.5 text-sm">
                        <svg class="w-4 h-4 flex-shrink-0" :class="isSubscriptionExpired(org.billing) ? 'text-red-500' : 'text-text-secondary'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <template v-if="org.billing?.activeUntil">
                            <span :class="isSubscriptionExpired(org.billing) ? 'text-red-600 font-medium' : 'text-text-secondary'">
                                Подписка до: {{ formatDate(org.billing.activeUntil) }}
                            </span>
                            <span v-if="isSubscriptionExpired(org.billing)" class="text-xs text-red-600 font-medium">· Истекла</span>
                        </template>
                        <template v-else-if="org.billing?.trialEndsAt">
                            <span :class="isSubscriptionExpired(org.billing) ? 'text-red-600 font-medium' : 'text-text-secondary'">
                                Триал до: {{ formatDate(org.billing.trialEndsAt) }}
                            </span>
                            <span v-if="isSubscriptionExpired(org.billing)" class="text-xs text-red-600 font-medium">· Истёк</span>
                        </template>
                    </div>

                    <!-- Транскрипции прогресс -->
                    <div v-if="org.billing?.tariff" class="space-y-1">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-text-secondary">Транскрипции</span>
                            <span class="font-medium text-text">
                                {{ org.billing.transcriptionsUsed ?? 0 }} / {{ org.billing.tariff.maxTranscriptions }}
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                                class="h-1.5 rounded-full transition-all"
                                :class="getTranscriptionBarClass(org.billing)"
                                :style="{ width: getTranscriptionPercent(org.billing) + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- Кнопка оплаты (для организаций без активной подписки) -->
                <div v-if="org.billing?.status !== 'ACTIVE'" class="mb-4">
                    <button
                        @click="openPaymentModal(org)"
                        class="w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                        Оплатить подписку
                    </button>
                </div>

                <!-- Действия -->
                <div class="flex gap-2 justify-end">
                    <button
                        @click="openEditModal(org)"
                        class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Редактировать"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        @click="openDeleteModal(org)"
                        class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                </svg>
            </div>
            <h3 class="text-lg font-medium text-text mb-2">Нет организаций</h3>
            <p class="text-text-secondary mb-4">
                Создайте первую организацию для начала работы
            </p>
            <BaseButton @click="openCreateModal" variant="primary">
                Создать организацию
            </BaseButton>
        </div>

        <!-- Create/Edit Modal -->
        <OrganizationModal
            v-if="showModal"
            :organization="selectedOrg"
            @close="closeModal"
            @saved="handleSaved"
        />

        <!-- Delete Confirm Modal -->
        <DeleteConfirmModal
            v-if="showDeleteModal"
            :message="`Вы уверены, что хотите удалить организацию «${orgToDelete?.name}»?`"
            :loading="deleteLoading"
            @cancel="closeDeleteModal"
            @confirm="deleteOrganization"
        />

        <!-- Payment Modal -->
        <PaymentModal
            v-if="showPaymentModal"
            :organization="paymentOrg!"
            @close="closePaymentModal"
            @paid="handlePaid"
        />
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "default",
});

interface Organization {
    id: string;
    name: string;
    billing?: {
        id: string;
        status: string;
        tariffId?: string;
        tariff?: {
            id: string;
            name: string;
            price: number;
            maxTranscriptions: number;
        };
        activeUntil?: string;
        trialEndsAt?: string;
        transcriptionsUsed?: number;
    };
    _count: {
        users: number;
        restaurants: number;
    };
}

const loading = ref(true);
const organizations = ref<Organization[]>([]);
const showModal = ref(false);
const selectedOrg = ref<Organization | null>(null);
const showDeleteModal = ref(false);
const orgToDelete = ref<Organization | null>(null);
const deleteLoading = ref(false);
const showPaymentModal = ref(false);
const paymentOrg = ref<Organization | null>(null);

// Загрузка организаций
const fetchOrganizations = async () => {
    loading.value = true;
    try {
        const data = await $fetch("/api/organizations", {
        });
        organizations.value = data as Organization[];
    } catch (error) {
        console.error("Error fetching organizations:", error);
    } finally {
        loading.value = false;
    }
};

// Открыть модалку создания
const openCreateModal = () => {
    selectedOrg.value = null;
    showModal.value = true;
};

// Открыть модалку редактирования
const openEditModal = (org: Organization) => {
    selectedOrg.value = org;
    showModal.value = true;
};

// Закрыть модалку
const closeModal = () => {
    showModal.value = false;
    selectedOrg.value = null;
};

// Обработка сохранения
const handleSaved = () => {
    closeModal();
    fetchOrganizations();
};

// Открыть модалку удаления
const openDeleteModal = (org: Organization) => {
    orgToDelete.value = org;
    showDeleteModal.value = true;
};

// Закрыть модалку удаления
const closeDeleteModal = () => {
    showDeleteModal.value = false;
    orgToDelete.value = null;
};

// Удаление организации
const deleteOrganization = async () => {
    if (!orgToDelete.value) return;

    deleteLoading.value = true;

    try {
        await $fetch(`/api/organizations/${orgToDelete.value.id}`, {
            method: "DELETE",
        });
        closeDeleteModal();
        fetchOrganizations();
    } catch (error: any) {
        alert(error.data?.message || "Ошибка при удалении организации");
    } finally {
        deleteLoading.value = false;
    }
};

// Оплата
const openPaymentModal = (org: Organization) => {
    paymentOrg.value = org;
    showPaymentModal.value = true;
};

const closePaymentModal = () => {
    showPaymentModal.value = false;
    paymentOrg.value = null;
};

const handlePaid = () => {
    closePaymentModal();
    fetchOrganizations();
};

// Получить класс для статуса биллинга
const getBillingStatusClass = (status?: string) => {
    switch (status) {
        case "TRIAL":
            return "bg-amber-50 text-amber-700 border border-amber-200";
        case "ACTIVE":
            return "bg-emerald-50 text-emerald-700 border border-emerald-200";
        case "DISABLED":
            return "bg-red-50 text-red-700 border border-red-200";
        default:
            return "bg-gray-100 text-gray-700 border border-gray-200";
    }
};

// Получить label для статуса биллинга
const getBillingStatusLabel = (status?: string) => {
    switch (status) {
        case "TRIAL":
            return "Пробный период";
        case "ACTIVE":
            return "Активна";
        case "DISABLED":
            return "Отключена";
        default:
            return "Неизвестно";
    }
};

// Форматирование цены
const formatPrice = (price: number) => {
    return price.toLocaleString("ru-RU") + " \u20BD/мес";
};

// Форматирование даты
const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU");
};

// Проверка истечения подписки/триала
const isSubscriptionExpired = (billing?: Organization["billing"]) => {
    if (!billing) return false;
    const now = new Date();
    if (billing.activeUntil) return new Date(billing.activeUntil) < now;
    if (billing.trialEndsAt) return new Date(billing.trialEndsAt) < now;
    return false;
};

// Процент использования транскрипций
const getTranscriptionPercent = (billing?: Organization["billing"]) => {
    if (!billing?.tariff) return 0;
    const used = billing.transcriptionsUsed ?? 0;
    const max = billing.tariff.maxTranscriptions;
    if (max <= 0) return 0;
    return Math.min(100, Math.round((used / max) * 100));
};

// Цвет прогресс-бара транскрипций
const getTranscriptionBarClass = (billing?: Organization["billing"]) => {
    const percent = getTranscriptionPercent(billing);
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    return "bg-emerald-500";
};

// Загрузка при монтировании
onMounted(() => {
    fetchOrganizations();
});
</script>
