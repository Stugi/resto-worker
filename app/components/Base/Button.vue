<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
  >
    <span v-if="loading" class="inline-flex items-center gap-2">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {{ loadingText }}
    </span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
interface Props {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  gradient?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  loadingText: 'Загрузка...',
  gradient: false,
  fullWidth: false
})

const buttonClasses = computed(() => {
  const classes = []

  // Base styles
  classes.push('inline-flex items-center justify-center rounded-lg font-medium transition-all')

  // Width
  if (props.fullWidth) {
    classes.push('w-full')
  }

  // Size
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-base'
  }
  classes.push(sizeClasses[props.size])

  // Variant styles
  if (props.variant === 'primary') {
    if (props.gradient) {
      classes.push(
        'bg-gradient-to-r from-accent to-emerald-400 text-white',
        'hover:from-accent/90 hover:to-emerald-400/90',
        'shadow-lg hover:shadow-xl'
      )
    } else {
      classes.push(
        'bg-action text-action-text',
        'hover:bg-action-hover',
        'shadow-md hover:shadow-lg'
      )
    }
  } else if (props.variant === 'secondary') {
    classes.push(
      'bg-bg-secondary text-text',
      'hover:bg-bg-hover',
      'border border-border-input'
    )
  } else if (props.variant === 'outline') {
    classes.push(
      'bg-transparent text-text border-2 border-text',
      'hover:bg-text hover:text-bg-card'
    )
  } else if (props.variant === 'ghost') {
    classes.push(
      'bg-transparent text-text',
      'hover:bg-bg-hover'
    )
  }

  // Disabled state
  if (props.disabled || props.loading) {
    classes.push('opacity-50 cursor-not-allowed')
  } else {
    classes.push('cursor-pointer')
  }

  return classes.join(' ')
})
</script>
