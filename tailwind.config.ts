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
        // Текст
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
        },
        // Action (кнопки — чёрный/белый)
        action: {
          DEFAULT: 'var(--action)',
          hover: 'var(--action-hover)',
          text: 'var(--action-text)',
        },
        // Accent (неоново-зелёный — минимальные акценты)
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
          ring: 'var(--accent-ring)',
        },
        // Фоны
        bg: {
          DEFAULT: 'var(--bg)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
        },
        // Бордеры
        border: {
          DEFAULT: 'var(--border)',
          input: 'var(--border-input)',
          'input-hover': 'var(--border-input-hover)',
        },
        // Muted (иконки, placeholder)
        muted: 'var(--muted)',
        // Статусы
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        // Статусные цвета (бейджи, алерты, иконки)
        'status-red': {
          bg: 'var(--red-bg)',
          text: 'var(--red-text)',
          border: 'var(--red-border)',
          icon: 'var(--red-icon)',
        },
        'status-green': {
          bg: 'var(--green-bg)',
          text: 'var(--green-text)',
          border: 'var(--green-border)',
          icon: 'var(--green-icon)',
        },
        'status-blue': {
          bg: 'var(--blue-bg)',
          text: 'var(--blue-text)',
          border: 'var(--blue-border)',
          icon: 'var(--blue-icon)',
        },
        'status-purple': {
          bg: 'var(--purple-bg)',
          text: 'var(--purple-text)',
          border: 'var(--purple-border)',
          icon: 'var(--purple-icon)',
        },
        'status-amber': {
          bg: 'var(--amber-bg)',
          text: 'var(--amber-text)',
          border: 'var(--amber-border)',
          icon: 'var(--amber-icon)',
        },
        'status-emerald': {
          bg: 'var(--emerald-bg)',
          text: 'var(--emerald-text)',
          border: 'var(--emerald-border)',
          icon: 'var(--emerald-icon)',
          btn: 'var(--emerald-btn)',
          'btn-hover': 'var(--emerald-btn-hover)',
        },
        'status-yellow': {
          bg: 'var(--yellow-bg)',
          icon: 'var(--yellow-icon)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
