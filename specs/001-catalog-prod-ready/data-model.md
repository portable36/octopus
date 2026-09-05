# Data Model & Schema Changes: Catalog Production Readiness

## Overview

This document specifies the schema, entity mappings, and cross-module snapshot enhancements for the Catalog hardening.

---

## 1. Variant ORM Entity (`catalog_variants`)

### Modified Fields in `VariantOrmEntity`:

```typescript
@Entity({ tableName: 'catalog_variants' })
@Unique({ properties: ['vendorId', 'sku'] })
@Index({ properties: ['vendorId', 'barcode'] })
export class VariantOrmEntity {
  // Existing fields ...
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property()
  sku!: string;

  @Property()
  name!: string;

  @Property({ nullable: true })
  barcode: string | null = null;

  // New Physical Attributes Columns:
  @Property({ fieldName: 'weight_grams', nullable: true })
  weightGrams: number | null = null;

  @Property({ fieldName: 'length_mm', nullable: true })
  lengthMm: number | null = null;

  @Property({ fieldName: 'width_mm', nullable: true })
  widthMm: number | null = null;

  @Property({ fieldName: 'height_mm', nullable: true })
  heightMm: number | null = null;

  // Existing pricing, status, json columns ...
}
```

---

## 2. Cross-Module Snapshot (`CatalogStoreOfferSnapshot`)

In `backend/src/shared-kernel/application/ports/catalog-store-offer-access.port.ts`:

```typescript
export interface CatalogStoreOfferSnapshot {
  readonly offerId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly status: string;
  readonly isAvailable: boolean;
  // Enhanced sellability attributes:
  readonly productStatus: string;
  readonly variantStatus: string;
  readonly isSellable: boolean;
}
```

### Snapshot Derivation:

- `isSellable = status === 'active' && isAvailable && productStatus === 'published' && variantStatus === 'ACTIVE'`

---

## 3. Transactional Outbox Integration (`catalog_outbox`)

### Schema Table: `catalog_outbox`

- `id` (UUID)
- `aggregate_id` (UUID)
- `event_type` (VARCHAR)
- `payload_json` (JSONB)
- `event_version` (INT)
- `created_at` (TIMESTAMP)
- `published_at` (TIMESTAMP, NULL)
- `retry_count` (INT)

### New Producers:

- `CategoryRepositoryAdapter.save()` appends events:
  - `CategoryCreated`
  - `CategoryRenamed`
  - `CategoryMoved`
  - `CategorySeoUpdated`
  - `CategoryArchived`
    Each event is appended to `catalog_outbox` in the same PostgreSQL transaction via `appendCatalogOutbox(tx, category.id.value, category.getUncommittedEvents())`.

---

## 4. Entity State Transitions

### Product Lifecycle

```
[DRAFT] <-----> [PENDING_REVIEW] -----> [PUBLISHED] -----> [ARCHIVED]
   |                                        |
   +----------------------------------------+---> cannot be published if active variants == 0
```

### Variant Lifecycle

```
[DRAFT] <-----> [ACTIVE] -----> [ARCHIVED] / [DISCONTINUED]
```

### Store Offer Lifecycle

```
[DRAFT] -----> [ACTIVE] <-----> [SUSPENDED]
                 ^
                 | (Only allowed when Product == PUBLISHED and Variant == ACTIVE)
```
