import { NextResponse } from 'next/server';
import redisManager from '@/lib/redis';
import { logInfo, logError } from '@/lib/logger';
import { ApiResponse, DiscoveryHealthData } from '@/types';

// GET /api/discovery/health - Health check для сервиса обнаружения серверов
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const healthData: DiscoveryHealthData = {
      service: 'server-discovery',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: { status: 'unknown' },
      discoveredServers: 0,
    };

    // Проверка Redis подключения
    try {
      await redisManager.ping();
      healthData.redis = { status: 'connected' };

      // Получаем количество обнаруженных серверов
      const servers = await redisManager.getAllServers();
      healthData.discoveredServers = servers.length;
    } catch (error) {
      healthData.redis = {
        status: 'disconnected',
        error: (error as Error).message,
      };
    }

    const responseTime = Date.now() - startTime;
    healthData.responseTime = responseTime;

    logInfo('Server discovery health check completed', {
      responseTime,
      status: 'healthy',
      discoveredServers: healthData.discoveredServers,
    });

    const response: ApiResponse = {
      success: true,
      data: healthData,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logError('Server discovery health check failed', error, {
      responseTime,
    });

    const response: ApiResponse = {
      success: false,
      error: 'Server discovery health check failed',
      message: (error as Error).message,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
