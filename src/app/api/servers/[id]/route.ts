import { NextRequest, NextResponse } from 'next/server';
import redisManager from '@/lib/redis';
import { logInfo, logError } from '@/lib/logger';
import { ApiResponse } from '@/types';

// GET /api/servers/[id] - Получить информацию о конкретном сервере
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {

    const server = await redisManager.getServer(id);
    
    if (!server) {
      const response: ApiResponse = {
        success: false,
        error: 'Server not found',
        message: `Server with id ${id} not found`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 404 });
    }

    logInfo(`Retrieved server ${id}`);

    const response: ApiResponse = {
      success: true,
      data: { id, ...server },
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logError(`Failed to get server ${id}`, error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve server',
      message: (error as Error).message,
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/servers/[id] - Обновить информацию о сервере
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const body = await request.json();

    const existingServer = await redisManager.getServer(id);
    if (!existingServer) {
      const response: ApiResponse = {
        success: false,
        error: 'Server not found',
        message: `Server with id ${id} not found`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 404 });
    }

    const updatedData = {
      ...existingServer,
      ...body,
      updatedAt: new Date().toISOString()
    };

    await redisManager.registerServer(id, updatedData);

    logInfo(`Server ${id} updated successfully`, updatedData);

    const response: ApiResponse = {
      success: true,
      data: { id, ...updatedData },
      message: 'Server updated successfully',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logError(`Failed to update server ${id}`, error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update server',
      message: (error as Error).message,
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/servers/[id] - Удалить сервер
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {

    const existingServer = await redisManager.getServer(id);
    if (!existingServer) {
      const response: ApiResponse = {
        success: false,
        error: 'Server not found',
        message: `Server with id ${id} not found`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 404 });
    }

    await redisManager.removeServer(id);

    logInfo(`Server ${id} removed successfully`);

    const response: ApiResponse = {
      success: true,
      message: 'Server removed successfully',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logError(`Failed to remove server ${id}`, error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to remove server',
      message: (error as Error).message,
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
