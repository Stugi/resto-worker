#!/bin/sh
set -e

echo "🔄 Applying database migrations..."
npx prisma migrate deploy

echo "🚀 Starting RestoWorker server..."
exec node .output/server/index.mjs
