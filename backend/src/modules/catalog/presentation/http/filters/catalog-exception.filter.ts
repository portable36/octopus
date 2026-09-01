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
  CatalogDomainError,
  DuplicateVariantAttributesError,
} from '../../../domain/errors/catalog.errors';
import {
  CatalogAccessDeniedError,
  CatalogApplicationError,
  CatalogSkuTakenError,
  CategoryNotFoundError,
  CategorySlugTakenError,
  ProductNotFoundError,
  StoreOfferNotFoundError,
  VariantNotFoundError,
  VendorNotActiveForCatalogError,
  VendorNotFoundForCatalogError,
} from '../../../application/errors/catalog.errors';

@Catch(CatalogApplicationError, CatalogDomainError)
export class CatalogExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: unknown): HttpException {
    if (
      exception instanceof ProductNotFoundError ||
      exception instanceof VariantNotFoundError ||
      exception instanceof CategoryNotFoundError ||
      exception instanceof StoreOfferNotFoundError ||
      exception instanceof VendorNotFoundForCatalogError ||
      (exception instanceof CatalogApplicationError && exception.code === 'STORE_NOT_FOUND')
    ) {
      return new NotFoundException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof CatalogSkuTakenError || exception instanceof CategorySlugTakenError) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof DuplicateVariantAttributesError) {
      return new ConflictException({
        message: exception.message,
        code: 'DUPLICATE_VARIANT_ATTRIBUTES',
      });
    }
    if (exception instanceof CatalogAccessDeniedError) {
      return new ForbiddenException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof VendorNotActiveForCatalogError) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }
    if (exception instanceof CatalogApplicationError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (exception instanceof CatalogDomainError) {
      return new HttpException({ message: exception.message }, HttpStatus.BAD_REQUEST);
    }
    return new HttpException('Unexpected catalog error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
