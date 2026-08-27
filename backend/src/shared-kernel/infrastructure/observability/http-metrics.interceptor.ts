import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { recordHttpServerRequest } from './http-metrics';

type HttpRequestLike = {
  method?: string;
  route?: { path?: string };
  path?: string;
};

type HttpResponseLike = {
  statusCode?: number;
};

/**
 * Emits octopus.http.server.duration / requests for RED-style latency and error rate.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequestLike>();
    const res = http.getResponse<HttpResponseLike>();
    const start = performance.now();
    const method = req.method ?? 'UNKNOWN';
    const route = req.route?.path ?? req.path ?? 'unmatched';

    return next.handle().pipe(
      tap({
        next: () => {
          recordHttpServerRequest({
            method,
            route,
            statusCode: res.statusCode ?? HttpStatus.OK,
            durationMs: performance.now() - start,
          });
        },
        error: (err: unknown) => {
          const statusCode =
            err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
          recordHttpServerRequest({
            method,
            route,
            statusCode,
            durationMs: performance.now() - start,
          });
        },
      }),
    );
  }
}
