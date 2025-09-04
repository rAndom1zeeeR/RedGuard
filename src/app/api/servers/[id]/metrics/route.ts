import { NextRequest, NextResponse } from 'next/server';
import redisManager from '@/lib/redis';
import { logInfo, logError } from '@/lib/logger';
import { ApiResponse, MetricsResponse } from '@/types';

// GET /api/servers/[id]/metrics - Получить метрики сервера
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Проверяем существование сервера
    const server = await redisManager.getServer(id);
    if (!server) {
      const response: ApiResponse = {
        success: false,
        error: 'Server not found',
        message: `Server with id ${id} not found`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    const metrics = await redisManager.getServerMetrics(id, hours);

    // Пагинация
    const total = metrics.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMetrics = metrics.slice(startIndex, endIndex);

    // Агрегированные данные
    const aggregated = {
      avgCpuUsage:
        metrics.reduce((sum, m) => sum + parseFloat(String(m.cpuUsage || 0)), 0) /
          metrics.length || 0,
      avgMemoryUsage:
        metrics.reduce((sum, m) => sum + parseFloat(String(m.memoryUsage || 0)), 0) /
          metrics.length || 0,
      maxCpuUsage: Math.max(...metrics.map((m) => parseFloat(String(m.cpuUsage || 0)))),
      maxMemoryUsage: Math.max(
        ...metrics.map((m) => parseFloat(String(m.memoryUsage || 0)))
      ),
      totalConnections: metrics.reduce(
        (sum, m) => sum + parseInt(m.activeConnections || ''),
        0
      ),
      totalNetworkIn: metrics.reduce(
        (sum, m) => sum + parseFloat(m.networkIn || ''),
        0
      ),
      totalNetworkOut: metrics.reduce(
        (sum, m) => sum + parseFloat(m.networkOut || ''),
        0
      ),
    };

    // Преобразуем данные из Redis формата в API формат
    const transformedMetrics = paginatedMetrics.map(m => ({
      serverId: m.serverId,
      timestamp: new Date(m.timestamp),
      cpuUsage: parseFloat(m.cpuUsage),
      memoryUsage: parseFloat(m.memoryUsage),
      networkIn: parseFloat(m.networkIn),
      networkOut: parseFloat(m.networkOut),
      activeConnections: parseInt(m.activeConnections),
      uptime: parseFloat(m.uptime),
    }));

    const response: MetricsResponse = {
      success: true,
      data: transformedMetrics,
      metrics: {
        metrics: transformedMetrics,
        aggregated,
        server: { 
          id, 
          name: server.name, 
          region: server.region, 
          status: server.status as any 
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      timestamp: new Date(),
    };

    logInfo(`Retrieved metrics for server ${id}`, {
      hours,
      totalMetrics: total,
      page,
      limit,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logError(`Failed to get metrics for server ${id}`, error);

    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve server metrics',
      message: (error as Error).message,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/servers/[id]/metrics - Сохранить метрики сервера
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const body = await request.json();
    const {
      cpuUsage,
      memoryUsage,
      networkIn,
      networkOut,
      activeConnections,
      uptime,
    } = body;

    // Проверяем существование сервера
    const server = await redisManager.getServer(id);
    if (!server) {
      const response: ApiResponse = {
        success: false,
        error: 'Server not found',
        message: `Server with id ${id} not found`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    const metrics = {
      serverId: id,
      cpuUsage: cpuUsage || 0,
      memoryUsage: memoryUsage || 0,
      networkIn: networkIn || 0,
      networkOut: networkOut || 0,
      activeConnections: activeConnections || 0,
      uptime: uptime || 0,
    };

    await redisManager.saveServerMetrics(metrics);

    logInfo(`Metrics saved for server ${id}`, metrics);

    const response: ApiResponse = {
      success: true,
      data: metrics,
      message: 'Metrics saved successfully',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logError(`Failed to save metrics for server ${id}`, error);

    const response: ApiResponse = {
      success: false,
      error: 'Failed to save server metrics',
      message: (error as Error).message,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
