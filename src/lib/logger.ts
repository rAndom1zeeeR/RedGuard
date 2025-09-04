import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Конфигурация логгера
const logConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'vpn-proxy-server',
    serverId: process.env.SERVER_ID || 'unknown'
  },
  transports: [
    // Консольный вывод
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Основной лог файл
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // Лог ошибок
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    }),
    
    // Лог доступа
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      level: 'info'
    })
  ]
};

// Создание логгера
const logger = winston.createLogger(logConfig);

// Создание директории для логов если не существует
import fs from 'fs';
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Хелперы для логирования
export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
  logger.error(message, { error: error?.message || error, stack: error?.stack, ...meta });
};

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};

export const logAccess = (req: { method: string; url: string; ip?: string; connection?: { remoteAddress?: string }; get: (header: string) => string | undefined }, res: { statusCode: number }, responseTime: number) => {
  logger.info('HTTP Access', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    serverId: process.env.SERVER_ID
  });
};

export const logVPNConnection = (userId: string, serverId: string, action: 'connect' | 'disconnect') => {
  logger.info('VPN Connection', {
    userId,
    serverId,
    action,
    timestamp: new Date().toISOString()
  });
};

export const logProxyRequest = (user: string, ip: string, target: string, success: boolean) => {
  logger.info('Proxy Request', {
    user,
    ip,
    target,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logServerHealth = (serverId: string, status: string, responseTime: number, error?: string) => {
  logger.info('Server Health Check', {
    serverId,
    status,
    responseTime,
    error,
    timestamp: new Date().toISOString()
  });
};

export const logScaling = (action: 'scale-up' | 'scale-down', serverId: string, reason: string) => {
  logger.info('Auto Scaling', {
    action,
    serverId,
    reason,
    timestamp: new Date().toISOString()
  });
};

export default logger;
