import { tryGetTenantContext } from '../context/tenant-context.storage';

type RequestLike = {
  readonly id?: unknown;
  readonly method?: string;
  readonly url?: string;
  readonly route?: { readonly path?: string };
  readonly logContext?: Record<string, unknown>;
};

/**
 * Fields merged into every pino-http completion log (and available via req.log).
 * Prefers `req.logContext` snapshot from RequestLogContextInterceptor when present.
 */
export function buildRequestLogBindings(
  req?: RequestLike,
  options?: { readonly ignoreSnapshot?: boolean },
): Record<string, unknown> {
  if (!options?.ignoreSnapshot && req?.logContext) {
    return {
      ...req.logContext,
      operation:
        typeof req.logContext['operation'] === 'string'
          ? req.logContext['operation']
          : formatOperation(req),
    };
  }

  const ctx = tryGetTenantContext();
  const requestId =
    ctx?.requestId ?? (typeof req?.id === 'string' ? req.id : undefined) ?? undefined;
  const traceId = ctx?.traceId ?? requestId;

  const bindings: Record<string, unknown> = {
    requestId,
    traceId,
    operation: formatOperation(req),
  };

  if (ctx?.userId) {
    bindings.actorId = ctx.userId;
  }
  if (ctx?.vendorId) {
    bindings.vendorId = ctx.vendorId;
  }
  if (ctx?.storeId) {
    bindings.storeId = ctx.storeId;
  }
  if (ctx?.tenantId) {
    bindings.tenantId = ctx.tenantId;
  }

  return bindings;
}

function formatOperation(req?: RequestLike): string {
  const method = req?.method ?? 'UNKNOWN';
  const path = req?.route?.path ?? req?.url ?? '';
  return `${method} ${path}`.trim();
}

export function snapshotRequestLogBindings(req?: RequestLike): Record<string, unknown> {
  return buildRequestLogBindings(req, { ignoreSnapshot: true });
}

export function extractErrorCode(exception: unknown): string | undefined {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }
  const code = (exception as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}
