<template>
    <div class="w-full">
        <!-- <label v-if="label" class="block text-sm font-medium text-text mb-2">
      {{ label }}
    </label>
    <VueDatePicker
      :model-value="internalValue"
      @update:model-value="onUpdate"
      :locale="locale"
      :format="displayFormat"
      :enable-time-picker="false"
      auto-apply
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      text-input
      :text-input-options="{ format: 'dd.MM.yyyy' }"
      month-name-format="long"
      :input-class-name="inputClassName"
      menu-class-name="dp-custom-menu"
      calendar-cell-class-name="dp-custom-cell"
      :hide-input-icon="true"
    /> -->
    </div>
</template>

<script setup lang="ts">
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { ru } from "date-fns/locale";

interface Props {
    modelValue: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: "Выберите дату",
    disabled: false,
    clearable: true,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const locale = ru;
const displayFormat = "dd.MM.yyyy";

const inputClassName = "dp-custom-input";

// Конвертируем строку YYYY-MM-DD в Date для VueDatePicker
const internalValue = computed(() => {
    if (!props.modelValue) return null;
    const d = new Date(props.modelValue + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
});

// Конвертируем Date обратно в YYYY-MM-DD строку
const onUpdate = (value: Date | null) => {
    if (!value) {
        emit("update:modelValue", "");
        return;
    }
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    emit("update:modelValue", `${y}-${m}-${d}`);
};
</script>

<style>
/* Сброс обёрток VueDatePicker */
.dp__main {
    --dp-input-padding: 8px 16px !important;
    --dp-input-icon-padding: 8px 16px !important;
    --dp-font-size: 1rem !important;
    --dp-border-radius: 0.5rem !important;
}

.dp__input_wrap .dp__input {
    font-family: inherit !important;
}

/* Инпут — точное совпадение с BaseInput: px-4 py-2 rounded-lg */
.dp-custom-input {
    width: 100% !important;
    height: auto !important;
    padding: 0.5rem 1rem !important;
    border: 1px solid var(--border-input) !important;
    border-radius: 0.5rem !important;
    font-size: 1rem !important;
    line-height: 1.5 !important;
    color: var(--text) !important;
    outline: none !important;
    transition:
        border-color 0.15s,
        box-shadow 0.15s !important;
    background: var(--bg-card) !important;
    box-sizing: border-box !important;
}

.dp-custom-input:hover {
    border-color: var(--border-input-hover) !important;
}

.dp-custom-input:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px var(--accent-ring) !important;
}

.dp-custom-input::placeholder {
    color: var(--muted) !important;
}

/* Кнопка очистки */
.dp__clear_icon {
    color: var(--muted) !important;
    right: 0.75rem !important;
    width: 1rem !important;
    height: 1rem !important;
}

/* Меню — стили перенесены в main.css для корректной работы с teleport */
.dp-custom-menu {
    border-radius: 0.5rem !important;
    box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.1),
        0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}
</style>
