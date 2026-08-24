export class CatalogDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogDomainError';
  }
}

export class InvalidProductStatusTransitionError extends CatalogDomainError {
  constructor(from: string, to: string) {
    super(`Invalid product status transition: ${from} -> ${to}.`);
    this.name = 'InvalidProductStatusTransitionError';
  }
}

export class DuplicateVariantAttributesError extends CatalogDomainError {
  constructor() {
    super('A variant with the same attribute combination already exists on this product.');
    this.name = 'DuplicateVariantAttributesError';
  }
}

export class CategoryCycleError extends CatalogDomainError {
  constructor() {
    super('Category hierarchy cannot contain a cycle.');
    this.name = 'CategoryCycleError';
  }
}

export class InvalidStoreOfferError extends CatalogDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStoreOfferError';
  }
}
