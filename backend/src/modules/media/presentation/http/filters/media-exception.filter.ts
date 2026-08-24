import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  MediaAccessDeniedError,
  MediaDomainError,
  MediaNotFoundError,
} from '../../../application/errors/media.errors';

@Catch(MediaDomainError, MediaAccessDeniedError, MediaNotFoundError)
export class MediaExceptionFilter implements ExceptionFilter {
  catch(
    exception: MediaDomainError | MediaAccessDeniedError | MediaNotFoundError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof MediaAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof MediaNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'MEDIA_ERROR',
    });
  }
}
