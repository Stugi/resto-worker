#!/bin/bash
# ===========================================
# CosmicMind AI — Деплой на VPS
# ===========================================
# Использование:
#   ./deploy.sh          — деплой из main
#   ./deploy.sh rebuild  — полная пересборка
# ===========================================

SERVER="root@72.56.112.207"
PROJECT="/opt/cosmicmind"

echo "=== CosmicMind AI Deploy ==="

# 1. Мержим dev → main (если мы в dev)
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "dev" ]; then
  echo "Мержим dev → main..."
  git checkout main && git merge dev && git push origin main
  git checkout dev
elif [ "$BRANCH" = "main" ]; then
  echo "Пушим main..."
  git push origin main
else
  echo "Ты в ветке $BRANCH. Переключись на dev или main"
  exit 1
fi

# 2. Деплой на сервер
echo ""
echo "Деплоим на VPS..."
ssh $SERVER "cd $PROJECT && git pull origin main && docker compose -f docker-compose.production.yml up -d --build"

echo ""
echo "=== Готово! ==="
echo "Сайт: https://lk.cosmicmind.ru"
