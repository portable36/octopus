import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { PayoutDomainError } from '../../../domain/errors/payout.errors';
import {
  PayoutAccessDeniedError,
  PayoutIdempotencyConflictError,
  PayoutNotFoundError,
} from '../../../application/errors/payout.errors';

@Catch(
  PayoutDomainError,
  PayoutAccessDeniedError,
  PayoutNotFoundError,
  PayoutIdempotencyConflictError,
)
export class PayoutExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | PayoutDomainError
      | PayoutAccessDeniedError
      | PayoutNotFoundError
      | PayoutIdempotencyConflictError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof PayoutAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof PayoutNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof PayoutIdempotencyConflictError) {
      status = HttpStatus.CONFLICT;
    } else if ('code' in exception && exception.code === 'INSUFFICIENT_PAYOUT_BALANCE') {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'PAYOUT_ERROR',
    });
  }
}
