# Деплой RestoWorker на Timeweb Cloud

## Стратегия: App Platform + Управляемая БД

- **App Platform** — автодеплой из GitHub через Docker Compose, не нужен SSH/nginx
- **Управляемая БД** — данные не теряются при редеплое, бэкапы автоматически

## Шаг 1: Создать управляемую PostgreSQL БД

Timeweb Cloud → **Базы данных** → Создать:
- Тип: PostgreSQL
- Тариф: минимальный (~200₽/мес)
- Запомнить: хост, порт, имя БД, логин, пароль

## Шаг 2: Обновить docker-compose.yml

Убрать сервис `db` — БД будет внешняя (управляемая Timeweb). Оставить только `app`.

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - APP_URL=${APP_URL}
      - CRON_SECRET=${CRON_SECRET}
      - TINKOFF_TERMINAL_KEY=${TINKOFF_TERMINAL_KEY}
      - TINKOFF_PASSWORD=${TINKOFF_PASSWORD}
      - TINKOFF_API_URL=${TINKOFF_API_URL}
      - USERBOT_API_ID=${USERBOT_API_ID}
      - USERBOT_API_HASH=${USERBOT_API_HASH}
      - USERBOT_SESSION_ENCRYPTED=${USERBOT_SESSION_ENCRYPTED}
      - USERBOT_ENCRYPTION_KEY=${USERBOT_ENCRYPTION_KEY}
      - USERBOT_ENABLED=${USERBOT_ENABLED}
    restart: unless-stopped
```

`DATABASE_URL` формат для управляемой БД:
```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
```

## Шаг 3: Деплой через App Platform

1. Timeweb Cloud → **App Platform** → Добавить App
2. Тип: Docker → **Docker Compose**
3. Репозиторий: подключить GitHub → выбрать `resto-worker`
4. Ветка: `main`
5. Переменные окружения: задать все из `.env.example`
6. `DATABASE_URL` — строка подключения к управляемой БД из шага 1

## Шаг 4: После деплоя

1. Настроить домен → обновить `APP_URL`
2. Установить Telegram webhook:
   ```bash
   npm run bot:set-webhook
   ```
   Или вручную: `https://ДОМЕН/api/bot/webhook`
3. Применить seed (если нужно): через консоль Timeweb

## Переменные окружения (полный список)

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `SESSION_SECRET` | Секрет сессии (64+ символов) |
| `NODE_ENV` | `production` |
| `APP_URL` | URL приложения (https://...) |
| `TELEGRAM_BOT_TOKEN` | Токен бота из BotFather |
| `TELEGRAM_BOT_USERNAME` | Username бота |
| `OPENAI_API_KEY` | Ключ OpenAI |
| `CRON_SECRET` | Секрет для cron-эндпоинтов |
| `TINKOFF_TERMINAL_KEY` | Ключ терминала Tinkoff |
| `TINKOFF_PASSWORD` | Пароль терминала |
| `TINKOFF_API_URL` | `https://securepay.tinkoff.ru/v2` |
| `USERBOT_API_ID` | Telegram API ID |
| `USERBOT_API_HASH` | Telegram API Hash |
| `USERBOT_SESSION_ENCRYPTED` | Зашифрованная сессия |
| `USERBOT_ENCRYPTION_KEY` | Ключ шифрования (256-bit hex) |
| `USERBOT_ENABLED` | `false` или `true` |

## Файлы для деплоя (уже созданы)

- `Dockerfile` — multi-stage сборка (node:20-alpine)
- `docker-compose.yml` — нужно обновить (убрать `db` сервис)
- `docker-entrypoint.sh` — миграции + запуск сервера
- `.dockerignore` — исключения для Docker
