import { NextRequest, NextResponse } from 'next/server';
import redisManager from '@/lib/redis';
import { logInfo, logError } from '@/lib/logger';
import { ApiResponse, PaginatedResponse } from '@/types';

// GET /api/servers - Получить список всех серверов
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const region = searchParams.get('region');
    const status = searchParams.get('status');

    const servers = await redisManager.getAllServers();
    
    // Фильтрация по региону и статусу
    let filteredServers = servers;
    if (region) {
      filteredServers = filteredServers.filter(server => server.region === region);
    }
    if (status) {
      filteredServers = filteredServers.filter(server => server.status === status);
    }

    // Пагинация
    const total = filteredServers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedServers = filteredServers.slice(startIndex, endIndex);

    const response: PaginatedResponse<ServerConfig> = {
      success: true,
      data: paginatedServers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      timestamp: new Date()
    };

    logInfo(`Retrieved ${paginatedServers.length} servers`, {
      page,
      limit,
      total,
      region,
      status
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logError('Failed to get servers', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve servers',
      message: (error as Error).message,
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/servers - Добавить новый сервер
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { id, name, region, weight, ip, ports } = body;

    if (!id || !name || !region) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
        message: 'id, name, and region are required',
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const serverData = {
      name,
      region,
      weight: weight || 100,
      ip: ip || 'unknown',
      ports: ports || {
        http: 80,
        https: 443,
        vpn: 443,
        httpProxy: 8080,
        socksProxy: 1080,
        redis: 6379
      },
      createdAt: new Date().toISOString()
    };

    await redisManager.registerServer(id, serverData);

    logInfo(`Server ${id} added successfully`, serverData);

    const response: ApiResponse = {
      success: true,
      data: { id, ...serverData },
      message: 'Server added successfully',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    logError('Failed to add server', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to add server',
      message: (error as Error).message,
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
