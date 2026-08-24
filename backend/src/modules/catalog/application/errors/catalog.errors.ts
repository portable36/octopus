export class CatalogApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'CatalogApplicationError';
  }
}

export class ProductNotFoundError extends CatalogApplicationError {
  constructor() {
    super('Product not found.', 'PRODUCT_NOT_FOUND');
  }
}

export class VariantNotFoundError extends CatalogApplicationError {
  constructor() {
    super('Variant not found.', 'VARIANT_NOT_FOUND');
  }
}

export class CategoryNotFoundError extends CatalogApplicationError {
  constructor() {
    super('Category not found.', 'CATEGORY_NOT_FOUND');
  }
}

export class StoreOfferNotFoundError extends CatalogApplicationError {
  constructor() {
    super('Store offer not found.', 'STORE_OFFER_NOT_FOUND');
  }
}

export class CatalogSkuTakenError extends CatalogApplicationError {
  constructor() {
    super('SKU is already taken for this vendor.', 'CATALOG_SKU_TAKEN');
  }
}

export class CategorySlugTakenError extends CatalogApplicationError {
  constructor() {
    super('Category slug is already taken among siblings.', 'CATEGORY_SLUG_TAKEN');
  }
}

export class CatalogAccessDeniedError extends CatalogApplicationError {
  constructor() {
    super('Not authorized for this catalog action.', 'CATALOG_ACCESS_DENIED');
  }
}

export class VendorNotActiveForCatalogError extends CatalogApplicationError {
  constructor() {
    super('Vendor must be active for catalog mutations.', 'VENDOR_NOT_ACTIVE');
  }
}

export class VendorNotFoundForCatalogError extends CatalogApplicationError {
  constructor() {
    super('Vendor not found.', 'VENDOR_NOT_FOUND');
  }
}
