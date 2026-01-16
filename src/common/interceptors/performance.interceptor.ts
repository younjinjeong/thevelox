import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Performance Monitoring Interceptor
 * Tracks and logs request execution time
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log slow requests (> 1 second)
        if (duration > 1000) {
          this.logger.warn(`SLOW REQUEST: ${method} ${url} - ${duration}ms`);
        } else if (duration > 500) {
          this.logger.log(`${method} ${url} - ${duration}ms`);
        }

        // Could send to monitoring service here
        // Example: this.metricsService.recordRequestDuration(url, duration);
      }),
    );
  }
}
