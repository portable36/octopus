# API Contracts: Catalog Production Readiness

## 1. Category Management Endpoints

### `GET /api/v1/categories/:id`

- **Auth**: Requires `PLATFORM_ADMIN` or vendor staff role with `catalog.product.read`
- **Response**: `200 OK`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Electronics",
  "slug": "electronics",
  "parentId": null,
  "status": "active",
  "sortOrder": 0,
  "seo": {
    "title": "Electronics & Gadgets",
    "description": "Browse premium gadgets"
  }
}
```

### `PATCH /api/v1/categories/:id`

- **Auth**: `@RequirePermissions('platform.admin')`
- **Request Body**:

```json
{
  "name": "Smart Electronics",
  "parentId": "00000000-0000-0000-0000-000000000000",
  "sortOrder": 1,
  "seo": {
    "title": "Smart Gadgets",
    "description": "Updated SEO description"
  }
}
```

- **Responses**:
  - `200 OK`: Returns updated Category DTO
  - `400 Bad Request`: Cycle detected (e.g. attempting to move category under its own child)
  - `403 Forbidden`: Caller lacks platform admin permission
  - `404 Not Found`: Category or new parent does not exist

---

## 2. Store Offer Activation

### `POST /api/v1/store-offers/:id/activate`

- **Auth**: `@RequirePermissions('catalog.product.update')` + vendor staff scope
- **Behavior**:
  - Verifies parent `Product` is in `published` status.
  - Verifies referenced `Variant` is in `ACTIVE` status.
- **Responses**:
  - `200 OK`: Offer status transitioned to `active`
  - `400 Bad Request`: `{"code": "OFFER_NOT_SELLABLE", "message": "Cannot activate offer: product must be published and variant must be active."}`
  - `403 Forbidden`: Unauthorized caller or cross-vendor attempt
  - `404 Not Found`: Offer not found

---

## 3. Variant Creation / Mutation with Barcode

### `POST /api/v1/products/:productId/variants`

- **Auth**: `@RequirePermissions('catalog.product.create')` + vendor staff scope
- **Request Body Additions**:

```json
{
  "name": "Midnight Black / 256GB",
  "sku": "MB-256",
  "barcode": "8901234567890",
  "weightGrams": 250,
  "dimensions": {
    "lengthMillimeters": 150,
    "widthMillimeters": 75,
    "heightMillimeters": 9
  }
}
```

- **Responses**:
  - `201 Created`: Returns created Variant DTO including physical dimensions and weight
  - `409 Conflict`: `{"code": "BARCODE_ALREADY_EXISTS", "message": "Barcode already registered for this vendor."}`
  - `403 Forbidden`: Lacks creation permission or cross-vendor attempt

---

## 4. Public Product Detail Page (Storefront)

### `GET /api/v1/public/products/:productId`

- **Auth**: Public (`@Public()`)
- **Behavior**:
  - Returns `200 OK` ONLY for `published` products.
  - `variants` array contains ONLY variants in `ACTIVE` status (draft or archived variants filtered out).
  - `offers` array contains ONLY offers for ACTIVE variants with `isAvailable === true` and `status === 'active'`.
  - Excludes all internal vendor cost prices, supplier notes, and private metadata.
