import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { StoreDomainError } from '../../../domain/errors/store.errors';
import {
  StoreAccessDeniedError,
  StoreApplicationError,
  StoreNotFoundError,
  StoreSlugTakenError,
  VendorNotActiveForStoreError,
  VendorNotFoundForStoreError,
} from '../../../application/errors/store.errors';

@Catch(StoreApplicationError, StoreDomainError)
export class StoreExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: unknown): HttpException {
    if (
      exception instanceof StoreNotFoundError ||
      exception instanceof VendorNotFoundForStoreError
    ) {
      return new NotFoundException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof StoreSlugTakenError) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof StoreAccessDeniedError) {
      return new ForbiddenException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof VendorNotActiveForStoreError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.CONFLICT,
      );
    }
    if (exception instanceof StoreApplicationError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (exception instanceof StoreDomainError) {
      return new HttpException({ message: exception.message }, HttpStatus.BAD_REQUEST);
    }
    return new HttpException('Unexpected store error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
