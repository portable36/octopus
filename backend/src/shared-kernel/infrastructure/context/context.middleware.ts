import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { runWithTenantContext, createRequestContext } from './tenant-context.storage';
import { activeOtelTraceId } from '../observability/otel-trace-id';

type RequestWithPinoId = Request & { id?: unknown };

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: RequestWithPinoId, res: Response, next: NextFunction): void {
    // Prefer pino-http req.id so ALS and access logs share one correlation id.
    const fromPino = typeof req.id === 'string' ? req.id : undefined;
    const fromHeader =
      typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined;
    const requestId = fromPino ?? fromHeader ?? randomUUID();
    const fromTraceHeader =
      typeof req.headers['x-trace-id'] === 'string' ? req.headers['x-trace-id'] : undefined;
    const traceId = activeOtelTraceId() ?? fromTraceHeader ?? requestId;

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);

    runWithTenantContext(createRequestContext(requestId, traceId), () => {
      next();
      return;
    });
  }
}
