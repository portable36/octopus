import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Response } from 'express';
import { extractErrorCode } from '../observability/pino-request-bindings';
import { tryGetTenantContext } from '../context/tenant-context.storage';

interface FieldError {
  field: string;
  message: string;
}

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: FieldError[];
  errorCode?: string;
}

type RequestWithLog = {
  url: string;
  log?: {
    warn: (obj: Record<string, unknown>, msg?: string) => void;
    error: (obj: Record<string, unknown>, msg?: string) => void;
  };
};

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithLog>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const { detail, errors } = this.extractProblemBody(body);
    const errorCode = extractErrorCode(exception);

    const problem: ProblemDetails = {
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.url,
    };

    if (errors.length > 0) {
      problem.errors = errors;
    }
    if (errorCode) {
      problem.errorCode = errorCode;
    }

    this.logFailure(request, status, errorCode, exception);

    response.status(status).type('application/problem+json').json(problem);
  }

  private logFailure(
    request: RequestWithLog,
    status: number,
    errorCode: string | undefined,
    exception: unknown,
  ): void {
    const tenant = tryGetTenantContext();
    const payload: Record<string, unknown> = {
      status,
      errorCode: errorCode ?? (status >= 500 ? 'INTERNAL_ERROR' : undefined),
      requestId: tenant?.requestId,
      traceId: tenant?.traceId ?? tenant?.requestId,
      actorId: tenant?.userId,
      vendorId: tenant?.vendorId,
      storeId: tenant?.storeId,
    };

    if (status >= 500) {
      Sentry.captureException(exception);
      request.log?.error(
        {
          ...payload,
          err: exception instanceof Error ? exception : undefined,
        },
        'request_failed',
      );
      return;
    }

    request.log?.warn(payload, 'request_rejected');
  }

  private extractProblemBody(body: unknown): { detail: string; errors: FieldError[] } {
    if (typeof body === 'string') {
      return { detail: body, errors: [] };
    }

    if (typeof body !== 'object' || body === null) {
      return { detail: 'An unexpected error occurred.', errors: [] };
    }

    const record = body as Record<string, unknown>;
    const errors = this.normalizeErrors(record['errors'] ?? record['message']);

    const detail =
      typeof record['message'] === 'string'
        ? record['message']
        : Array.isArray(record['message'])
          ? 'Validation failed.'
          : 'An unexpected error occurred.';

    return { detail, errors };
  }

  private normalizeErrors(input: unknown): FieldError[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const errors: FieldError[] = [];

    for (const item of input) {
      if (typeof item === 'string') {
        errors.push({ field: 'request', message: item });
        continue;
      }

      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        if (typeof record['field'] === 'string' && typeof record['message'] === 'string') {
          errors.push({ field: record['field'], message: record['message'] });
        }
      }
    }

    return errors;
  }
}
