<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-sm font-medium text-text mb-2">
      {{ label }}
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :required="required"
      :minlength="minlength"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full px-4 py-2 border border-gray-300 rounded-lg transition-colors outline-none focus:border-action focus:ring-2 focus:ring-action/20 disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <p v-if="hint" class="text-xs text-text-secondary mt-1">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  id?: string
  type?: string
  modelValue: string
  label?: string
  placeholder?: string
  required?: boolean
  minlength?: number
  disabled?: boolean
  hint?: string
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
