#!/bin/bash

echo "Генерация ключей для VPN проекта..."

# Генерация JWT секрета
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"

# Генерация VPN секрета
VPN_SECRET=$(openssl rand -base64 32)
echo "VPN_SECRET=$VPN_SECRET"

# Генерация пароля для Redis
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "REDIS_PASSWORD=$REDIS_PASSWORD"

# Генерация пароля для прокси
PROXY_PASS=$(openssl rand -base64 16)
echo "PROXY_PASS=$PROXY_PASS"

# Генерация UUID для VMess
VMESS_UUID=$(uuidgen)
echo "VMESS_UUID=$VMESS_UUID"

echo ""
echo "Все ключи сгенерированы!"
echo "Скопируйте эти значения в ваш .env файл"
