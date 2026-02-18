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

  // Глобальные стили
  css: ['~/assets/css/scrollbar.css'],

  // Разрешаем Telegram iframe
  app: {
    head: {
      meta: [
        {
          'http-equiv': 'Content-Security-Policy',
          content: "frame-src https://oauth.telegram.org https://telegram.org;"
        }
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
