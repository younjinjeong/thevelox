import { Injectable, Logger } from '@nestjs/common';

/**
 * Metrics Service
 * Tracks application performance metrics
 */

export interface RequestMetric {
  method: string;
  path: string;
  duration: number;
  timestamp: Date;
  statusCode: number;
}

export interface SystemMetric {
  cpuUsage: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private requestMetrics: RequestMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  private readonly MAX_METRICS_SIZE = 1000;

  /**
   * Record request duration
   */
  recordRequest(method: string, path: string, duration: number, statusCode: number): void {
    const metric: RequestMetric = {
      method,
      path,
      duration,
      statusCode,
      timestamp: new Date(),
    };

    this.requestMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.requestMetrics.length > this.MAX_METRICS_SIZE) {
      this.requestMetrics.shift();
    }

    // Log extremely slow requests
    if (duration > 5000) {
      this.logger.error(`EXTREMELY SLOW REQUEST: ${method} ${path} - ${duration}ms`);
    }
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(): void {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metric: SystemMetric = {
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      memoryUsage: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      },
      timestamp: new Date(),
    };

    this.systemMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.systemMetrics.length > this.MAX_METRICS_SIZE) {
      this.systemMetrics.shift();
    }

    // Warn if memory usage is high
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 1000) {
      this.logger.warn(`HIGH MEMORY USAGE: ${heapUsedMB.toFixed(2)} MB`);
    }
  }

  /**
   * Get request metrics statistics
   */
  getRequestStats(): {
    total: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    slowRequests: number;
  } {
    if (this.requestMetrics.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        slowRequests: 0,
      };
    }

    const durations = this.requestMetrics.map(m => m.duration);
    const total = this.requestMetrics.length;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / total;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const slowRequests = this.requestMetrics.filter(m => m.duration > 1000).length;

    return {
      total,
      avgDuration: Math.round(avgDuration),
      maxDuration,
      minDuration,
      slowRequests,
    };
  }

  /**
   * Get system metrics statistics
   */
  getSystemStats(): {
    current: SystemMetric | null;
    avgMemoryUsed: number;
    avgCpuUsage: number;
  } {
    if (this.systemMetrics.length === 0) {
      return {
        current: null,
        avgMemoryUsed: 0,
        avgCpuUsage: 0,
      };
    }

    const current = this.systemMetrics[this.systemMetrics.length - 1];
    const avgMemoryUsed =
      this.systemMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / this.systemMetrics.length;
    const avgCpuUsage = this.systemMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / this.systemMetrics.length;

    return {
      current,
      avgMemoryUsed: Math.round(avgMemoryUsed),
      avgCpuUsage: Math.round(avgCpuUsage * 100) / 100,
    };
  }

  /**
   * Get slow requests (> 1 second)
   */
  getSlowRequests(limit = 20): RequestMetric[] {
    return this.requestMetrics
      .filter(m => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.requestMetrics = [];
    this.systemMetrics = [];
    this.logger.log('Metrics cleared');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): { requests: RequestMetric[]; system: SystemMetric[] } {
    return {
      requests: this.requestMetrics,
      system: this.systemMetrics,
    };
  }
}
