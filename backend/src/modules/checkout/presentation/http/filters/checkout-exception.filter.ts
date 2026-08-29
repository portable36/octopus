import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  CheckoutAccessDeniedError,
  CheckoutIdempotencyConflictError,
  CheckoutInProgressError,
} from '../../../application/errors/checkout.errors';
import {
  CheckoutCartConflictError,
  CheckoutCouponError,
  CheckoutDomainError,
  CheckoutInventoryError,
  CheckoutValidationError,
} from '../../../domain/errors/checkout.errors';

@Catch(
  CheckoutDomainError,
  CheckoutAccessDeniedError,
  CheckoutIdempotencyConflictError,
  CheckoutInProgressError,
  CheckoutValidationError,
  CheckoutCartConflictError,
  CheckoutInventoryError,
  CheckoutCouponError,
)
export class CheckoutExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | CheckoutDomainError
      | CheckoutAccessDeniedError
      | CheckoutIdempotencyConflictError
      | CheckoutInProgressError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof CheckoutAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (
      exception instanceof CheckoutCartConflictError ||
      exception instanceof CheckoutIdempotencyConflictError ||
      exception instanceof CheckoutInProgressError
    ) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof CheckoutInventoryError) {
      status = HttpStatus.CONFLICT;
    }

    const body: Record<string, unknown> = {
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'CHECKOUT_ERROR',
    };
    if (exception instanceof CheckoutValidationError) {
      body.issues = exception.issues;
    }
    res.status(status).json(body);
  }
}
