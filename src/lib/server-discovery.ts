import redisManager from './redis';
import { logInfo, logError, logServerHealth } from './logger';
import { ServerStatus, HealthCheckResult } from '@/types';

class ServerDiscoveryService {
  private discoveryInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private discoveryIntervalMs: number;
  private healthCheckIntervalMs: number;
  private serverTimeoutMs: number;

  constructor() {
    this.discoveryIntervalMs = parseInt(
      process.env.DISCOVERY_INTERVAL || '30000'
    );
    this.healthCheckIntervalMs = parseInt(
      process.env.HEALTH_CHECK_INTERVAL || '30000'
    );
    this.serverTimeoutMs = parseInt(process.env.SERVER_TIMEOUT || '60000');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logInfo('Server discovery service is already running');
      return;
    }

    try {
      await redisManager.connect();
      this.isRunning = true;

      // Запуск периодического обнаружения серверов
      this.discoveryInterval = setInterval(() => {
        this.discoverServers().catch((error) => {
          logError('Server discovery failed', error);
        });
      }, this.discoveryIntervalMs);

      // Запуск периодических health checks
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks().catch((error) => {
          logError('Health checks failed', error);
        });
      }, this.healthCheckIntervalMs);

      logInfo('Server discovery service started', {
        discoveryInterval: this.discoveryIntervalMs,
        healthCheckInterval: this.healthCheckIntervalMs,
      });
    } catch (error) {
      logError('Failed to start server discovery service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    try {
      await redisManager.disconnect();
    } catch (error) {
      logError('Failed to disconnect from Redis', error);
    }

    logInfo('Server discovery service stopped');
  }

  private async discoverServers(): Promise<void> {
    try {
      const servers = await redisManager.getAllServers();
      const currentTime = Date.now();

      // Проверяем серверы на timeout
      for (const server of servers) {
        const lastSeen = new Date(server.lastSeen).getTime();
        const timeSinceLastSeen = currentTime - lastSeen;

        if (timeSinceLastSeen > this.serverTimeoutMs) {
          await redisManager.updateServerStatus(
            server.id,
            ServerStatus.OFFLINE
          );
          logInfo(`Server ${server.id} marked as offline due to timeout`, {
            lastSeen: server.lastSeen,
            timeSinceLastSeen,
          });
        }
      }

      logInfo(`Server discovery completed`, {
        totalServers: servers.length,
        onlineServers: servers.filter((s) => s.status === ServerStatus.ONLINE)
          .length,
      });
    } catch (error) {
      logError('Server discovery failed', error);
    }
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const servers = await redisManager.getAllServers();
      const healthCheckPromises = servers.map((server) =>
        this.checkServerHealth(server.id, server.ip)
      );

      const results = await Promise.allSettled(healthCheckPromises);

      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          logError(
            `Health check failed for server ${servers[index].id}`,
            result.reason
          );
        }
      });

      logInfo('Health checks completed', {
        totalServers: servers.length,
        successful: successCount,
        failed: failureCount,
      });
    } catch (error) {
      logError('Health checks failed', error);
    }
  }

  private async checkServerHealth(
    serverId: string,
    serverIp: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Попытка подключения к health endpoint сервера
      const healthUrl = `http://${serverIp}:3000/api/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ServerDiscovery/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();

        // Обновляем статус сервера в Redis
        await redisManager.updateServerStatus(serverId, ServerStatus.ONLINE);

        // Сохраняем метрики если они есть
        if (healthData.data?.memory) {
          await redisManager.saveServerMetrics({
            serverId,
            cpuUsage: 0, // Будет получено от самого сервера
            memoryUsage:
              (healthData.data.memory.heapUsed /
                healthData.data.memory.heapTotal) *
              100,
            networkIn: 0,
            networkOut: 0,
            activeConnections: 0,
            uptime: healthData.data.uptime || 0,
          });
        }

        const result: HealthCheckResult = {
          serverId,
          status: ServerStatus.ONLINE,
          responseTime,
          timestamp: new Date(),
        };

        logServerHealth(serverId, ServerStatus.ONLINE, responseTime);
        return result;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Обновляем статус сервера как offline
      await redisManager.updateServerStatus(serverId, ServerStatus.ERROR);

      const result: HealthCheckResult = {
        serverId,
        status: ServerStatus.ERROR,
        responseTime,
        error: (error as Error).message,
        timestamp: new Date(),
      };

      logServerHealth(
        serverId,
        ServerStatus.ERROR,
        responseTime,
        (error as Error).message
      );
      return result;
    }
  }

  // Метод для ручного добавления сервера
  async addServer(serverData: {
    id: string;
    name: string;
    region: string;
    ip: string;
    weight?: number;
    ports?: {
      http: number;
      https: number;
      vpn: number;
      httpProxy: number;
      socksProxy: number;
      redis: number;
    };
  }): Promise<void> {
    try {
      await redisManager.registerServer(serverData.id, {
        name: serverData.name,
        region: serverData.region,
        weight: serverData.weight || 100,
        ip: serverData.ip,
        ports: serverData.ports || {
          http: 80,
          https: 443,
          vpn: 443,
          httpProxy: 8080,
          socksProxy: 1080,
          redis: 6379,
        },
        createdAt: new Date().toISOString(),
      });

      logInfo(`Server ${serverData.id} added manually`, serverData);
    } catch (error) {
      logError(`Failed to add server ${serverData.id}`, error);
      throw error;
    }
  }

  // Метод для получения статистики
  async getStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    error: number;
    maintenance: number;
    regions: string[];
    lastUpdate: string;
  }> {
    try {
      const servers = await redisManager.getAllServers();
      const stats = {
        total: servers.length,
        online: servers.filter((s) => s.status === ServerStatus.ONLINE).length,
        offline: servers.filter((s) => s.status === ServerStatus.OFFLINE)
          .length,
        error: servers.filter((s) => s.status === ServerStatus.ERROR).length,
        maintenance: servers.filter(
          (s) => s.status === ServerStatus.MAINTENANCE
        ).length,
        regions: [...new Set(servers.map((s) => s.region))],
        lastUpdate: new Date().toISOString(),
      };

      return stats;
    } catch (error) {
      logError('Failed to get discovery stats', error);
      throw error;
    }
  }

  get isActive(): boolean {
    return this.isRunning;
  }
}

// Синглтон экземпляр
const serverDiscoveryService = new ServerDiscoveryService();

export default serverDiscoveryService;
export { ServerDiscoveryService };
