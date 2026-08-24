import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  PricingAccessDeniedError,
  PromotionNotFoundError,
} from '../../../application/errors/pricing.errors';
import { PricingDomainError } from '../../../domain/errors/pricing.errors';

@Catch(PricingDomainError, PricingAccessDeniedError, PromotionNotFoundError)
export class PricingExceptionFilter implements ExceptionFilter {
  catch(
    exception: PricingDomainError | PricingAccessDeniedError | PromotionNotFoundError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof PricingAccessDeniedError
        ? HttpStatus.FORBIDDEN
        : exception instanceof PromotionNotFoundError
          ? HttpStatus.NOT_FOUND
          : HttpStatus.UNPROCESSABLE_ENTITY;

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'PRICING_ERROR',
    });
  }
}
