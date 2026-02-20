type Theme = 'light' | 'dark'

const STORAGE_KEY = 'resto-theme'

const currentTheme = ref<Theme>('light')

export function useTheme() {
  const isDark = computed(() => currentTheme.value === 'dark')

  function setTheme(theme: Theme) {
    currentTheme.value = theme
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  function toggle() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  // Инициализация: читаем из localStorage или системных настроек
  function init() {
    if (!import.meta.client) return

    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved) {
      setTheme(saved)
      return
    }

    // Системная тема
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }

  return {
    theme: currentTheme,
    isDark,
    toggle,
    setTheme,
    init,
  }
}
