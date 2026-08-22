import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let detail = 'An unexpected error occurred.';
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      detail =
        typeof body === 'string'
          ? body
          : typeof body === 'object' &&
              body !== null &&
              'message' in body &&
              typeof body.message === 'string'
            ? body.message
            : detail;
    }

    const problem: ProblemDetails = {
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.url,
    };

    response.status(status).type('application/problem+json').json(problem);
  }
}
