<template>
    <div>
        <!-- Header -->
        <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
        >
            <div>
                <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
                    Транскрипции
                </h1>
                <p class="text-text-secondary">
                    Расшифровки голосовых отчётов менеджеров
                </p>
            </div>
        </div>

        <!-- Фильтры -->
        <div class="flex flex-col md:flex-row gap-3 mb-6">
            <div class="w-full md:w-64">
                <BaseSelect
                    v-model="selectedRestaurant"
                    :options="[
                        { value: '', label: 'Все рестораны' },
                        ...restaurants.map((r) => ({
                            value: r.id,
                            label: r.name,
                        })),
                    ]"
                    placeholder="Все рестораны"
                />
            </div>
            <div class="flex gap-3 flex-1">
                <div class="w-full md:w-48">
                    <BaseDatePicker v-model="dateFrom" placeholder="от" />
                </div>
                <div class="w-full md:w-48">
                    <BaseDatePicker v-model="dateTo" placeholder="до" />
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <BaseSpinner size="lg" />
        </div>

        <!-- Transcripts List -->
        <div v-else-if="transcripts.length > 0" class="space-y-4">
            <div
                v-for="t in transcripts"
                :key="t.id"
                class="bg-bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow"
            >
                <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                        <!-- Мета-данные -->
                        <div
                            class="flex items-center gap-3 mb-2 flex-wrap text-sm"
                        >
                            <span class="text-text-secondary">
                                {{ formatDate(t.createdAt) }}
                            </span>
                            <span
                                v-if="t.restaurant"
                                class="px-2 py-0.5 bg-status-blue-bg text-status-blue-text rounded-full text-xs font-medium"
                            >
                                {{ t.restaurant.name }}
                            </span>
                            <span v-if="t.user" class="text-text-secondary">
                                {{ t.user.name || "Без имени" }}
                            </span>
                            <span
                                v-if="t.voiceMessage"
                                class="text-text-secondary"
                            >
                                {{ t.voiceMessage.duration }}с
                            </span>
                        </div>

                        <!-- Текст транскрипции -->
                        <p
                            class="text-text text-sm leading-relaxed whitespace-pre-wrap"
                        >
                            {{
                                expanded[t.id] ? t.text : truncate(t.text, 300)
                            }}
                        </p>

                        <!-- Кнопка "Показать полностью" -->
                        <button
                            v-if="t.text.length > 300"
                            @click="toggleExpand(t.id)"
                            class="text-action text-sm font-medium mt-2 hover:underline"
                        >
                            {{
                                expanded[t.id]
                                    ? "Свернуть"
                                    : "Показать полностью"
                            }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Пагинация -->
            <BasePagination
                :page="page"
                :page-size="pageSize"
                :total="total"
                @update:page="goToPage"
            />
        </div>

        <!-- Empty State -->
        <div
            v-else
            class="bg-bg-card rounded-lg border border-border p-12 text-center"
        >
            <div
                class="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4"
            >
                <svg
                    class="w-8 h-8 text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                </svg>
            </div>
            <h3 class="text-lg font-medium text-text mb-2">Нет транскрипций</h3>
            <p class="text-text-secondary">
                {{
                    hasActiveFilters
                        ? "Нет транскрипций по заданным фильтрам"
                        : "Отправьте голосовое сообщение в группу ресторана — бот автоматически его расшифрует"
                }}
            </p>
            <BaseButton
                v-if="hasActiveFilters"
                @click="resetFilters"
                variant="primary"
                class="mt-4"
            >
                Сбросить фильтры
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "default",
});

interface TranscriptItem {
    id: string;
    text: string;
    language: string | null;
    createdAt: string;
    restaurant: { id: string; name: string } | null;
    user: { id: string; name: string } | null;
    voiceMessage: { id: string; duration: number; status: string } | null;
}

const loading = ref(true);
const transcripts = ref<TranscriptItem[]>([]);
const restaurants = ref<{ id: string; name: string }[]>([]);
const expanded = ref<Record<string, boolean>>({});

// Фильтры
const selectedRestaurant = ref("");
const dateFrom = ref("");
const dateTo = ref("");

// Пагинация
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const hasActiveFilters = computed(
    () =>
        selectedRestaurant.value !== "" ||
        dateFrom.value !== "" ||
        dateTo.value !== "",
);

const fetchTranscripts = async () => {
    loading.value = true;
    try {
        const params: Record<string, any> = { page: page.value, pageSize };
        if (selectedRestaurant.value)
            params.restaurantId = selectedRestaurant.value;
        if (dateFrom.value) params.from = dateFrom.value;
        if (dateTo.value) params.to = dateTo.value;

        const data = await $fetch<{ items: TranscriptItem[]; total: number }>(
            "/api/transcripts",
            { params },
        );
        transcripts.value = data.items;
        total.value = data.total;
    } catch (error) {
        console.error("Error fetching transcripts:", error);
    } finally {
        loading.value = false;
    }
};

const fetchRestaurants = async () => {
    try {
        const data = await $fetch("/api/restaurants");
        restaurants.value = (data as any[]).map((r) => ({
            id: r.id,
            name: r.name,
        }));
    } catch (e) {
        /* ignore */
    }
};

const goToPage = (newPage: number) => {
    page.value = newPage;
    fetchTranscripts();
};

const resetFilters = () => {
    selectedRestaurant.value = "";
    dateFrom.value = "";
    dateTo.value = "";
};

const toggleExpand = (id: string) => {
    expanded.value[id] = !expanded.value[id];
};

const truncate = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.substring(0, max) + "...";
};

const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

// При смене фильтров — сброс на 1 страницу + перезагрузка
watch([selectedRestaurant, dateFrom, dateTo], () => {
    page.value = 1;
    fetchTranscripts();
});

onMounted(() => {
    fetchRestaurants();
    fetchTranscripts();
});
</script>
