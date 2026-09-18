import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  ContentDomainError,
  ContentPageNotFoundError,
  ContentPageSlugConflictError,
  ContentPageVersionConflictError,
} from '../../../domain/errors/content.errors';

@Catch(
  ContentDomainError,
  ContentPageNotFoundError,
  ContentPageVersionConflictError,
  ContentPageSlugConflictError,
)
export class ContentExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | ContentDomainError
      | ContentPageNotFoundError
      | ContentPageVersionConflictError
      | ContentPageSlugConflictError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof ContentPageNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (
      exception instanceof ContentPageVersionConflictError ||
      exception.code === 'CONTENT_PAGE_VERSION_CONFLICT'
    ) {
      status = HttpStatus.CONFLICT;
    } else if (
      exception instanceof ContentPageSlugConflictError ||
      exception.code === 'CONTENT_PAGE_SLUG_CONFLICT'
    ) {
      status = HttpStatus.CONFLICT;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'CONTENT_ERROR',
    });
  }
}
