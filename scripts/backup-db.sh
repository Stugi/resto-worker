#!/bin/bash
# ============================================
# CosmicMind AI — Бэкап PostgreSQL
# Запуск вручную: ./scripts/backup-db.sh
# Cron (каждый день в 3:00): 0 3 * * * cd /opt/cosmicmind && ./scripts/backup-db.sh >> backups/cron.log 2>&1
# ============================================

set -e

COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="./backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/resto_worker_$TIMESTAMP.sql.gz"

# Создать директорию для бэкапов
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начинаю бэкап..."

# pg_dump через Docker → сжатие gzip
docker compose -f $COMPOSE_FILE exec -T db \
    pg_dump -U resto -d resto_worker --clean --if-exists \
    | gzip > "$BACKUP_FILE"

# Проверить что файл создался
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✅ Бэкап создан: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] ❌ Ошибка: бэкап не создан!"
    exit 1
fi

# Удалить старые бэкапы (старше RETENTION_DAYS дней)
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] 🗑️  Удалено старых бэкапов: $DELETED"
fi

TOTAL=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "[$(date)] 📦 Всего бэкапов: $TOTAL"
