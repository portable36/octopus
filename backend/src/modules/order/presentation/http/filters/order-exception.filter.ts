import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  OrderAccessDeniedError,
  OrderNotFoundError,
} from '../../../application/errors/order.errors';
import { OrderDomainError } from '../../../domain/errors/order.errors';

@Catch(OrderDomainError, OrderAccessDeniedError, OrderNotFoundError)
export class OrderExceptionFilter implements ExceptionFilter {
  catch(
    exception: OrderDomainError | OrderAccessDeniedError | OrderNotFoundError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof OrderAccessDeniedError
        ? HttpStatus.FORBIDDEN
        : exception instanceof OrderNotFoundError
          ? HttpStatus.NOT_FOUND
          : HttpStatus.UNPROCESSABLE_ENTITY;

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'ORDER_ERROR',
    });
  }
}
