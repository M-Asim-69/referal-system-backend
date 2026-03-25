import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
  path: string;
}

interface ControllerResponse<T = unknown> {
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((payload) => {
        const res = payload as ControllerResponse<T>;
        const hasWrapper =
          res !== null && typeof res === 'object' && 'data' in res;

        return {
          success: true,
          statusCode: response.statusCode,
          message:
            (hasWrapper ? res.message : undefined) ?? 'Request successful',
          data: hasWrapper ? (res.data as T) : payload,
          ...(hasWrapper && res.meta ? { meta: res.meta } : {}),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
