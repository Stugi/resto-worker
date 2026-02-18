# Архитектура RestoWorker

## Стек технологий

| Компонент | Технология |
|---|---|
| Фреймворк | Nuxt 4 (Vue 3 + Nitro) |
| Стили | Tailwind CSS |
| База данных | PostgreSQL (Neon) |
| ORM | Prisma 6.10 (multi-file schema) |
| Telegram Bot | Grammy |
| Telegram Userbot | gramjs (MTProto) |
| Платежи | Альфа-Банк Интернет-Эквайринг |
| Хостинг | Vercel (Serverless) |
| ID | cuid2 |

## Структура проекта

```
resto-worker/
  app/                        # Фронтенд (Nuxt pages + components)
    components/
      Base/                   # Базовые UI-компоненты (Button, Input)
      Layout/                 # Sidebar, Header
      OrganizationModal.vue   # Модалка организации
      TariffModal.vue         # Модалка тарифа
      PromptModal.vue         # Модалка промпта
      PaymentModal.vue        # Модалка оплаты
      DeleteConfirmModal.vue  # Универсальная модалка удаления
    pages/
      admin/
        prompts/              # Управление промптами GPT
        tariffs/              # Управление тарифами
      organizations/          # Управление организациями
      restaurants/            # Управление ресторанами
      users/                  # Управление пользователями
      analytics/              # Аналитика
      stats/                  # Статистика
      payment/                # Страницы success/fail оплаты
      auth/                   # Авторизация
    composables/              # Vue composables (useAuth и др.)

  server/                     # Бэкенд (Nitro)
    api/
      auth/                   # Авторизация (login, register, me)
      bot/
        webhook.post.ts       # Telegram Bot webhook (Grammy)
      organizations/          # CRUD организаций
      restaurants/            # CRUD ресторанов
      users/                  # CRUD пользователей
      prompts/                # CRUD промптов GPT
      tariffs/                # CRUD тарифов
      payments/               # Платежи (create, check, list)
    utils/
      auth.ts                 # Аутентификация и сессии
      prisma.ts               # Prisma client
      alfa-payment.ts         # Альфа-Банк API
      userbot.ts              # Telegram MTProto userbot

  shared/                     # Общий код (фронт + бэк)
    constants/
      roles.ts                # Роли: SUPER_ADMIN, OWNER, MANAGER

  prisma/
    schema/                   # Multi-file Prisma schema
      base.prisma             # datasource + generator
      user.prisma             # User
      organization.prisma     # Organization
      restaurant.prisma       # Restaurant
      billing.prisma          # Billing (подписки)
      tariff.prisma           # Tariff (тарифы)
      payment.prisma          # Payment (платежи)
      report-prompt.prisma    # ReportPrompt (промпты GPT)

  docs/                       # Документация
```

## Роли пользователей

| Роль | Описание | Доступ |
|---|---|---|
| `SUPER_ADMIN` | Администратор платформы | Все организации, тарифы, промпты |
| `OWNER` | Владелец организации | Свои рестораны, пользователи, промпты |
| `MANAGER` | Менеджер ресторана | Голосовые отчёты, статистика |

## API паттерны

### Аутентификация
- Все API-эндпоинты начинаются с `requireAuth(event)` — получение текущего пользователя
- Сессии хранятся в httpOnly cookies (7 дней)
- Nitro auto-import: `requireAuth`, `prisma` доступны без явного импорта

### CRUD-паттерн
```
server/api/{resource}/
  index.get.ts     — GET /{resource}         — Список
  index.post.ts    — POST /{resource}        — Создание
  [id].get.ts      — GET /{resource}/:id     — Получение
  [id].patch.ts    — PATCH /{resource}/:id   — Обновление
  [id].delete.ts   — DELETE /{resource}/:id  — Удаление (soft)
```

### Soft Delete
Все сущности используют soft delete:
- `deletedAt: DateTime?` — дата удаления
- `deletedBy: String?` — кто удалил
- Все запросы фильтруют: `where: { deletedAt: null }`

### ID генерация
- Используется `cuid2` для всех новых записей
- Формат: `import { createId } from '@paralleldrive/cuid2'`

## Telegram Bot

### Поток онбординга
```
/start → Контакт (requestContact) → Имя организации → Масштаб → Авто-создание всего
```

1. Пользователь нажимает /start
2. Отправляет контакт (телефон)
3. Вводит название организации
4. Выбирает масштаб (1 / 2-10 / 11+)
5. Система автоматически создаёт:
   - Organization
   - Billing (TRIAL, 7 дней)
   - Restaurant
   - User (OWNER)
6. Userbot создаёт Telegram-группу для ресторана

### Userbot (MTProto)
- Используется gramjs для создания групп через Telegram API
- Сессия зашифрована AES-256-GCM и хранится в env
- Создаёт группу → Добавляет бота → Возвращает chatId

## Платежи

Подробная документация: [PAYMENT_ALFA.md](./PAYMENT_ALFA.md)

### Поток
```
Клиент → POST /api/payments/create → Альфа-Банк register.do → formUrl
Клиент ← redirect на formUrl (платёжная форма банка)
Банк → redirect на /payment/success?paymentId=XXX
Клиент → POST /api/payments/check → getOrderStatusExtended.do → Активация подписки
```

### Тарифы
- `Пробный`: 7 дней, 100 транскрипций, бесплатно
- `Базовый`: 30 дней, 950 руб/мес, расширенные лимиты

## Логирование

Все важные операции логируются с префиксами:
- `[alfa]` — Альфа-Банк API
- `[payments]` — Платежи
- `[tariffs]` — Тарифы
- `[userbot]` — Telegram userbot
- `[bot]` — Telegram bot webhook

## Переменные окружения

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `SESSION_SECRET` | Секрет для подписи сессий |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота |
| `TELEGRAM_BOT_USERNAME` | Username бота (без @) |
| `USERBOT_API_ID` | Telegram API ID для userbot |
| `USERBOT_API_HASH` | Telegram API Hash для userbot |
| `USERBOT_SESSION_ENCRYPTED` | Зашифрованная сессия userbot |
| `USERBOT_ENCRYPTION_KEY` | Ключ шифрования сессии |
| `USERBOT_ENABLED` | Включить/выключить userbot |
| `ALFA_MERCHANT_LOGIN` | Логин мерчанта Альфа-Банк |
| `ALFA_MERCHANT_PASSWORD` | Пароль мерчанта |
| `ALFA_API_URL` | URL API банка |
| `APP_URL` | URL приложения |
