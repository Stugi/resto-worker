# Деплой CosmicMind AI на VPS (Timeweb Cloud)

## Стратегия: VPS + Docker Compose (всё на одном сервере)

На одном сервере крутятся:
- **Приложение** (Nuxt 4 SSR) — порт 3000 (внутренний)
- **PostgreSQL** — база данных в Docker-контейнере
- **nginx** — reverse proxy + SSL (порты 80/443)
- **certbot** — автообновление SSL-сертификата Let's Encrypt

---

## Что нужно перед началом

- [x] VPS-сервер на Timeweb Cloud (Облачные серверы, Ubuntu 22.04+)
- [x] Домен (например, `lk.cosmicmind.ru`)
- [x] Токен Telegram бота от @BotFather
- [x] Ключ OpenAI API
- [x] Репозиторий проекта на GitHub

---

## Шаг 1: Подключиться к серверу по SSH

В Timeweb Cloud → **Облачные серверы** → нажать на сервер → **Консоль** (или через терминал):

```bash
ssh root@72.56.112.207
```

Пароль приходит на email при создании сервера. Или настрой SSH-ключи.

---

## Шаг 2: Настроить DNS

В панели управления доменом (reg.ru, timeweb, или другой регистратор):

1. Создать **A-запись**:
   - **Имя**: `lk` (или `@` для корневого домена)
   - **Значение**: `72.56.112.207` (IP твоего сервера)
2. Подождать 5-30 минут

Проверить можно так:
```bash
ping lk.cosmicmind.ru
```

---

## Шаг 3: Запустить скрипт установки

На сервере выполни:

```bash
# Скачать и запустить скрипт
apt update -y && apt install -y git

git clone https://github.com/ArinaStu/resto-worker.git /opt/cosmicmind

cd /opt/cosmicmind
chmod +x scripts/deploy.sh scripts/start.sh scripts/init-ssl.sh scripts/backup-db.sh
./scripts/deploy.sh
```

Скрипт автоматически:
1. ✅ Обновит систему
2. ✅ Установит Docker + Docker Compose
3. ✅ Настроит firewall (порты 22, 80, 443)
4. ✅ Создаст `.env` из шаблона
5. ⏸️ **Остановится** — нужно заполнить `.env`

---

## Шаг 4: Заполнить .env

Открой файл:
```bash
nano /opt/cosmicmind/.env
```

Заполни обязательные поля:

| Переменная | Что вписать | Пример |
|---|---|---|
| `POSTGRES_PASSWORD` | Придумай сложный пароль | `MyStr0ngP@ss2024!` |
| `SESSION_SECRET` | Длинная случайная строка | Сгенерируй: `openssl rand -base64 48` |
| `APP_URL` | Адрес сайта | `https://lk.cosmicmind.ru` |
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | `7123456789:AAHx...` |
| `TELEGRAM_BOT_USERNAME` | Имя бота (без @) | `cosmicmind_ai_bot` |
| `OPENAI_API_KEY` | Ключ OpenAI | `sk-proj-...` |
| `CRON_SECRET` | Любой секрет для cron | `my-cron-secret-123` |
| `TINKOFF_TERMINAL_KEY` | Ключ Тинькофф Кассы | `...` |
| `TINKOFF_PASSWORD` | Пароль Тинькофф | `...` |
| `TINKOFF_API_URL` | URL API | `https://securepay.tinkoff.ru/v2` |

Userbot (можно пока отключить):
| Переменная | Значение |
|---|---|
| `USERBOT_ENABLED` | `false` |
| `USERBOT_API_ID` | `0` |
| `USERBOT_API_HASH` | `placeholder` |

Сохрани: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## Шаг 5: Запустить приложение

```bash
cd /opt/cosmicmind
./scripts/start.sh
```

Скрипт:
1. ✅ Проверит `.env`
2. ✅ Получит SSL-сертификат Let's Encrypt
3. ✅ Соберёт и запустит Docker-контейнеры
4. ✅ Настроит автоматические задачи (бэкапы, отчёты)

⏳ Первая сборка занимает 3-5 минут.

---

## Шаг 6: Установить webhook Telegram бота

```bash
curl "https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/setWebhook?url=https://lk.cosmicmind.ru/api/bot/webhook"
```

Заменить `<ТВОЙ_ТОКЕН>` на реальный токен бота.

Проверить:
```bash
curl "https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/getWebhookInfo"
```

---

## Шаг 7: Проверить что всё работает

```bash
# Контейнеры запущены?
docker compose -f docker-compose.production.yml ps

# SSL работает?
curl -I https://lk.cosmicmind.ru

# Логи приложения
docker compose -f docker-compose.production.yml logs app --tail=20

# Логи базы данных
docker compose -f docker-compose.production.yml logs db --tail=10
```

Открой в браузере: **https://lk.cosmicmind.ru** — должна появиться страница входа.

---

## Обновление приложения

Когда в коде появились изменения:

```bash
cd /opt/cosmicmind
git pull
docker compose -f docker-compose.production.yml up -d --build
```

Миграции базы применяются автоматически при старте контейнера.

---

## Полезные команды

```bash
# Посмотреть статус контейнеров
docker compose -f docker-compose.production.yml ps

# Логи (все контейнеры)
docker compose -f docker-compose.production.yml logs -f

# Логи конкретного сервиса
docker compose -f docker-compose.production.yml logs app --tail=50
docker compose -f docker-compose.production.yml logs db --tail=50
docker compose -f docker-compose.production.yml logs nginx --tail=50

# Перезапустить всё
docker compose -f docker-compose.production.yml restart

# Пересобрать и перезапустить
docker compose -f docker-compose.production.yml up -d --build

# Остановить всё
docker compose -f docker-compose.production.yml down

# Зайти в базу данных
docker compose -f docker-compose.production.yml exec db psql -U resto -d resto_worker

# Ручной бэкап
./scripts/backup-db.sh

# Посмотреть бэкапы
ls -la backups/
```

---

## Структура файлов деплоя

| Файл | Описание |
|---|---|
| `Dockerfile` | Multi-stage сборка приложения (node:20-alpine) |
| `docker-compose.yml` | Разработка: app + PostgreSQL |
| `docker-compose.production.yml` | Production: app + db + nginx + certbot |
| `docker-entrypoint.sh` | Миграции + запуск сервера |
| `nginx/nginx.conf` | Конфиг nginx (gzip, лимиты) |
| `nginx/conf.d/app.conf` | Проксирование и SSL для домена |
| `scripts/deploy.sh` | Полная настройка сервера с нуля |
| `scripts/start.sh` | Запуск после заполнения .env |
| `scripts/init-ssl.sh` | Получение SSL-сертификата |
| `scripts/backup-db.sh` | Бэкап PostgreSQL |

---

## Стоимость

| Сервис | Описание | Стоимость |
|---|---|---|
| VPS (Timeweb) | 2 CPU, 4 GB RAM, 50 GB NVMe | ~800₽/мес |
| Домен (.ru) | cosmicmind.ru | ~500₽/год |
| OpenAI | Whisper + GPT-4o-mini | ~$1-5/мес |
| SSL | Let's Encrypt | Бесплатно |
| **Итого** | | **~800₽/мес + домен** |

---

## Troubleshooting

### Сайт не открывается
- Проверь DNS: `ping lk.cosmicmind.ru` — должен показать IP сервера
- Проверь контейнеры: `docker compose -f docker-compose.production.yml ps`
- Проверь логи nginx: `docker compose -f docker-compose.production.yml logs nginx`

### Ошибка SSL / сертификат не получен
- Убедись что DNS уже обновился: `dig lk.cosmicmind.ru`
- Перезапусти получение: `./scripts/init-ssl.sh`
- Проверь что порты 80 и 443 открыты: `ufw status`

### Бот не отвечает
- Проверь webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
- Проверь логи: `docker compose -f docker-compose.production.yml logs app | grep -i telegram`
- Проверь `TELEGRAM_BOT_TOKEN` в `.env`

### Ошибка подключения к БД
- Проверь что контейнер db запущен: `docker compose -f docker-compose.production.yml ps db`
- Проверь `POSTGRES_PASSWORD` в `.env` (без пробелов и спецсимволов `$`, `` ` ``)
- Проверь логи db: `docker compose -f docker-compose.production.yml logs db`

### Миграции не применились
- Логи app покажут ошибку: `docker compose -f docker-compose.production.yml logs app | head -20`
- Запусти вручную: `docker compose -f docker-compose.production.yml exec app npx prisma migrate deploy`

### Не хватает места на диске
- Проверь: `df -h`
- Очистить Docker кэш: `docker system prune -a`
- Проверь бэкапы: `du -sh backups/`
