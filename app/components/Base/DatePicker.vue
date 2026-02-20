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
/* Инпут — стилизация под дизайн-систему */
.dp-custom-input {
  width: 100% !important;
  padding: 0.5rem 1rem !important;
  border: 1px solid #d1d5db !important;
  border-radius: 0.5rem !important;
  font-size: 0.875rem !important;
  color: #1a1a1a !important;
  outline: none !important;
  transition: border-color 0.15s, box-shadow 0.15s !important;
  background: white !important;
}

.dp-custom-input:focus {
  border-color: #00dc7f !important;
  box-shadow: 0 0 0 2px rgba(0, 220, 127, 0.2) !important;
}

.dp-custom-input::placeholder {
  color: #9ca3af !important;
}

/* Меню — accent цвет */
.dp-custom-menu {
  --dp-primary-color: #00dc7f;
  --dp-primary-text-color: #fff;
  --dp-secondary-color: #f0fdf4;
  --dp-border-color: #e5e7eb;
  --dp-menu-border-color: #e5e7eb;
  --dp-border-color-hover: #00dc7f;
  --dp-hover-color: #f0fdf4;
  --dp-hover-text-color: #1a1a1a;
  --dp-font-size: 0.875rem;
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}

.dp-custom-cell.dp__today {
  border-color: #00dc7f !important;
}
</style>
