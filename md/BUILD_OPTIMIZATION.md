# Оптимизация сборки RedGuard

## Проблема
Ошибка "JavaScript heap out of memory" при сборке Next.js.

## Решения

### 1. Увеличение лимита памяти Node.js
В `package.json` добавлены флаги:
- `dev`: `NODE_OPTIONS='--max-old-space-size=4096'`
- `build`: `NODE_OPTIONS='--max-old-space-size=8192'`

### 2. Оптимизация Next.js конфигурации
В `next.config.js` добавлены:
- `swcMinify: true` - использование SWC для минификации
- `optimizePackageImports` - оптимизация импортов больших пакетов
- `memoryBasedWorkersCount: true` - автоматическое управление воркерами
- Webpack оптимизации для разделения чанков

### 3. Переменные окружения
Создайте файл `.env.local`:
```bash
NODE_OPTIONS=--max-old-space-size=8192
NEXT_TELEMETRY_DISABLED=1
NEXT_PRIVATE_STANDALONE=true
TSC_COMPILE_ON_ERROR=true
```

### 4. Команды для сборки
```bash
# Обычная сборка
npm run build

# Сборка с дополнительными флагами памяти
NODE_OPTIONS="--max-old-space-size=8192 --max-semi-space-size=128" npm run build

# Сборка без кеша (если проблемы с кешем)
rm -rf .next && npm run build
```

### 5. Docker оптимизация
Если используете Docker, добавьте в Dockerfile:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=8192"
```

### 6. Мониторинг памяти
Для мониторинга использования памяти:
```bash
# Установка
npm install -g clinic

# Анализ
clinic doctor -- node build.js
```
