import {
  createVendorProduct,
  getStoreAvailability,
  getVendorProduct,
  listCatalogCategories,
  listProductVariants,
  listStoreOffers,
  listStoreWarehouses,
  type CatalogCategory,
  type StockAvailability,
  type StoreOffer,
  type VendorProduct,
  type VendorVariant,
  type WarehouseSummary,
} from '@/lib/vendor-api';

export const DRAFT_PRODUCT_NAME = 'Untitled product';

export type ProductEditorSection = 'general' | 'pricing' | 'media' | 'inventory' | 'publish';

export type ProductMediaDraft = {
  mediaId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductEditorState = {
  product: VendorProduct;
  variants: VendorVariant[];
  offers: StoreOffer[];
  categories: CatalogCategory[];
  warehouses: WarehouseSummary[];
  availability: StockAvailability | null;
  storeId: string | null;
};

export function createDraftSku(): string {
  return `draft-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createDraftVendorProduct(vendorId: string): Promise<VendorProduct> {
  return createVendorProduct({
    vendorId,
    sku: createDraftSku(),
    name: DRAFT_PRODUCT_NAME,
  });
}

export function getDefaultVariant(variants: readonly VendorVariant[]): VendorVariant | null {
  return variants[0] ?? null;
}

export function getPrimaryMedia(
  media: readonly ProductMediaDraft[] | VendorProduct['media'],
): ProductMediaDraft | null {
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.find((item) => item.isPrimary) ?? sorted[0] ?? null;
}

export function normalizeProductMedia(media: VendorProduct['media']): ProductMediaDraft[] {
  return [...media]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({
      mediaId: item.mediaId,
      mediaType: item.mediaType,
      isPrimary: item.isPrimary,
      sortOrder: index,
    }));
}

export async function loadProductEditorState(
  productId: string,
  storeId: string | null,
): Promise<ProductEditorState> {
  const [product, categories] = await Promise.all([
    getVendorProduct(productId),
    listCatalogCategories().catch(() => [] as CatalogCategory[]),
  ]);
  const variants = await listProductVariants(productId).catch(() => [] as VendorVariant[]);

  let offers: StoreOffer[] = [];
  let warehouses: WarehouseSummary[] = [];
  let availability: StockAvailability | null = null;

  if (storeId) {
    [offers, warehouses] = await Promise.all([
      listStoreOffers(storeId, productId).catch(() => [] as StoreOffer[]),
      listStoreWarehouses(storeId).catch(() => [] as WarehouseSummary[]),
    ]);
    const defaultVariant = getDefaultVariant(variants);
    if (defaultVariant) {
      availability = await getStoreAvailability(storeId, defaultVariant.id).catch(() => null);
    }
  }

  return {
    product,
    variants,
    offers,
    categories: categories.filter((category) => category.status !== 'ARCHIVED'),
    warehouses,
    availability,
    storeId,
  };
}

export type PublishCheckItem = {
  id: string;
  label: string;
  met: boolean;
  optional?: boolean;
};

export function buildPublishChecklist(state: {
  product: VendorProduct;
  variants: readonly VendorVariant[];
  offers: readonly StoreOffer[];
  availability: StockAvailability | null;
  storeId: string | null;
}): PublishCheckItem[] {
  const defaultVariant = getDefaultVariant(state.variants);
  const storeOffer =
    defaultVariant != null
      ? state.offers.find((offer) => offer.variantId === defaultVariant.id)
      : undefined;
  const hasPrimaryImage = state.product.media.some((item) => item.isPrimary);

  return [
    {
      id: 'name',
      label: 'Product name set',
      met:
        state.product.name.trim() !== DRAFT_PRODUCT_NAME && state.product.name.trim().length >= 3,
    },
    {
      id: 'category',
      label: 'At least one category',
      met: state.product.categoryIds.length > 0,
    },
    {
      id: 'variant',
      label: 'Default variant active',
      met: defaultVariant?.status.toLowerCase() === 'active',
    },
    {
      id: 'offer',
      label: 'Active store offer for selected store',
      met: state.storeId != null && storeOffer?.status === 'active',
    },
    {
      id: 'image',
      label: 'Primary image attached',
      met: hasPrimaryImage,
    },
    {
      id: 'stock',
      label: 'Stock available (recommended)',
      met: (state.availability?.available ?? 0) > 0,
      optional: true,
    },
  ];
}

export function isVariantActive(status: string): boolean {
  return status.toLowerCase() === 'active';
}

export function isOfferActive(offer: StoreOffer | undefined): boolean {
  return offer?.status === 'active';
}
