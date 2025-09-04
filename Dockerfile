# Multi-stage build для оптимизации размера
FROM node:22-alpine AS base

# Установка необходимых пакетов
RUN apk add --no-cache \
    curl \
    wget \
    unzip \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Создание non-root пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Установка зависимостей
FROM base AS deps
WORKDIR /app

# Копирование package файлов
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Сборка приложения
FROM base AS builder
WORKDIR /app

# Копирование исходного кода
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Установка dev зависимостей для сборки
RUN npm ci

# Сборка Next.js приложения
RUN npm run build

# Продакшен образ
FROM base AS runner
WORKDIR /app

# Создание директорий для логов и данных
RUN mkdir -p /app/logs /app/data /app/config

# Копирование собранного приложения
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копирование конфигурационных файлов
COPY --chown=nextjs:nodejs config/ ./config/
COPY --chown=nextjs:nodejs scripts/ ./scripts/

# Установка прав доступа
RUN chown -R nextjs:nodejs /app
RUN chmod +x /app/scripts/*.sh

# Переключение на non-root пользователя
USER nextjs

# Открытие портов
EXPOSE 3000 8080 1080 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Entrypoint
CMD ["node", "server.js"]
