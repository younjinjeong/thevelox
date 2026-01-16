import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metrics.service';

/**
 * Metrics Middleware
 * Records request metrics for monitoring
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Record response time when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.metricsService.recordRequest(req.method, req.path, duration, res.statusCode);
    });

    next();
  }
}
