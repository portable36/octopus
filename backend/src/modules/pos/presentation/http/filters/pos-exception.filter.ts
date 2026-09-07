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
import { PosDomainError } from '../../../domain/errors/pos.errors';
import {
  PosAccessDeniedError,
  PosApplicationError,
  PosStoreNotFoundError,
  ReceiptAlreadyExistsError,
  ReceiptNotFoundError,
  RegisterCodeAlreadyExistsError,
  RegisterInactiveError,
  RegisterNotFoundError,
  RegisterShiftAlreadyOpenError,
  ShiftAlreadyClosedError,
  ShiftCashierMismatchError,
  ShiftNotFoundError,
} from '../../../application/errors/pos.errors';

@Catch(PosApplicationError, PosDomainError)
export class PosExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: unknown): HttpException {
    if (
      exception instanceof PosStoreNotFoundError ||
      exception instanceof ReceiptNotFoundError ||
      exception instanceof RegisterNotFoundError ||
      exception instanceof ShiftNotFoundError
    ) {
      return new NotFoundException({ message: exception.message, code: exception.code });
    }
    if (
      exception instanceof ReceiptAlreadyExistsError ||
      exception instanceof RegisterCodeAlreadyExistsError ||
      exception instanceof RegisterShiftAlreadyOpenError
    ) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }
    if (
      exception instanceof PosAccessDeniedError ||
      exception instanceof ShiftCashierMismatchError
    ) {
      return new ForbiddenException({ message: exception.message, code: exception.code });
    }
    if (
      exception instanceof RegisterInactiveError ||
      exception instanceof ShiftAlreadyClosedError
    ) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (exception instanceof PosApplicationError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (exception instanceof PosDomainError) {
      return new HttpException({ message: exception.message }, HttpStatus.BAD_REQUEST);
    }
    return new HttpException('Unexpected POS error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
