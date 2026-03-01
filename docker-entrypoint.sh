#!/bin/sh
set -e

MAX_RETRIES=10
RETRY=0

echo "🔄 Waiting for database and applying migrations..."

until node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "❌ Database not available after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "⏳ Attempt $RETRY/$MAX_RETRIES — retrying in 5s..."
  sleep 5
done

echo "✅ Migrations applied!"
echo "🚀 Starting CosmicMind AI server..."
exec node .output/server/index.mjs
