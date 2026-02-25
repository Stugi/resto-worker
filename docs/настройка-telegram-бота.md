# Настройка Telegram Bot для RESTO Worker

## Создание Telegram Bot

### Шаг 1: Откройте BotFather

1. Откройте Telegram
2. Найдите [@BotFather](https://t.me/botfather)
3. Нажмите "Start"

### Шаг 2: Создайте нового бота

Отправьте команду:
```
/newbot
```

BotFather попросит вас ввести:

1. **Имя бота** (как будет отображаться в чатах):
   ```
   RESTO Worker
   ```

2. **Username бота** (должен заканчиваться на `bot`):
   ```
   resto_worker_bot
   ```
   (или любое другое уникальное имя)

### Шаг 3: Сохраните токен

После создания BotFather отправит вам сообщение с токеном:
```
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
```

**ВАЖНО**: Сохраните этот токен! Он понадобится для настройки приложения.

### Шаг 4: Настройте домен для Login Widget

Для работы Telegram Login Widget нужно указать домен вашего приложения.

Отправьте команду:
```
/setdomain
```

Выберите вашего бота, затем укажите домен:
- Для dev: `localhost:3000` (или ваш dev URL)
- Для production: `your-app.com`

**Примечание**: В разработке можете пропустить этот шаг, но для production он обязателен.

### Шаг 5: Настройте описание (опционально)

```
/setdescription
```

Пример:
```
RESTO Worker - система управления ресторанами. Войдите для доступа к dashboard.
```

### Шаг 6: Настройте аватар (опционально)

```
/setuserpic
```

Загрузите изображение (логотип RESTO Worker).

---

## Настройка .env

Добавьте токен бота в файл `.env`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890"
```

Замените `1234567890:ABC...` на ваш реальный токен.

---

## Обновление страницы login

Откройте файл `app/pages/auth/login.vue` и замените:

```typescript
const TELEGRAM_BOT_USERNAME = 'YOUR_BOT_USERNAME'
```

на:

```typescript
const TELEGRAM_BOT_USERNAME = 'resto_worker_bot' // или ваш username
```

---

## Тестирование

### 1. Запустите dev сервер

```bash
yarn dev
```

### 2. Откройте страницу входа

Перейдите на: `http://localhost:3000/auth/login`

### 3. Нажмите кнопку "Log in with Telegram"

Должно открыться окно Telegram с запросом авторизации.

### 4. Разрешите доступ

После авторизации вы будете перенаправлены на главную страницу (`/`).

---

## Troubleshooting

### Ошибка "Telegram bot не настроен"

- Убедитесь, что `TELEGRAM_BOT_TOKEN` добавлен в `.env`
- Перезапустите dev сервер (`yarn dev`)

### Кнопка "Log in with Telegram" не появляется

- Проверьте, что `TELEGRAM_BOT_USERNAME` правильно указан в `login.vue`
- Откройте консоль браузера и проверьте ошибки JavaScript

### Ошибка "Неверные данные авторизации"

- Проверьте, что токен бота правильный
- Убедитесь, что домен настроен в BotFather (для production)

### Ошибка "Данные авторизации устарели"

Данные авторизации действительны 24 часа. Попробуйте войти снова.

---

## Важные команды BotFather

| Команда | Описание |
|---------|----------|
| `/newbot` | Создать нового бота |
| `/mybots` | Список ваших ботов |
| `/setdomain` | Установить домен для Login Widget |
| `/setdescription` | Установить описание |
| `/setuserpic` | Установить аватар |
| `/deletebot` | Удалить бота |
| `/token` | Получить новый токен (старый станет недействительным!) |

---

## Security Best Practices

1. **Никогда не коммитьте токен бота в Git**
   - Токен должен быть только в `.env` (который в `.gitignore`)

2. **Используйте разные боты для dev и production**
   - Dev: `resto_worker_dev_bot`
   - Production: `resto_worker_bot`

3. **Регулярно проверяйте активность бота**
   - В BotFather можно посмотреть статистику

4. **Если токен скомпрометирован**
   - Используйте `/token` для генерации нового
   - Обновите `.env` на всех серверах

---

## Дополнительная информация

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)
- [BotFather Commands](https://core.telegram.org/bots/features#botfather)

---

## Примечание для Production

Для production окружения:
1. Создайте отдельного бота
2. Настройте домен в BotFather
3. Добавьте токен в переменные окружения на сервере
4. Убедитесь, что HTTPS настроен (Telegram требует HTTPS для Login Widget)
