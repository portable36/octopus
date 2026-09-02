export const PRODUCT_ASSOCIATION_REPOSITORY = Symbol('PRODUCT_ASSOCIATION_REPOSITORY');

export type ProductAssociationRecord = {
  readonly productId: string;
  readonly associatedProductId: string;
  readonly coPurchaseScore: number;
};

export interface ProductAssociationRepository {
  replaceAll(associations: readonly ProductAssociationRecord[]): Promise<void>;
  findTopByProductId(productId: string, limit: number): Promise<readonly ProductAssociationRecord[]>;
}
