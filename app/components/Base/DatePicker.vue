<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-text mb-2">
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
    />
  </div>
</template>

<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { ru } from 'date-fns/locale'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Выберите дату',
  disabled: false,
  clearable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const locale = ru
const displayFormat = 'dd.MM.yyyy'

const inputClassName = 'dp-custom-input'

// Конвертируем строку YYYY-MM-DD в Date для VueDatePicker
const internalValue = computed(() => {
  if (!props.modelValue) return null
  const d = new Date(props.modelValue + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
})

// Конвертируем Date обратно в YYYY-MM-DD строку
const onUpdate = (value: Date | null) => {
  if (!value) {
    emit('update:modelValue', '')
    return
  }
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  emit('update:modelValue', `${y}-${m}-${d}`)
}
</script>

<style>
/* Обёртка инпута — убираем стандартные стили VueDatePicker */
.dp__input_wrap .dp__input {
  font-family: inherit !important;
}

/* Инпут — точное совпадение с BaseSelect */
.dp-custom-input {
  width: 100% !important;
  height: auto !important;
  padding: 0.5rem 1rem !important;
  padding-left: 2.5rem !important;
  border: 1px solid var(--border-input) !important;
  border-radius: 0.5rem !important;
  font-size: 1rem !important;
  line-height: 1.5 !important;
  color: var(--text) !important;
  outline: none !important;
  transition: border-color 0.15s, box-shadow 0.15s !important;
  background: var(--bg-card) !important;
}

.dp-custom-input:hover {
  border-color: var(--border-input-hover) !important;
}

.dp-custom-input:focus {
  border-color: var(--action) !important;
  box-shadow: 0 0 0 2px var(--action-ring) !important;
}

.dp-custom-input::placeholder {
  color: var(--muted) !important;
}

/* Иконка календаря */
.dp__input_icon {
  color: var(--muted) !important;
  left: 0.75rem !important;
  width: 1rem !important;
  height: 1rem !important;
}

/* Кнопка очистки */
.dp__clear_icon {
  color: var(--muted) !important;
  right: 0.75rem !important;
  width: 1rem !important;
  height: 1rem !important;
}

/* Меню — accent цвет */
.dp-custom-menu {
  --dp-primary-color: var(--action);
  --dp-primary-text-color: var(--action-text);
  --dp-secondary-color: var(--text-secondary);
  --dp-border-color: var(--border);
  --dp-menu-border-color: var(--border);
  --dp-border-color-hover: var(--action);
  --dp-hover-color: var(--action-light);
  --dp-hover-text-color: var(--text);
  --dp-background-color: var(--bg-card);
  --dp-surface-color: var(--bg-card);
  --dp-text-color: var(--text);
  --dp-disabled-color: var(--muted);
  --dp-disabled-color-text: var(--muted);
  --dp-icon-color: var(--muted);
  --dp-danger-color: var(--red-icon);
  --dp-highlight-color: var(--action-light);
  --dp-range-between-dates-background-color: var(--action-light);
  --dp-range-between-dates-text-color: var(--text);
  --dp-range-between-border-color: var(--action-light);
  --dp-font-size: 0.875rem;
  border-radius: 0.5rem !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}

/* Фон для всех вложенных элементов меню */
.dp-custom-menu .dp__menu_inner,
.dp-custom-menu .dp__calendar_header,
.dp-custom-menu .dp__calendar,
.dp-custom-menu .dp__action_row,
.dp-custom-menu .dp__month_year_wrap,
.dp-custom-menu .dp__overlay {
  background-color: var(--bg-card) !important;
  color: var(--text) !important;
}

.dp-custom-menu .dp__overlay_cell {
  color: var(--text) !important;
}

.dp-custom-menu .dp__overlay_cell:hover {
  background-color: var(--action-light) !important;
}

.dp-custom-menu .dp__calendar_header_item {
  color: var(--text-secondary) !important;
}

.dp-custom-menu .dp__inner_nav:hover {
  background-color: var(--bg-hover) !important;
}

.dp-custom-menu .dp__inner_nav svg {
  color: var(--text-secondary) !important;
}

.dp-custom-cell.dp__today {
  border-color: var(--action) !important;
}
</style>
