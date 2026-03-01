#!/bin/bash
# ============================================
# CosmicMind AI — Обновление на VPS
# Запуск: ./scripts/update.sh
# ============================================

set -e

APP_DIR="/opt/cosmicmind"
COMPOSE_FILE="docker-compose.production.yml"

cd "$APP_DIR"

echo ""
echo "🔄 CosmicMind AI — Обновление"
echo "======================================"
echo ""

# ─── 1. Подтянуть код ───
echo "📥 [1/3] Подтягиваю последний код..."
git pull origin master
echo "  ✅ Код обновлён"

# ─── 2. Пересобрать и запустить ───
echo "🔨 [2/3] Пересобираю и перезапускаю..."
docker compose -f $COMPOSE_FILE up -d --build
echo "  ✅ Контейнеры запущены"

# ─── 3. Проверка ───
echo "⏳ [3/3] Жду запуска приложения..."
sleep 15

APP_STATUS=$(docker compose -f $COMPOSE_FILE ps app --format json 2>/dev/null | head -1)

if docker compose -f $COMPOSE_FILE ps app 2>/dev/null | grep -q "Up"; then
    echo ""
    echo "======================================"
    echo "✅ Обновление завершено!"
    echo "======================================"
    echo "🌐 https://lk.cosmicmind.ru"
    echo ""
else
    echo ""
    echo "======================================"
    echo "❌ App контейнер не запустился!"
    echo "======================================"
    echo ""
    echo "📋 Последние логи:"
    docker compose -f $COMPOSE_FILE logs --tail=30 app
    echo ""
    echo "💡 Попробуй:"
    echo "   docker compose -f $COMPOSE_FILE logs -f app"
    echo ""
fi
