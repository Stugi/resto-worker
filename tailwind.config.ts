import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,vue,ts}',
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Основные цвета текста — через CSS-переменные
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
        },
        // Цвет для активных элементов (кнопки, ссылки)
        action: {
          DEFAULT: 'var(--action)',
          hover: 'var(--action-hover)',
        },
        // Фоны
        bg: {
          DEFAULT: 'var(--bg)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
        },
        // Бордеры
        border: 'var(--border)',
        // Статусы
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
      },
    },
  },
  plugins: [],
} satisfies Config
