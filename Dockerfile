# ============================================
# RestoWorker — Multi-stage Docker build
# ============================================

# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

# bcrypt требует native build tools
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# --ignore-scripts чтобы не запускать postinstall (nuxt prepare)
# npm ci с lock-файлом от macOS не ставит linux-musl optional deps
RUN npm ci --ignore-scripts

# Явно ставим native bindings для Alpine Linux (musl)
# Определяем архитектуру автоматически (x64 или arm64)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
      npm install --no-save \
        @oxc-parser/binding-linux-arm64-musl@0.112.0 \
        @oxc-transform/binding-linux-arm64-musl@0.112.0 \
        @oxc-minify/binding-linux-arm64-musl@0.112.0 \
        @rollup/rollup-linux-arm64-musl@4.57.1 \
        @esbuild/linux-arm64@0.27.3; \
    else \
      npm install --no-save \
        @oxc-parser/binding-linux-x64-musl@0.112.0 \
        @oxc-transform/binding-linux-x64-musl@0.112.0 \
        @oxc-minify/binding-linux-x64-musl@0.112.0 \
        @rollup/rollup-linux-x64-musl@4.57.1 \
        @esbuild/linux-x64@0.27.3; \
    fi

# Пересобираем нативные модули (bcrypt и др.) под Alpine
RUN npm rebuild --ignore-scripts

# --- Builder ---
FROM base AS builder
WORKDIR /app

# native build tools нужны для bcrypt rebuild
RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Запускаем то, что обычно делает postinstall
RUN npx nuxt prepare
RUN npx prisma generate
RUN npm run build

# --- Runner (минимальный продакшен-образ) ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Prisma Client + CLI для миграций
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Entrypoint: миграции + запуск сервера
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
