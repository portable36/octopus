export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'unpublished' | 'archived';

export type CategoryStatus = 'active' | 'archived';

export type StoreOfferStatus = 'draft' | 'active' | 'suspended';

export interface CatalogAttributeAssignment {
  readonly code: string;
  readonly value: string | number | boolean | readonly string[];
}

export interface CatalogMediaReference {
  readonly mediaId: string;
  readonly mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';
  readonly isPrimary: boolean;
  readonly sortOrder: number;
}

export interface CategorySeo {
  readonly title: string | null;
  readonly description: string | null;
}
