<template>
  <div class="w-full" ref="selectRef">
    <label v-if="label" :for="id" class="block text-sm font-medium text-text mb-2">
      {{ label }}
    </label>
    <div class="relative">
      <button
        :id="id"
        type="button"
        :disabled="disabled"
        @click="toggle"
        :class="[
          'w-full flex items-center justify-between px-4 py-2 border rounded-lg transition-colors outline-none text-left',
          isOpen
            ? 'border-action shadow-[0_0_0_2px_var(--action-ring)]'
            : 'border-border-input hover:border-border-input-hover',
          disabled ? 'opacity-50 cursor-not-allowed bg-bg-secondary' : 'cursor-pointer bg-bg-card'
        ]"
      >
        <span :class="selectedLabel ? 'text-text' : 'text-muted'">
          {{ selectedLabel || placeholder }}
        </span>
        <svg
          :class="['w-4 h-4 text-muted transition-transform shrink-0 ml-2', isOpen && 'rotate-180']"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="isOpen"
          class="absolute z-50 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          <!-- Search -->
          <div v-if="searchable && normalizedOptions.length > 5" class="p-2 border-b border-border">
            <input
              ref="searchInput"
              v-model="search"
              type="text"
              class="w-full px-3 py-1.5 text-sm border border-border rounded-md outline-none focus:border-action focus:shadow-[0_0_0_1px_var(--action-ring)]"
              placeholder="Поиск..."
              @click.stop
            />
          </div>

          <!-- Options -->
          <div class="py-1">
            <button
              v-for="option in filteredOptions"
              :key="String(option.value)"
              type="button"
              @click="selectOption(option)"
              :class="[
                'w-full text-left px-4 py-2 text-sm transition-colors',
                option.value === modelValue
                  ? 'bg-action/10 text-action font-medium'
                  : 'text-text hover:bg-bg-hover'
              ]"
            >
              {{ option.label }}
            </button>

            <div
              v-if="filteredOptions.length === 0"
              class="px-4 py-3 text-sm text-text-secondary text-center"
            >
              Ничего не найдено
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <p v-if="hint" class="text-xs text-text-secondary mt-1">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
export interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  id?: string
  modelValue: string | number
  options: SelectOption[] | { value: string | number; label: string }[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Выберите...',
  required: false,
  disabled: false,
  searchable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectRef = ref<HTMLElement>()
const searchInput = ref<HTMLInputElement>()
const isOpen = ref(false)
const search = ref('')

const normalizedOptions = computed<SelectOption[]>(() => props.options)

const filteredOptions = computed(() => {
  if (!search.value) return normalizedOptions.value
  const q = search.value.toLowerCase()
  return normalizedOptions.value.filter(o => o.label.toLowerCase().includes(q))
})

const selectedLabel = computed(() => {
  const found = normalizedOptions.value.find(o => o.value === props.modelValue)
  return found?.label || ''
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  search.value = ''
  if (isOpen.value) {
    nextTick(() => searchInput.value?.focus())
  }
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  isOpen.value = false
  search.value = ''
}

// Close on outside click
function onClickOutside(e: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    isOpen.value = false
    search.value = ''
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>
