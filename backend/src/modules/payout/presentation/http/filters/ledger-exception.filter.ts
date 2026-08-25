import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { LedgerDomainError } from '../../../domain/errors/ledger.errors';
import { LedgerAccessDeniedError } from '../../../application/services/ledger-authorization.service';

@Catch(LedgerAccessDeniedError, LedgerDomainError)
export class LedgerExceptionFilter implements ExceptionFilter {
  catch(exception: LedgerAccessDeniedError | LedgerDomainError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof LedgerAccessDeniedError
        ? HttpStatus.FORBIDDEN
        : HttpStatus.UNPROCESSABLE_ENTITY;
    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: exception.code,
    });
  }
}
