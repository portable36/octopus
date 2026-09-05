# Quickstart & Verification: Catalog Production Readiness

## Overview

This quickstart outlines how to test and verify the hardened Catalog bounded context.

---

## 1. Automated Test Execution

Run the narrow catalog test suite:

```bash
npm.cmd run test -- backend/src/modules/catalog
```

Run cross-module cart tests to verify sellability enforcement:

```bash
npm.cmd run test -- backend/src/modules/cart
```

Run full validation gate:

```bash
npm.cmd run validate
```

---

## 2. Key Scenarios to Verify

### Scenario A: Multi-Point Sellability

1. Create a Product in `DRAFT`.
2. Create a Variant for the product in `ACTIVE` status.
3. Create a Store Offer for the variant.
4. Attempt `POST /api/v1/store-offers/:id/activate`. Verify rejection with `OFFER_NOT_SELLABLE`.
5. Publish the product (`POST /api/v1/products/:id/publish`).
6. Activate the Store Offer. Verify success.
7. Attempt adding to cart via `POST /api/v1/cart/items`. Verify success.
8. Unpublish the product (`POST /api/v1/products/:id/unpublish`).
9. Call `POST /api/v1/cart/validate`. Verify line item issue `OFFER_UNAVAILABLE` is raised and checkout is blocked.

### Scenario B: Negative Authorization Checks

1. Call `POST /api/v1/products` with a token having only `CUSTOMER` role. Verify `403 Forbidden`.
2. Call `POST /api/v1/products` with vendor staff belonging to Vendor A with Vendor B payload. Verify `403 Forbidden`.
3. Call `POST /api/v1/categories` with non-admin token. Verify `403 Forbidden`.

### Scenario C: Barcode Collision Prevention

1. Create Variant 1 with barcode `"1122334455"`.
2. Create Variant 2 with barcode `"1122334455"` under the same vendor. Verify rejection with `409 Conflict` (`BARCODE_ALREADY_EXISTS`).

### Scenario D: Physical Attributes Persistence

1. Create Variant with `weightGrams: 500` and `dimensions: { lengthMillimeters: 100, widthMillimeters: 200, heightMillimeters: 50 }`.
2. Fetch variant via authoring endpoint. Verify exact physical attributes are returned.
