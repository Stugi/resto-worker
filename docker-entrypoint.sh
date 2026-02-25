#!/bin/sh
set -e

echo "🔄 Applying database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "🚀 Starting CosmicMind AI server..."
exec node .output/server/index.mjs
