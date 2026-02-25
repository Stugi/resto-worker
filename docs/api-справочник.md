# API Reference

Все API-эндпоинты размещены в `server/api/`.
Nuxt/Nitro автоматически маршрутизирует по файловой структуре.

## Аутентификация

### POST /api/auth/login
Вход в систему.

**Body:**
```json
{ "email": "admin@example.com", "password": "123456" }
```

### POST /api/auth/register
Регистрация пользователя.

### GET /api/auth/me
Текущий пользователь. Возвращает 401 если не авторизован.

### POST /api/auth/logout
Выход (очистка сессии).

---

## Организации

### GET /api/organizations
Список организаций.
**Доступ:** SUPER_ADMIN

### POST /api/organizations
Создать организацию.
**Доступ:** SUPER_ADMIN
**Body:** `{ "name": "ООО Ресторан" }`

### PATCH /api/organizations/:id
Обновить организацию.
**Доступ:** SUPER_ADMIN
**Body:** `{ "name": "Новое название", "billingStatus": "ACTIVE" }`

### DELETE /api/organizations/:id
Удалить организацию (soft delete).
**Доступ:** SUPER_ADMIN

---

## Рестораны

### GET /api/restaurants
Список ресторанов.
**Доступ:** SUPER_ADMIN (все), OWNER (свои)

### POST /api/restaurants
Создать ресторан.
**Доступ:** SUPER_ADMIN, OWNER
**Body:** `{ "name": "Ресторан Центр", "organizationId": "..." }`

### PATCH /api/restaurants/:id
Обновить ресторан.
**Body:** `{ "name": "Новое название" }`

### DELETE /api/restaurants/:id
Удалить ресторан (soft delete).

---

## Пользователи

### GET /api/users
Список пользователей.
**Доступ:** SUPER_ADMIN (все), OWNER (свои)

### POST /api/users
Создать пользователя.
**Body:** `{ "name": "Иван", "email": "...", "password": "...", "role": "MANAGER", "organizationId": "...", "restaurantId": "..." }`

### PATCH /api/users/:id
Обновить пользователя.

### DELETE /api/users/:id
Удалить пользователя (soft delete).

---

## Промпты GPT

### GET /api/prompts
Список промптов.
**Доступ:** SUPER_ADMIN (все), OWNER (свои + дефолтные)

### POST /api/prompts
Создать промпт.
**Body:** `{ "name": "Еженедельный отчёт", "template": "Ты — аналитик...", "isDefault": false, "restaurantId": "..." }`

### GET /api/prompts/:id
Получить промпт.

### PATCH /api/prompts/:id
Обновить промпт.

### DELETE /api/prompts/:id
Удалить промпт (soft delete).

---

## Тарифы

### GET /api/tariffs
Список тарифов.
**Доступ:** Публичный (только активные), SUPER_ADMIN (все)

### POST /api/tariffs
Создать тариф.
**Доступ:** SUPER_ADMIN
**Body:**
```json
{
  "name": "Базовый",
  "description": "Для одного ресторана",
  "price": 950,
  "period": 30,
  "maxRestaurants": 1,
  "maxUsers": 5,
  "maxTranscriptions": 100,
  "sortOrder": 1
}
```

### PATCH /api/tariffs/:id
Обновить тариф.
**Доступ:** SUPER_ADMIN

### DELETE /api/tariffs/:id
Удалить тариф (soft delete).
**Доступ:** SUPER_ADMIN
**Ограничение:** Нельзя удалить тариф с активными подписками.

---

## Платежи

### GET /api/payments
История платежей.
**Доступ:** SUPER_ADMIN (все), OWNER (свои)
**Query:** `?organizationId=xxx` — фильтр по организации

### POST /api/payments/create
Создать платёж и получить ссылку на оплату.
**Доступ:** SUPER_ADMIN, OWNER (своя организация)
**Body:**
```json
{ "tariffId": "...", "organizationId": "..." }
```
**Ответ:**
```json
{
  "paymentId": "...",
  "formUrl": "https://web.rbsuat.com/payment/merchants/...",
  "amount": 950,
  "tariffName": "Базовый"
}
```

### POST /api/payments/check
Проверить статус платежа.
**Body:** `{ "paymentId": "..." }`
**Ответ:**
```json
{
  "paymentId": "...",
  "status": "COMPLETED",
  "amount": 950,
  "tariffName": "Базовый",
  "activeUntil": "2026-03-21T00:00:00.000Z"
}
```

---

## Транскрипции

### GET /api/transcripts
Список транскрипций голосовых отчётов.
**Доступ:** SUPER_ADMIN (все), OWNER (свои рестораны), MANAGER (свой ресторан)
**Query:**
- `restaurantId` — фильтр по ресторану
- `from` — дата начала (ISO)
- `to` — дата конца (ISO)
- `limit` — лимит (по умолчанию 50, макс 200)

---

## Отчёты (GPT)

### GET /api/reports
Список отчётов.
**Доступ:** SUPER_ADMIN, OWNER, MANAGER
**Query:** `?restaurantId=xxx&limit=20`

### GET /api/reports/:id
Полный отчёт с содержимым и списком транскрипций.

### POST /api/reports/generate
Сгенерировать отчёт по транскрипциям за период.
**Доступ:** SUPER_ADMIN, OWNER
**Body:**
```json
{
  "restaurantId": "...",
  "periodStart": "2026-02-10T00:00:00.000Z",
  "periodEnd": "2026-02-16T23:59:59.000Z",
  "promptId": "..."
}
```
Если `promptId` не указан — используется дефолтный промпт.

---

## Telegram Bot Webhook

### POST /api/bot/webhook
Обработчик webhook от Telegram.
**Внимание:** Этот эндпоинт вызывается Telegram, не фронтендом.

**Обрабатывает:**
- `/start` — онбординг нового пользователя
- Голосовые сообщения в группах — транскрипция через Whisper

---

## Общие паттерны

### Ошибки
```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "Описание ошибки на русском"
}
```

### Soft Delete
Все DELETE-запросы выполняют soft delete (ставят `deletedAt`, а не удаляют запись).

### Роли
- `SUPER_ADMIN` — доступ ко всему
- `OWNER` — доступ к своей организации
- `MANAGER` — ограниченный доступ (голосовые отчёты)
