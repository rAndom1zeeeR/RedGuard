// Основные типы для RedGuard сервера
export interface ServerConfig {
  id: string;
  name: string;
  region: string;
  weight: number;
  status: ServerStatus;
  ip: string;
  ports: ServerPorts;
  createdAt: Date;
  updatedAt: Date;
  lastHealthCheck: Date;
}

export interface ServerPorts {
  http: number;
  https: number;
  vpn: number;
  httpProxy: number;
  socksProxy: number;
  redis: number;
}

export enum ServerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

export interface VPNUser {
  id: string;
  username: string;
  email: string;
  password: string;
  isActive: boolean;
  bandwidthLimit: number;
  bandwidthUsed: number;
  createdAt: Date;
  lastLogin: Date;
  servers: string[];
}

export interface ProxyConfig {
  user: string;
  pass: string;
  isActive: boolean;
  allowedIPs: string[];
  rateLimit: number;
  createdAt: Date;
}

export interface ServerMetrics {
  serverId: string;
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  uptime: number;
}

export interface LoadBalancerConfig {
  algorithm: 'roundrobin' | 'leastconn' | 'first' | 'random';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxConnections: number;
  servers: ServerConfig[];
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  database: number;
  keyPrefix: string;
}

export interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  filename: string;
  maxSize: string;
  maxFiles: number;
  format: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  allowedOrigins: string[];
  corsEnabled: boolean;
}

export interface CertbotConfig {
  email: string;
  domain: string;
  webrootPath: string;
  renewBeforeExpiry: number;
  staging: boolean;
}

// API Response типы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MetricsResponse extends ApiResponse<ServerMetrics[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    metrics: ServerMetrics[];
    aggregated: {
      avgCpuUsage: number;
      avgMemoryUsage: number;
      totalConnections: number;
      totalNetworkIn: number;
      totalNetworkOut: number;
    };
    server: {
      id: string;
      name: string;
      region: string;
      status: ServerStatus;
    };
  };
}

// WebSocket типы
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  serverId?: string;
}

export interface HealthCheckResult {
  serverId: string;
  status: ServerStatus;
  responseTime: number;
  error?: string;
  timestamp: Date;
  redis?: {
    status: string;
    error?: string;
  };
  ip?: string;
}

export interface ServerHealthData {
  serverId: string;
  status: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  redis?: {
    status: string;
    error?: string;
  };
  responseTime?: number;
}

export interface DiscoveryHealthData {
  service: string;
  status: string;
  timestamp: string;
  uptime: number;
  redis: {
    status: string;
    error?: string;
  };
  discoveredServers: number;
  responseTime?: number;
}

// Конфигурация масштабирования
export interface ScalingConfig {
  autoScaling: boolean;
  minInstances: number;
  maxInstances: number;
  cpuThreshold: number;
  memoryThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

// Мониторинг и алерты
export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  serverId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  retentionDays: number;
  alertThresholds: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}
