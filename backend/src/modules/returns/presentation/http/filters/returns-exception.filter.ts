import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ReturnDomainError } from '../../../domain/errors/returns.errors';
import {
  ReturnNotFoundError,
  ReturnsAccessDeniedError,
  ReturnsIdempotencyConflictError,
} from '../../../application/errors/returns.errors';

@Catch(
  ReturnDomainError,
  ReturnsAccessDeniedError,
  ReturnNotFoundError,
  ReturnsIdempotencyConflictError,
)
export class ReturnsExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | ReturnDomainError
      | ReturnsAccessDeniedError
      | ReturnNotFoundError
      | ReturnsIdempotencyConflictError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof ReturnsAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof ReturnNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof ReturnsIdempotencyConflictError) {
      status = HttpStatus.CONFLICT;
    } else if ('code' in exception && exception.code === 'RETURN_WINDOW_EXPIRED') {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'RETURN_ERROR',
    });
  }
}
