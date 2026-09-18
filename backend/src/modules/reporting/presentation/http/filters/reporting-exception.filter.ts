import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common';
import {
  ReportingAccessDeniedError,
  ReportingDependencyMissingError,
} from '../../../application/queries/reporting-query.handler';

@Catch(ReportingAccessDeniedError, ReportingDependencyMissingError)
export class ReportingExceptionFilter implements ExceptionFilter {
  catch(
    exception: ReportingAccessDeniedError | ReportingDependencyMissingError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const status =
      exception instanceof ReportingDependencyMissingError
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.FORBIDDEN;
    res.status(status).json({
      message: exception.message,
      code: exception.code,
      status,
    });
  }
}
