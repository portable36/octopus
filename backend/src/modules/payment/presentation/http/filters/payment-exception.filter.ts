import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  PaymentAccessDeniedError,
  PaymentIdempotencyConflictError,
  PaymentNotFoundError,
  PaymentProviderUnavailableError,
} from '../../../application/errors/payment.errors';
import { PaymentDomainError } from '../../../domain/errors/payment.errors';

@Catch(
  PaymentDomainError,
  PaymentAccessDeniedError,
  PaymentNotFoundError,
  PaymentIdempotencyConflictError,
  PaymentProviderUnavailableError,
)
export class PaymentExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | PaymentDomainError
      | PaymentAccessDeniedError
      | PaymentNotFoundError
      | PaymentIdempotencyConflictError
      | PaymentProviderUnavailableError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof PaymentAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof PaymentNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof PaymentIdempotencyConflictError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof PaymentProviderUnavailableError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
    } else if ('code' in exception && exception.code === 'COD_ALREADY_COLLECTED') {
      status = HttpStatus.CONFLICT;
    } else if ('code' in exception && exception.code === 'COD_AMOUNT_MISMATCH') {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else if (
      'code' in exception &&
      (exception.code === 'PAYMENT_NOT_REFUNDABLE' ||
        exception.code === 'REFUND_EXCEEDS_AVAILABLE' ||
        exception.code === 'INVALID_REFUND_STATE')
    ) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'PAYMENT_ERROR',
    });
  }
}
