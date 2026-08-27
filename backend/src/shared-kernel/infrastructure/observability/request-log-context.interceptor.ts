import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { snapshotRequestLogBindings } from './pino-request-bindings';

export type RequestWithLogContext = {
  id?: unknown;
  method?: string;
  url?: string;
  route?: { path?: string };
  logContext?: Record<string, unknown>;
};

/**
 * Snapshots ALS tenant fields onto the request so pino-http completion logs
 * still see actor/vendor/store if the finish hook runs outside ALS.
 */
@Injectable()
export class RequestLogContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithLogContext>();
    const refresh = (): void => {
      req.logContext = snapshotRequestLogBindings(req);
    };
    refresh();
    return next.handle().pipe(finalize(refresh));
  }
}
