<template>
  <div v-if="total > pageSize" class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
    <p class="text-sm text-text-secondary">
      Показано {{ from }}–{{ to }} из {{ total }}
    </p>
    <div class="flex gap-2">
      <button
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
        :class="[
          'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
          page <= 1
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-gray-300 text-text hover:bg-gray-50 cursor-pointer'
        ]"
      >
        Назад
      </button>
      <button
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
        :class="[
          'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
          page >= totalPages
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-gray-300 text-text hover:bg-gray-50 cursor-pointer'
        ]"
      >
        Вперёд
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  page: number
  pageSize: number
  total: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:page': [value: number]
}>()

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))
const from = computed(() => (props.page - 1) * props.pageSize + 1)
const to = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>
