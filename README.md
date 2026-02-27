# CosmicMind AI 🍽️

Система управления ресторанами с AI-аналитикой голосовых отзывов, Telegram-ботом и автоматическими отчётами.

## Технологии

- **Frontend**: Nuxt 4, Vue 3, Tailwind CSS, shadcn-vue
- **Backend**: Nuxt Server API (Nitro), Prisma ORM
- **Database**: PostgreSQL 16 (Docker / Neon)
- **Telegram**: Grammy (бот) + GramJS (userbot, MTProto)
- **AI**: OpenAI Whisper (транскрипция) + GPT-4o-mini (отчёты)
- **Платежи**: Тинькофф Касса
- **Auth**: Session-based (httpOnly cookies)
- **Deploy**: Docker Compose + nginx + SSL (VPS Timeweb Cloud)

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка базы данных

**Вариант A: Docker (рекомендуется)**

```bash
docker compose up -d db
```

PostgreSQL будет доступен на `localhost:5432`.

**Вариант B: Neon (облако)**

1. Перейдите на [neon.tech](https://neon.tech) и создайте проект
2. Скопируйте Connection String

### 3. Настройка окружения

```bash
cp .env.example .env
```

Заполните `.env` — см. [документацию по переменным окружения](docs/архитектура.md#переменные-окружения).

### 4. Запуск миграций

```bash
npx prisma generate
npx prisma db push
```

### 5. Запуск dev сервера

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

### 6. Docker (полный стек)

```bash
# Разработка (app + PostgreSQL)
docker compose up

# Production (app + PostgreSQL + nginx + SSL)
docker compose -f docker-compose.production.yml up -d --build
```

## Структура проекта

```
resto-worker/
  app/                        # Фронтенд (Nuxt pages + components)
    components/               # Vue компоненты
    pages/                    # Страницы приложения
    layouts/                  # Layouts
    composables/              # Composables

  server/                     # Бэкенд (Nitro)
    api/                      # API endpoints
    constants/                # Константы (сообщения бота и др.)
    utils/                    # Server utilities (auth, prisma, openai, userbot)

  prisma/
    schema/                   # Multi-file Prisma schema (13 файлов)

  docs/                       # Документация
```

## Доступные команды

```bash
# Development
npm run dev          # Запуск dev сервера
npm run build        # Build для production
npm run preview      # Preview production build

# Database
npx prisma generate       # Сгенерировать Prisma Client
npx prisma db push        # Синхронизировать schema с БД
npx prisma studio         # Открыть Prisma Studio (UI для БД)
npx prisma migrate deploy # Применить миграции (production)

# Telegram Bot
npm run bot:set-webhook -- <URL>  # Установить webhook
```

## Роли пользователей (RBAC)

- **SUPER_ADMIN** — полный доступ ко всей системе
- **OWNER** — владелец организации, управление своими ресторанами
- **MANAGER** — менеджер конкретного ресторана

## Документация

| Документ | Описание |
|---|---|
| [Архитектура](docs/архитектура.md) | Стек, структура проекта, API паттерны |
| [Инфраструктура](docs/инфраструктура.md) | Хостинг, БД, AI, риски, стоимость |
| [Деплой на Timeweb](docs/деплой-timeweb.md) | Пошаговый гайд по деплою на Timeweb Cloud |
| [API справочник](docs/api-справочник.md) | Описание всех API эндпоинтов |
| [Telegram бот](docs/telegram-бот.md) | Логика бота, команды, онбординг |
| [Настройка Telegram бота](docs/настройка-telegram-бота.md) | Создание бота, webhook, userbot |
| [Настройка Neon](docs/настройка-neon.md) | Подключение к Neon PostgreSQL |
| [Команды](docs/команды.md) | Полный список команд разработки |
| [План разработки](.claude/plan.md) | Roadmap и текущий статус |

## Git-ветки

```
main   — production (VPS: lk.cosmicmind.ru)
dev    — разработка и тест (Vercel preview)
```

### Рабочий процесс

```bash
# 1. Работаешь в dev
git checkout dev
# ... пишешь код ...
git add <файлы>
git commit -m "описание"
git push

# 2. Тестируешь на Vercel (автодеплой из dev)

# 3. Всё ок — деплоишь на VPS:
./deploy.sh
```

## Деплой на VPS

**Сервер:** Timeweb Cloud (Ubuntu), `root@72.56.112.207`
**Сайт:** https://lk.cosmicmind.ru
**Проект на сервере:** `/opt/cosmicmind`

### Одной командой

```bash
./deploy.sh
```

Скрипт сам: мержит `dev -> main` -> пушит -> SSH на сервер -> `git pull` -> `docker compose up --build`

### Вручную

```bash
# Мерж в main
git checkout main
git merge dev
git push origin main
git checkout dev

# На сервере
ssh root@72.56.112.207 "cd /opt/cosmicmind && git pull origin main && docker compose -f docker-compose.production.yml up -d --build"
```

### Полезные команды (сервер)

```bash
# Логи приложения
ssh root@72.56.112.207 "cd /opt/cosmicmind && docker compose -f docker-compose.production.yml logs app --tail 50"

# Логи в реальном времени
ssh root@72.56.112.207 "cd /opt/cosmicmind && docker compose -f docker-compose.production.yml logs app -f"

# Статус контейнеров
ssh root@72.56.112.207 "cd /opt/cosmicmind && docker compose -f docker-compose.production.yml ps"

# Перезапуск без пересборки
ssh root@72.56.112.207 "cd /opt/cosmicmind && docker compose -f docker-compose.production.yml restart app"

# Полная пересборка (нужна после изменения .env)
ssh root@72.56.112.207 "cd /opt/cosmicmind && docker compose -f docker-compose.production.yml up -d --build --force-recreate"

# Редактировать .env на сервере
ssh root@72.56.112.207 "nano /opt/cosmicmind/.env"
```

> **Важно:** После изменения `.env` на сервере нужна пересборка (`--build`), т.к. Nuxt вшивает `runtimeConfig.public` при билде.

### Telegram webhook

```bash
# Установить
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://lk.cosmicmind.ru/api/bot/webhook"

# Проверить
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Юзербот (создание групп)

Юзербот — Telegram-аккаунт, через который бот автоматически создаёт группы для ресторанов.

### Перерегистрация на новый номер

```bash
npx tsx scripts/init-userbot.ts
```

Скрипт спросит API ID, API Hash (берутся с https://my.telegram.org/apps), номер телефона и код из Telegram. На выходе даст переменные для `.env`:

```
USERBOT_API_ID="..."
USERBOT_API_HASH="..."
USERBOT_SESSION_ENCRYPTED='...'
USERBOT_ENCRYPTION_KEY="..."
USERBOT_ENABLED="true"
```
