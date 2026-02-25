// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@pinia/nuxt'
  ],
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  },
  runtimeConfig: {
    // Private keys (только на сервере)
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',

    // Public keys (доступны на клиенте)
    public: {
      apiBase: '/api',
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'resto_worker_bot'
    }
  },

  // Transpile vue-datepicker для SSR
  build: {
    transpile: ['@vuepic/vue-datepicker', 'vue3-apexcharts']
  },

  // Глобальные стили
  css: [
    '~/assets/css/main.css',
    '~/assets/css/scrollbar.css',
  ],

  // Разрешаем Telegram iframe
  app: {
    head: {
      meta: [
        {
          'http-equiv': 'Content-Security-Policy',
          content: "frame-src https://oauth.telegram.org https://telegram.org;"
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },

  // Настройки Nitro для сессий
  nitro: {
    experimental: {
      sessions: true
    },
    // Фикс ESM directory import для gramjs на Vercel
    rollupConfig: {
      plugins: [
        {
          name: 'fix-telegram-sessions',
          resolveId(source: string) {
            if (source === 'telegram/sessions') {
              return { id: 'telegram/sessions/index.js', external: true }
            }
          }
        }
      ]
    }
  }
})
