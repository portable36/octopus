import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ReportingAccessDeniedError } from '../../../application/queries/reporting-query.handler';

@Catch(ReportingAccessDeniedError)
export class ReportingExceptionFilter implements ExceptionFilter {
  catch(exception: ReportingAccessDeniedError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    res.status(HttpStatus.FORBIDDEN).json({
      message: exception.message,
      code: exception.code,
      status: HttpStatus.FORBIDDEN,
    });
  }
}
