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
import { VendorDomainError } from '../../../domain/errors/vendor.errors';
import {
  VendorAccessDeniedError,
  VendorApplicationError,
  VendorNotFoundError,
  VendorSlugTakenError,
} from '../../../application/errors/vendor.errors';

@Catch(VendorApplicationError, VendorDomainError)
export class VendorExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: unknown): HttpException {
    if (exception instanceof VendorNotFoundError) {
      return new NotFoundException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof VendorSlugTakenError) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof VendorAccessDeniedError) {
      return new ForbiddenException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof VendorApplicationError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (exception instanceof VendorDomainError) {
      return new HttpException({ message: exception.message }, HttpStatus.BAD_REQUEST);
    }
    return new HttpException('Unexpected vendor error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
