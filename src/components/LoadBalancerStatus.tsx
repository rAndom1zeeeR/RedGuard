'use client';

import { useState, useEffect } from 'react';

interface LoadBalancerData {
  status: 'online' | 'offline' | 'error';
  algorithm: string;
  totalConnections: number;
  activeServers: number;
  responseTime: number;
  lastUpdate: string;
}

export default function LoadBalancerStatus() {
  const [lbData, setLbData] = useState<LoadBalancerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoadBalancerStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Симуляция данных load balancer (в реальном проекте это будет API call)
      const mockData: LoadBalancerData = {
        status: 'online',
        algorithm: 'roundrobin',
        totalConnections: Math.floor(Math.random() * 1000) + 100,
        activeServers: 3,
        responseTime: Math.floor(Math.random() * 50) + 10,
        lastUpdate: new Date().toISOString()
      };

      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLbData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadBalancerStatus();
    
    const interval = setInterval(fetchLoadBalancerStatus, 15000); // Обновление каждые 15 секунд
    return () => clearInterval(interval);
  }, []);

  if (loading && !lbData) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-slate-600 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-600 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-4">
          <div className="text-red-400 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm">Ошибка загрузки статуса Load Balancer</p>
          </div>
          <button 
            onClick={fetchLoadBalancerStatus}
            className="btn btn-primary text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!lbData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'status-online';
      case 'offline':
        return 'status-offline';
      case 'error':
        return 'status-error';
      default:
        return 'status-offline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Активен';
      case 'offline':
        return 'Неактивен';
      case 'error':
        return 'Ошибка';
      default:
        return 'Неизвестно';
    }
  };

  const getAlgorithmText = (algorithm: string) => {
    switch (algorithm) {
      case 'roundrobin':
        return 'Round Robin';
      case 'leastconn':
        return 'Least Connections';
      case 'first':
        return 'First Available';
      case 'random':
        return 'Random';
      default:
        return algorithm;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">
          Load Balancer
        </h3>
        <span className={`status ${getStatusColor(lbData.status)}`}>
          {getStatusText(lbData.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Алгоритм</p>
              <p className="text-lg font-semibold text-white">
                {loading ? (
                  <div className="w-20 h-6 bg-slate-600 rounded animate-pulse"></div>
                ) : (
                  getAlgorithmText(lbData.algorithm)
                )}
              </p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Активные серверы</p>
              <p className="text-lg font-semibold text-white">
                {loading ? (
                  <div className="w-8 h-6 bg-slate-600 rounded animate-pulse"></div>
                ) : (
                  lbData.activeServers
                )}
              </p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Подключения</p>
              <p className="text-lg font-semibold text-white">
                {loading ? (
                  <div className="w-16 h-6 bg-slate-600 rounded animate-pulse"></div>
                ) : (
                  lbData.totalConnections.toLocaleString()
                )}
              </p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Время отклика</p>
              <p className="text-lg font-semibold text-white">
                {loading ? (
                  <div className="w-12 h-6 bg-slate-600 rounded animate-pulse"></div>
                ) : (
                  `${lbData.responseTime}ms`
                )}
              </p>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-600">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Последнее обновление: {new Date(lbData.lastUpdate).toLocaleTimeString()}</span>
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Обновление...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
