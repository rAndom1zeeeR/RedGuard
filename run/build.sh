#!/bin/bash

# Скрипт для локальной сборки и запуска RedGuard Server

set -e

echo "🚀 Сборка RedGuard Server..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Создаю из env.example..."
    cp env.example .env
    echo "📝 Пожалуйста, отредактируйте .env файл с вашими настройками"
fi

# Сборка Docker образа
echo "🔨 Сборка Docker образа..."
docker build -t redguard-server:latest .

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down || true

# Запуск сервисов
echo "▶️  Запуск сервисов..."
docker-compose up -d

# Ожидание готовности
echo "⏳ Ожидание готовности сервисов..."
sleep 10

# Проверка статуса
echo "📊 Статус сервисов:"
docker-compose ps

# Проверка health check
echo "🏥 Проверка health check..."
sleep 5
curl -f http://localhost:3000/api/health || echo "❌ Health check не прошел"

echo "✅ Готово! Сервис доступен на http://localhost:3000"
