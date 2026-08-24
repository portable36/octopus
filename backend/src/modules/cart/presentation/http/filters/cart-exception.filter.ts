import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  CartAccessDeniedError,
  CartNotFoundError,
  CartOfferUnavailableError,
} from '../../../application/errors/cart.errors';
import { CartDomainError } from '../../../domain/errors/cart.errors';

@Catch(CartDomainError, CartAccessDeniedError, CartNotFoundError, CartOfferUnavailableError)
export class CartExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      CartDomainError | CartAccessDeniedError | CartNotFoundError | CartOfferUnavailableError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof CartAccessDeniedError
        ? HttpStatus.FORBIDDEN
        : exception instanceof CartNotFoundError
          ? HttpStatus.NOT_FOUND
          : exception instanceof CartOfferUnavailableError
            ? HttpStatus.CONFLICT
            : HttpStatus.UNPROCESSABLE_ENTITY;

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'CART_ERROR',
    });
  }
}
