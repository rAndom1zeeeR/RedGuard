import { createClient, RedisClientType } from 'redis';
import { logError, logInfo } from './logger';
import { ServerConfig, VPNUser, ProxyConfig, ServerMetrics } from '@/types';

// Типы для Redis данных
interface ServerData {
  name: string;
  region: string;
  weight: number;
  ip: string;
  ports: string; // JSON строка
  createdAt: string;
  lastSeen: string;
  status: string;
}

interface VPNUserData {
  id: string;
  username: string;
  email: string;
  password: string;
  isActive: string; // Redis хранит как строку
  bandwidthLimit: string;
  bandwidthUsed: string;
  createdAt: string;
  lastLogin: string;
  servers: string; // JSON строка
}

interface ProxyConfigData {
  user: string;
  pass: string;
  isActive: string;
  allowedIPs: string; // JSON строка
  rateLimit: string;
  createdAt: string;
}

interface ServerMetricsData {
  serverId: string;
  timestamp: string;
  cpuUsage: string;
  memoryUsage: string;
  networkIn: string;
  networkOut: string;
  activeConnections: string;
  uptime: string;
}

class RedisManager {
  private client: RedisClientType;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const password = process.env.REDIS_PASSWORD;
    
    // Парсим URL для правильной конфигурации
    const url = new URL(redisUrl);
    
    logInfo(`Connecting to Redis at ${url.hostname}:${url.port || 6379}`);
    
    const clientConfig: {
      socket: {
        host: string;
        port: number;
        reconnectStrategy: (retries: number) => number | Error;
      };
      password?: string;
    } = {
      socket: {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        reconnectStrategy: (retries: number) => {
          if (retries > this.maxReconnectAttempts) {
            logError('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 1000, this.reconnectDelay);
        }
      }
    };

    if (password) {
      clientConfig.password = password;
      logInfo('Redis password configured');
    } else {
      logInfo('Redis connection without password');
    }

    this.client = createClient(clientConfig);

    this.setupEventHandlers();
    this.connect();
  }


  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logInfo('Redis client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logInfo('Redis client ready');
    });

    this.client.on('error', (err) => {
      logError('Redis client error', err);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logInfo('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logInfo(`Redis reconnecting... Attempt ${this.reconnectAttempts}`);
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (error) {
      logError('Failed to connect to Redis', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      logError('Failed to disconnect from Redis', error);
    }
  }

  async ping(): Promise<string> {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      return await this.client.ping();
    } catch (error) {
      logError('Redis ping failed', error);
      throw error;
    }
  }

  // Серверное управление
  async registerServer(serverId: string, serverData: Omit<ServerData, 'lastSeen' | 'status'>): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      const key = `server:${serverId}`;
      await this.client.hSet(key, {
        ...serverData,
        lastSeen: new Date().toISOString(),
        status: 'online'
      });
      await this.client.expire(key, 300); // TTL 5 минут
      logInfo(`Server ${serverId} registered in Redis`);
    } catch (error) {
      logError(`Failed to register server ${serverId}`, error);
      throw error;
    }
  }

  async updateServerStatus(serverId: string, status: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      const key = `server:${serverId}`;
      await this.client.hSet(key, {
        status,
        lastSeen: new Date().toISOString()
      });
    } catch (error) {
      logError(`Failed to update server ${serverId} status`, error);
      throw error;
    }
  }

  async getServer(serverId: string): Promise<ServerData | null> {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      const key = `server:${serverId}`;
      const data = await this.client.hGetAll(key);
      return Object.keys(data).length > 0 ? (data as unknown as ServerData) : null;
    } catch (error) {
      logError(`Failed to get server ${serverId}`, error);
      throw error;
    }
  }

  async getAllServers(): Promise<Array<ServerData & { id: string }>> {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      const keys = await this.client.keys('server:*');
      const servers = [];
      
      for (const key of keys) {
        const data = await this.client.hGetAll(key);
        if (Object.keys(data).length > 0) {
          servers.push({
            id: key.replace('server:', ''),
            ...data
          });
        }
      }
      
      return (servers as unknown as Array<ServerData & { id: string }>);
    } catch (error) {
      logError('Failed to get all servers', error);
      throw error;
    }
  }

  async removeServer(serverId: string): Promise<void> {
    try {
      const key = `server:${serverId}`;
      await this.client.del(key);
      logInfo(`Server ${serverId} removed from Redis`);
    } catch (error) {
      logError(`Failed to remove server ${serverId}`, error);
      throw error;
    }
  }

  // VPN пользователи
  async createVPNUser(userData: Omit<VPNUserData, 'createdAt'>): Promise<void> {
    try {
      const key = `vpn_user:${userData.id}`;
      await this.client.hSet(key, {
        ...userData,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      logError(`Failed to create VPN user ${userData.id}`, error);
      throw error;
    }
  }

  async getVPNUser(userId: string): Promise<VPNUserData | null> {
    try {
      const key = `vpn_user:${userId}`;
      const data = await this.client.hGetAll(key);
      return Object.keys(data).length > 0 ? (data as unknown as VPNUserData) : null;
    } catch (error) {
      logError(`Failed to get VPN user ${userId}`, error);
      throw error;
    }
  }

  // Прокси конфигурация
  async setProxyConfig(config: Omit<ProxyConfigData, 'createdAt'>): Promise<void> {
    try {
      const key = 'proxy_config';
      await this.client.hSet(key, config);
    } catch (error) {
      logError('Failed to set proxy config', error);
      throw error;
    }
  }

  async getProxyConfig(): Promise<ProxyConfigData | null> {
    try {
      const key = 'proxy_config';
      const data = await this.client.hGetAll(key);
      return Object.keys(data).length > 0 ? (data as unknown as ProxyConfigData) : null;
    } catch (error) {
      logError('Failed to get proxy config', error);
      throw error;
    }
  }

  // Метрики серверов
  async saveServerMetrics(metrics: Omit<ServerMetricsData, 'timestamp'>): Promise<void> {
    try {
      const key = `metrics:${metrics.serverId}:${Date.now()}`;
      await this.client.hSet(key, {
        ...metrics,
        timestamp: new Date().toISOString()
      });
      await this.client.expire(key, 86400); // TTL 24 часа
    } catch (error) {
      logError(`Failed to save metrics for server ${metrics.serverId}`, error);
      throw error;
    }
  }

  async getServerMetrics(serverId: string, hours: number = 24): Promise<ServerMetricsData[]> {
    try {
      const cutoff = Date.now() - (hours * 60 * 60 * 1000);
      const pattern = `metrics:${serverId}:*`;
      const keys = await this.client.keys(pattern);
      const metrics = [];
      
      for (const key of keys) {
        const timestamp = parseInt(key.split(':')[2] || '0');
        if (timestamp >= cutoff) {
          const data = await this.client.hGetAll(key);
          if (Object.keys(data).length > 0) {
            metrics.push(data);
          }
        }
      }
      
      return (metrics.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()) as unknown as ServerMetricsData[]);
    } catch (error) {
      logError(`Failed to get metrics for server ${serverId}`, error);
      throw error;
    }
  }

  // Pub/Sub для межсерверного взаимодействия
  async publish<T = unknown>(channel: string, message: T): Promise<number> {
    try {
      return await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      logError(`Failed to publish to channel ${channel}`, error);
      throw error;
    }
  }

  async subscribe<T = unknown>(channel: string, callback: (message: T) => void): Promise<void> {
    try {
      await this.client.subscribe(channel, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message as unknown as T);
        }
      });
    } catch (error) {
      logError(`Failed to subscribe to channel ${channel}`, error);
      throw error;
    }
  }

  // Утилиты
  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      logInfo('Redis database flushed');
    } catch (error) {
      logError('Failed to flush Redis database', error);
      throw error;
    }
  }

  async getInfo(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      logError('Failed to get Redis info', error);
      throw error;
    }
  }

  get isReady(): boolean {
    return this.isConnected;
  }
}

// Синглтон экземпляр
const redisManager = new RedisManager();

export default redisManager;
export { RedisManager };
