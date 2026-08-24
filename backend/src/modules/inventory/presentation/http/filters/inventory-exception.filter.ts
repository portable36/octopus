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
import {
  InsufficientStockError,
  InventoryDomainError,
} from '../../../domain/errors/inventory.errors';
import {
  CrossStoreTransferDeniedError,
  InventoryAccessDeniedError,
  InventoryApplicationError,
  InventoryItemNotFoundError,
  ReservationNotFoundError,
  VariantNotFoundForInventoryError,
  WarehouseCodeTakenError,
  WarehouseNotFoundError,
} from '../../../application/errors/inventory.errors';

@Catch(InventoryApplicationError, InventoryDomainError)
export class InventoryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: unknown): HttpException {
    if (
      exception instanceof WarehouseNotFoundError ||
      exception instanceof InventoryItemNotFoundError ||
      exception instanceof ReservationNotFoundError ||
      exception instanceof VariantNotFoundForInventoryError
    ) {
      return new NotFoundException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof WarehouseCodeTakenError) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }
    if (
      exception instanceof InventoryAccessDeniedError ||
      exception instanceof CrossStoreTransferDeniedError
    ) {
      return new ForbiddenException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof InsufficientStockError) {
      return new HttpException(
        { message: exception.message, code: 'INSUFFICIENT_STOCK' },
        HttpStatus.CONFLICT,
      );
    }
    if (exception instanceof InventoryApplicationError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (exception instanceof InventoryDomainError) {
      return new HttpException({ message: exception.message }, HttpStatus.BAD_REQUEST);
    }
    return new HttpException('Unexpected inventory error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
