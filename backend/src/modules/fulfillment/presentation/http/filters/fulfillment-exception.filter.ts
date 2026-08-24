import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  FulfillmentAccessDeniedError,
  FulfillmentIdempotencyConflictError,
  FulfillmentValidationError,
  ShipmentNotFoundError,
} from '../../../application/errors/fulfillment.errors';
import { FulfillmentDomainError } from '../../../domain/errors/fulfillment.errors';

@Catch(
  FulfillmentDomainError,
  FulfillmentAccessDeniedError,
  FulfillmentIdempotencyConflictError,
  FulfillmentValidationError,
  ShipmentNotFoundError,
)
export class FulfillmentExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | FulfillmentDomainError
      | FulfillmentAccessDeniedError
      | FulfillmentIdempotencyConflictError
      | FulfillmentValidationError
      | ShipmentNotFoundError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof FulfillmentAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof ShipmentNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof FulfillmentIdempotencyConflictError) {
      status = HttpStatus.CONFLICT;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'FULFILLMENT_ERROR',
    });
  }
}
