import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuditAccessDeniedError } from '../../../application/errors/audit.errors';

@Catch(AuditAccessDeniedError)
export class AuditExceptionFilter implements ExceptionFilter {
  catch(exception: AuditAccessDeniedError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = HttpStatus.FORBIDDEN;
    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: exception.code,
    });
  }
}
