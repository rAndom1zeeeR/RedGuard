import { NextRequest, NextResponse } from 'next/server';
import redisManager from '@/lib/redis';
import { logInfo, logError } from '@/lib/logger';
import { ApiResponse, ServerHealthData } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const serverId = process.env.SERVER_ID || 'unknown';
    const healthData: ServerHealthData = {
      serverId,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Проверка Redis подключения
    try {
      await redisManager.ping();
      healthData.redis = { status: 'connected' };
    } catch (error) {
      healthData.redis = {
        status: 'disconnected',
        error: (error as Error).message,
      };
    }

    // Регистрация сервера в Redis
    try {
      await redisManager.registerServer(serverId, {
        name: `Server ${serverId}`,
        region: process.env.SERVER_REGION || 'eu',
        weight: parseInt(process.env.SERVER_WEIGHT || '100'),
        ip: (request as { ip?: string }).ip || 'unknown',
        ports: JSON.stringify({
          http: 80,
          https: 443,
          vpn: 443,
          httpProxy: 8080,
          socksProxy: 1080,
          redis: 6379,
        }),
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      logError('Failed to register server in Redis', error);
    }

    const responseTime = Date.now() - startTime;
    healthData.responseTime = responseTime;

    logInfo(`Health check completed for server ${serverId}`, {
      responseTime,
      status: 'healthy',
    });

    const response: ApiResponse = {
      success: true,
      data: healthData,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logError('Health check failed', error, {
      responseTime,
      serverId: process.env.SERVER_ID,
    });

    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      message: (error as Error).message,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
