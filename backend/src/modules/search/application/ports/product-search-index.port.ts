/** Re-export shared-kernel search index port for Search module consumers. */
export {
  PRODUCT_SEARCH_INDEX,
  type ProductSearchIndexPort,
  type OfferSearchDocumentDto as OfferSearchDocument,
  type SearchProductsQueryDto as SearchProductsQuery,
  type SearchProductsResultDto as SearchProductsResult,
} from '../../../../shared-kernel/application/ports/product-search-index.port';
