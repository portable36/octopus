# Octopus

Multi-vendor, multi-store commerce platform: independent merchants sell through stores under platform governance, with strict tenant isolation and money-safe operations.

## Language

### Tenancy and actors

**Platform**:
The operator that onboards vendors, sets global policy, and may act with elevated scope.
_Avoid_: Admin tenant, system company

**Vendor**:
An independent merchant with its own staff, catalog ownership, stores, and financial relationship to the platform.
_Avoid_: Seller, merchant account, shop owner (when meaning the legal merchant)

**Store**:
A selling location or channel owned by a Vendor; offers, inventory, and staff may be scoped to it.
_Avoid_: Shop, outlet, branch (unless quoting UI copy)

**Customer**:
A buyer who places orders on the marketplace.
_Avoid_: Client, buyer account, end user (when meaning the buyer specifically)

**User**:
An authenticated identity that may hold platform, vendor, or store roles.
_Avoid_: Account (ambiguous), principal (prefer in authz internals only)

**Membership**:
The assignment of a User to a Vendor or Store (or platform scope) with a role.
_Avoid_: Permission grant (when meaning org membership)

### Catalog and offers

**Product**:
Vendor-owned catalog item definition (may have variants).
_Avoid_: Item, listing (when meaning the product itself)

**Variant / SKU**:
A sellable variation of a Product with its own identifiers and stock identity.
_Avoid_: Option, child product

**Store offer**:
The Vendor/Store-specific price and availability for a SKU at a Store.
_Avoid_: Listing price alone, product price (when store-specific)

### Commerce flow

**Cart**:
A Customer's (or guest's) mutable selection of Store offers before checkout.
_Avoid_: Basket, bag

**Checkout**:
The authoritative transition from Cart to Order, including totals, reservations, and payment initiation.
_Avoid_: Place order (as a synonym for the whole checkout pipeline)

**Order**:
The Customer's purchase commitment; may split into vendor-scoped fulfillment units.
_Avoid_: Transaction, purchase, sale (when meaning the order aggregate)

**Sub-order**:
The Vendor-scoped slice of an Order used for fulfillment and vendor accounting.
_Avoid_: Line group, vendor order (unless matching UI)

**Reservation**:
A temporary hold of inventory for a Cart or Checkout attempt.
_Avoid_: Soft lock, stock hold (informal)

### Money and compliance

**Paisa**:
Integer minor-unit money representation used for calculations (no floating-point currency math).
_Avoid_: Decimal money, float amount

**Payment**:
A recorded attempt or capture of funds for an Order via a payment provider or MFS.
_Avoid_: Charge (unless provider-specific), transaction (ambiguous)

**Refund**:
A reversal of a prior Payment (full or partial) under explicit policy.
_Avoid_: Chargeback (that is a distinct dispute path)

**Commission**:
Platform fee calculated on a Vendor's sale.
_Avoid_: Cut, marketplace fee (informal)

**Payout**:
Settlement of a Vendor's earned balance to the Vendor.
_Avoid_: Withdrawal, disbursement (unless policy docs use them)

**Reconciliation**:
Scheduled matching of internal payment/ledger records against gateway settlement reports; mismatches are tracked until resolved.
_Avoid_: Manual spot-check only, assuming webhooks are always correct

**Payment saga**:
A coordinated multi-step payment flow where each debit has a defined compensating action if a later credit step fails.
_Avoid_: Fire-and-forget debits, hoping the provider confirms later

### Isolation and change

**Tenant scope**:
The active Vendor/Store/platform boundary for authorization and data access on a request.
_Avoid_: Tenant id alone (when meaning the full scope)

**RLS session**:
Database row-level security variables set from Tenant scope so SQL cannot leak across Vendors/Stores.
_Avoid_: Soft delete filter (different concern)

**Idempotency key**:
Client-supplied key that makes a mutation safe to retry without duplicate side effects.
_Avoid_: Request id (correlation is different)

**Outbox event**:
A domain event persisted in the same transaction as the write, then published asynchronously.
_Avoid_: Direct emit from HTTP handler as source of truth

### Media

**Presigned upload**:
A short-lived storage credential that lets a client PUT an object directly to object storage without sending the file body through the application API.
_Avoid_: Proxy upload, backend multipart file handler (as the normal path)

**Magic-byte validation**:
Confirming file type by inspecting file headers/content signatures rather than trusting the filename extension or client MIME type.
_Avoid_: Extension-only checks

**Upload session**:
A server-tracked multipart (and optionally resumable) upload lifecycle from initiate through complete or abort.
_Avoid_: One-shot anonymous PUT with no ownership record
