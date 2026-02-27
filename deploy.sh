#!/bin/bash
# ===========================================
# CosmicMind AI — Деплой на VPS
# ===========================================
# Использование:
#   ./deploy.sh          — деплой из master
#   ./deploy.sh rebuild  — полная пересборка
# ===========================================

SERVER="root@72.56.112.207"
PROJECT="/opt/cosmicmind"

echo "=== CosmicMind AI Deploy ==="

# 1. Мержим dev → master (если мы в dev)
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "dev" ]; then
  echo "Мержим dev → master..."
  git checkout master && git merge dev && git push origin master
  git checkout dev
elif [ "$BRANCH" = "master" ]; then
  echo "Пушим master..."
  git push origin master
else
  echo "Ты в ветке $BRANCH. Переключись на dev или master"
  exit 1
fi

# 2. Деплой на сервер
echo ""
echo "Деплоим на VPS..."
ssh $SERVER "cd $PROJECT && git pull origin master && docker compose -f docker-compose.production.yml up -d --build"

echo ""
echo "=== Готово! ==="
echo "Сайт: https://lk.cosmicmind.ru"
