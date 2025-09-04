import { Suspense } from 'react';
import ServerList from '@/components/ServerList';
import ServerStats from '@/components/ServerStats';
import LoadBalancerStatus from '@/components/LoadBalancerStatus';
import { logInfo } from '@/lib/logger';

export default function HomePage() {
  logInfo('Home page rendered');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            RedGuard Server Management
          </h1>
          <p className="text-slate-300 text-lg">
            Управление серверами с горизонтальным масштабированием
          </p>
        </header>

        {/* Статистика */}
        <Suspense fallback={<StatsSkeleton />}>
          <ServerStats />
        </Suspense>

        {/* Статус Load Balancer */}
        <div className="mb-8">
          <Suspense fallback={<LoadBalancerSkeleton />}>
            <LoadBalancerStatus />
          </Suspense>
        </div>

        {/* Список серверов */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Серверы
            </h2>
            <button className="btn btn-primary">
              Добавить сервер
            </button>
          </div>
          
          <Suspense fallback={<ServerListSkeleton />}>
            <ServerList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// Skeleton компоненты для загрузки
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-slate-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

function LoadBalancerSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-6 bg-slate-600 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-slate-600 rounded w-1/2"></div>
    </div>
  );
}

function ServerListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-600 rounded-full"></div>
            <div>
              <div className="h-4 bg-slate-600 rounded w-32 mb-2"></div>
              <div className="h-3 bg-slate-600 rounded w-24"></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 bg-slate-600 rounded w-16"></div>
            <div className="h-8 bg-slate-600 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
