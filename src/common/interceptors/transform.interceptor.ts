import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip transformation for file downloads and streams
    if (response.getHeader('Content-Disposition') || request.url.includes('/download')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        message: data?.message || 'Success',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
