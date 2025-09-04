'use client';

import { useState, useEffect } from 'react';
import { ServerConfig, ServerStatus } from '@/types';

interface ServerListProps {
  refreshInterval?: number;
}

export default function ServerList({
  refreshInterval = 30000,
}: ServerListProps) {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    region?: string | undefined;
    status?: ServerStatus;
  }>({});

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter.region) params.append('region', filter.region);
      if (filter.status) params.append('status', filter.status);

      const response = await fetch(`/api/servers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setServers(data.data);
      } else {
        setError(data.error || 'Failed to fetch servers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchServers, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [filter, refreshInterval]);

  const getStatusColor = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.ONLINE:
        return 'status-online';
      case ServerStatus.OFFLINE:
        return 'status-offline';
      case ServerStatus.MAINTENANCE:
        return 'status-maintenance';
      case ServerStatus.ERROR:
        return 'status-error';
      default:
        return 'status-offline';
    }
  };

  const getStatusText = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.ONLINE:
        return 'Онлайн';
      case ServerStatus.OFFLINE:
        return 'Офлайн';
      case ServerStatus.MAINTENANCE:
        return 'Обслуживание';
      case ServerStatus.ERROR:
        return 'Ошибка';
      default:
        return 'Неизвестно';
    }
  };

  const handleServerAction = async (serverId: string, action: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: action === 'delete' ? 'DELETE' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: action !== 'delete' ? JSON.stringify({ status: action }) : null,
      });

      const data = await response.json();

      if (data.success) {
        await fetchServers(); // Обновляем список
      } else {
        setError(data.error || `Failed to ${action} server`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading && servers.length === 0) {
    return (
      <div className='space-y-4'>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className='flex items-center justify-between p-4 bg-slate-700 rounded-lg animate-pulse'
          >
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-slate-600 rounded-full'></div>
              <div>
                <div className='h-4 bg-slate-600 rounded w-32 mb-2'></div>
                <div className='h-3 bg-slate-600 rounded w-24'></div>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <div className='h-6 bg-slate-600 rounded w-16'></div>
              <div className='h-8 bg-slate-600 rounded w-20'></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-8'>
        <div className='text-red-400 mb-4'>
          <svg
            className='w-12 h-12 mx-auto mb-2'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
          <p className='text-lg font-medium'>Ошибка загрузки серверов</p>
          <p className='text-sm text-slate-400 mt-1'>{error}</p>
        </div>
        <button onClick={fetchServers} className='btn btn-primary'>
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Фильтры */}
      <div className='flex flex-wrap gap-4 items-center'>
        <div className='flex items-center gap-2'>
          <label className='text-sm text-slate-300'>Регион:</label>
          <select
            value={filter.region || ''}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                region: e.target.value || undefined,
              }))
            }
            className='form-input w-auto'
          >
            <option value=''>Все</option>
            <option value='eu'>Европа</option>
            <option value='us'>США</option>
            <option value='asia'>Азия</option>
          </select>
        </div>

        <div className='flex items-center gap-2'>
          <label className='text-sm text-slate-300'>Статус:</label>
          <select
            value={filter.status || ''}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                status: (e.target.value as ServerStatus) || undefined,
              }))
            }
            className='form-input w-auto'
          >
            <option value=''>Все</option>
            <option value={ServerStatus.ONLINE}>Онлайн</option>
            <option value={ServerStatus.OFFLINE}>Офлайн</option>
            <option value={ServerStatus.MAINTENANCE}>Обслуживание</option>
            <option value={ServerStatus.ERROR}>Ошибка</option>
          </select>
        </div>

        <button
          onClick={() => setFilter({})}
          className='btn btn-secondary text-sm'
        >
          Сбросить фильтры
        </button>
      </div>

      {/* Список серверов */}
      {servers.length === 0 ? (
        <div className='text-center py-8'>
          <div className='text-slate-400 mb-4'>
            <svg
              className='w-12 h-12 mx-auto mb-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <p className='text-lg font-medium'>Серверы не найдены</p>
            <p className='text-sm mt-1'>
              Добавьте первый сервер для начала работы
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          {servers.map((server) => (
            <div
              key={server.id}
              className='flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors'
            >
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-6 h-6 text-slate-300'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'
                    />
                  </svg>
                </div>
                <div>
                  <h3 className='text-lg font-medium text-white'>
                    {server.name}
                  </h3>
                  <div className='flex items-center gap-4 text-sm text-slate-300'>
                    <span>ID: {server.id}</span>
                    <span>IP: {server.ip}</span>
                    <span>Регион: {server.region}</span>
                    <span>Вес: {server.weight}</span>
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-4'>
                <span className={`status ${getStatusColor(server.status)}`}>
                  {getStatusText(server.status)}
                </span>

                <div className='flex gap-2'>
                  {server.status === ServerStatus.ONLINE && (
                    <button
                      onClick={() =>
                        handleServerAction(server.id, ServerStatus.MAINTENANCE)
                      }
                      className='btn btn-warning text-sm'
                    >
                      В обслуживание
                    </button>
                  )}

                  {server.status === ServerStatus.MAINTENANCE && (
                    <button
                      onClick={() =>
                        handleServerAction(server.id, ServerStatus.ONLINE)
                      }
                      className='btn btn-success text-sm'
                    >
                      Включить
                    </button>
                  )}

                  <button
                    onClick={() => handleServerAction(server.id, 'delete')}
                    className='btn btn-error text-sm'
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Индикатор обновления */}
      {loading && servers.length > 0 && (
        <div className='text-center text-slate-400 text-sm'>
          <div className='inline-flex items-center gap-2'>
            <div className='w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin'></div>
            Обновление...
          </div>
        </div>
      )}
    </div>
  );
}
