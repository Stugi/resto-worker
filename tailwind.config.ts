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
  theme: {
    extend: {
      colors: {
        // Основные цвета текста
        text: {
          DEFAULT: '#1a1a1a',
          secondary: '#6b7280',
        },
        // Цвет для активных элементов (кнопки, ссылки)
        action: {
          DEFAULT: '#00dc7f', // Яркий зеленый
          hover: '#00c26f',   // Темнее на hover
        },
      },
    },
  },
  plugins: [],
} satisfies Config
