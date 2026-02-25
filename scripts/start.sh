#!/bin/bash
# ============================================
# CosmicMind AI — Запуск после заполнения .env
# Используется если deploy.sh остановился на шаге .env
# ============================================

set -e

APP_DIR="/opt/cosmicmind"
COMPOSE_FILE="docker-compose.production.yml"

cd "$APP_DIR"

# Проверить что .env заполнен
if ! grep -q "TELEGRAM_BOT_TOKEN=." .env 2>/dev/null; then
    echo "❌ Ошибка: TELEGRAM_BOT_TOKEN не заполнен в .env!"
    echo "   Открой: nano $APP_DIR/.env"
    exit 1
fi

if ! grep -q "POSTGRES_PASSWORD=." .env 2>/dev/null; then
    echo "❌ Ошибка: POSTGRES_PASSWORD не заполнен в .env!"
    echo "   Открой: nano $APP_DIR/.env"
    exit 1
fi

echo "✅ .env проверен"

# Получить SSL
echo "🔒 Получаю SSL-сертификат..."
chmod +x scripts/init-ssl.sh scripts/backup-db.sh
./scripts/init-ssl.sh

# Запуск
echo "🚀 Запускаю приложение..."
docker compose -f $COMPOSE_FILE up -d --build

# Настройка crontab
if ! crontab -l 2>/dev/null | grep -q "cosmicmind"; then
    (crontab -l 2>/dev/null; echo "") | crontab -
    (crontab -l 2>/dev/null; echo "# === CosmicMind AI ===") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * * cd $APP_DIR && ./scripts/backup-db.sh >> backups/cron.log 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "0 */12 * * * docker compose -f $APP_DIR/$COMPOSE_FILE exec -T nginx nginx -s reload 2>/dev/null") | crontab -
    (crontab -l 2>/dev/null; echo "*/15 * * * * curl -sS https://lk.cosmicmind.ru/api/cron/reports?secret=\$(grep CRON_SECRET $APP_DIR/.env | cut -d= -f2) > /dev/null 2>&1") | crontab -
    echo "✅ Crontab настроен"
fi

echo ""
echo "✅ CosmicMind AI запущен!"
echo "🌐 https://lk.cosmicmind.ru"
echo ""
echo "⚡ Установи webhook:"
echo "   curl \"https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https://lk.cosmicmind.ru/api/bot/webhook\""
echo ""
