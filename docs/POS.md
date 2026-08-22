# POS — Point of Sale

## Purpose

The POS bounded context provides in-store retail checkout capabilities for
vendors and stores.

POS must support:

- Multiple vendors
- Multiple stores per vendor
- Multiple registers per store
- Multiple cashiers
- Multiple concurrent shifts
- Barcode scanning
- Product search
- Customer selection
- Discounts
- Coupons
- Taxes
- Split payments
- Cash payments
- Card payments
- MFS payments
- Receipts
- Returns
- Refunds
- Suspended sales
- Offline-aware operation
- End-of-day reconciliation
- Cash drawer management

---

# 1. Bounded Context

POS owns:

- Register
- Cash Drawer
- Shift
- Sale
- Sale Line
- Payment
- Payment Allocation
- Receipt
- Suspended Sale
- POS Session
- Cash Movement
- Reconciliation

POS does NOT own:

- Product catalog
- Inventory master data
- Customer master data
- Vendor master data
- Store master data
- Payment-provider implementation
- Accounting ledger

POS communicates with those contexts through explicit application ports
and domain/integration events.

---

# 2. Architecture

```text
POS
│
├── Domain
│   ├── Aggregates
│   ├── Entities
│   ├── Value Objects
│   ├── Domain Services
│   ├── Domain Events
│   └── Repository Ports
│
├── Application
│   ├── Commands
│   ├── Queries
│   ├── Use Cases
│   ├── DTOs
│   └── Ports
│
├── Infrastructure
│   ├── Persistence
│   ├── Repositories
│   ├── Payment Adapters
│   ├── Receipt Printer
│   └── Barcode Integration
│
└── Presentation
    ├── REST
    └── WebSocket where required
```

---

# 3. Tenant Hierarchy

```text
Platform
   │
   └── Vendor
        │
        └── Store
             │
             ├── Register
             │
             ├── Cash Drawer
             │
             └── POS Shifts
```

Every POS operation must resolve:

```text
tenantId
vendorId
storeId
registerId
cashierId
shiftId
```

Never trust these values directly from the client.

The server derives them from authenticated context and authorized resources.

---

# 4. Register

A register represents a physical or logical POS terminal.

Fields:

- RegisterId
- VendorId
- StoreId
- Name
- Code
- Status
- TerminalIdentifier
- CreatedAt
- UpdatedAt

Status:

```text
ACTIVE
INACTIVE
MAINTENANCE
```

Rules:

- Register belongs to exactly one store.
- Register cannot belong to another vendor's store.
- Register code must be unique within a store.
- Disabled registers cannot start new shifts.
- Register cannot have more than one active shift unless explicitly supported.

---

# 5. Cash Drawer

Each register may have a cash drawer.

States:

```text
CLOSED
OPEN
```

Operations:

- Open drawer
- Close drawer
- Cash in
- Cash out
- Cash adjustment
- Cash count

Every cash movement must create an immutable record.

---

# 6. Shift

A shift represents a cashier's operational session.

Lifecycle:

```text
OPENING
   ↓
OPEN
   ↓
CLOSING
   ↓
CLOSED
```

Fields:

- ShiftId
- RegisterId
- StoreId
- CashierId
- OpeningCash
- ExpectedCash
- ActualCash
- Difference
- OpenedAt
- ClosedAt
- Status

---

# 7. Shift Opening

Opening a shift requires:

```text
cashier + register + store + opening cash
```

Validate:

- User has POS permission.
- User belongs to the store.
- Register belongs to the store.
- Register is active.
- Register does not already have an active shift.
- Opening amount is valid.

Create:

```text
ShiftOpened
```

---

# 8. Shift Closing

Closing a shift must calculate:

```text
Expected Cash =
  Opening Cash
+ Cash Sales
+ Cash In
- Cash Out
- Cash Refunds

Difference = Actual Cash - Expected Cash
```

The cashier must submit an actual cash count.

Never allow the client to directly set expected cash.

## 8.1 Cash Carry-Forward and Loss Adjustments

The register and cash drawer own the physical cash balance. A shift close must
persist retained cash explicitly so the next shift does not infer its opening
balance from a report.

Example, using USD minor units internally:

```text
Completed cash sales       1,000
Cash sent to bank            800
Cash retained in drawer      200
Next shift opening balance   200
```

Cash sent to a bank is an immutable `BANK_DEPOSIT`/`CASH_OUT` movement. It must
include the actor, reason, destination, reference, timestamp, and idempotency
key. It may be recorded during an open shift or as part of closing.

Reports must show total completed sales separately from cash sales, non-cash
sales, refunds, deposits, expected cash, actual cash, variance, and explicit
carry-forward cash.

An administrator may record a loss before the next shift opens. This is an
audited `LOSS_ADJUSTMENT` movement containing the reason, actor, approval, and
before/after amounts. It must not modify the previous shift's closed snapshot.

```text
Previous retained cash       200
Approved loss adjustment      20
Next shift opening balance   180
```

The next opening command references the previous closed shift and persists the
effective opening balance. A loss adjustment cannot exceed the carried cash.

`Shift` owns cash accountability. `POS Session` represents terminal or login
state and must not replace the shift's financial record.

---

# 9. Sale

A POS sale represents an in-store transaction.

Fields:

- SaleId
- SaleNumber
- StoreId
- VendorId
- RegisterId
- ShiftId
- CashierId
- CustomerId?
- Currency
- Subtotal
- Discount
- Tax
- Total
- PaidAmount
- ChangeAmount
- Status
- CreatedAt
- CompletedAt

---

# 10. Sale Lifecycle

```text
OPEN
  ↓
PAYMENT_PENDING
  ↓
COMPLETED
```

Alternative states:

```text
SUSPENDED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

A completed sale must never be edited directly.

Corrections happen through:

- Refund
- Return
- Adjustment

---

# 11. Sale Lines

Each sale line contains a snapshot:

- ProductId
- VariantId
- SKU
- Name
- Quantity
- UnitPrice
- Discount
- Tax
- Total

The sale must retain historical pricing.

Do not calculate historical sale totals from the current catalog.

---

# 12. Product Search

POS requires fast product lookup.

Search by:

- SKU
- Barcode
- Product name
- Variant name
- Internal product code

Search may use Meilisearch, but Meilisearch is not the source of truth.

Before completing the sale, authoritative product and pricing data must be validated.

---

# 13. Barcode Scanner

Barcode input should be treated as keyboard-like input.

Recommended flow:

```text
Scanner
   ↓
POS Client
   ↓
Barcode lookup
   ↓
Product/Variant
   ↓
Add Sale Line
```

Barcode must be normalized before lookup.

Validate:

- Barcode exists
- Product is active
- Variant is sellable
- Store can sell the item
- Price is available

---

# 14. Inventory

POS must not maintain an independent inventory truth.

Sale completion must integrate with Inventory.

Recommended:

```text
POS Sale
   ↓
Inventory Reservation / Deduction
   ↓
Sale Completion
```

Inventory operations must be transactional/idempotent.

Never allow divergent stock views with no reconciliation mechanism:

```text
POS says stock = 5
Inventory says stock = 2
```

---

# 15. Customer Selection

Customer selection is optional for eligible sales.

POS may support:

- Guest customer
- Registered customer
- Phone lookup
- Customer search
- Customer creation

Customer data is owned by the Customer bounded context.

POS stores only the required reference/snapshot.

---

# 16. Pricing

POS uses the centralized Pricing domain/application service.

The frontend must never determine final totals.

Server calculates:

```text
Subtotal
+ Tax
+ Shipping if applicable
- Discount
- Coupon
= Total
```

Money must use integer minor units.

Example:

```text
BDT 100.50 → 10050 poisha
```

Never use floating-point arithmetic for money.

---

# 17. Discounts

Support:

- Line discount
- Sale-level discount
- Percentage discount
- Fixed amount discount
- Authorized cashier discount

Every discount must record:

- type
- amount
- reason
- actor
- timestamp

High-value discounts may require elevated permission.

---

# 18. Coupons

Coupon validation must occur server-side.

Validate:

- Coupon exists
- Active
- Not expired
- Usage limit
- Customer eligibility
- Store eligibility
- Vendor eligibility
- Product eligibility
- Minimum order
- Maximum discount

Coupon usage must be idempotent.

---

# 19. Taxes

Taxes must be calculated server-side.

Sale lines should retain tax snapshots:

```text
TaxRate
TaxAmount
TaxRuleReference
```

Historical sales must not change if tax configuration changes later.

---

# 20. Payments

POS supports multiple payment methods:

```text
CASH
CARD
BKASH
NAGAD
SSLCOMMERZ
OTHER
```

Payment methods must be pluggable.

---

# 21. Split Payments

A sale may have multiple payment allocations.

Example:

```text
Total = 1000 BDT

Cash       = 400
bKash      = 300
Card       = 300
----------------
Total Paid = 1000
```

Payment allocation must satisfy `sum(allocations) = sale.total` unless the transaction explicitly supports overpayment/change.

---

# 22. Payment State

Each payment has:

```text
PENDING
AUTHORIZED
CAPTURED
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

A sale becomes COMPLETED only when the required payment amount is successfully captured.

---

# 23. Cash Payment

For cash:

```text
Amount Due
Cash Received
Change
```

Example:

```text
Due:       850
Received: 1000
Change:     150
```

Change must be calculated by the backend.

---

# 24. Card / MFS Payment

External payment providers must implement a common interface:

```typescript
interface PosPaymentProvider {
  authorize(input: PaymentRequest): Promise<PaymentResult>;
  capture(input: CaptureRequest): Promise<PaymentResult>;
  refund(input: RefundRequest): Promise<RefundResult>;
}
```

Never place provider-specific logic inside the Sale aggregate.

---

# 25. Receipt

Receipt must contain:

- Store
- Store address
- Receipt number
- Sale number
- Date/time
- Cashier
- Register
- Items
- Quantity
- Unit price
- Discount
- Tax
- Total
- Payment methods
- Paid amount
- Change
- Customer

Receipt generation should be asynchronous where possible.

---

# 26. Receipt Printing

Support:

- Browser printing
- Thermal printer
- PDF receipt
- Email receipt

Printer failures must not corrupt the completed sale.

```text
Sale completed
     ↓
ReceiptRequested
     ↓
Print job
```

If printing fails:

- Sale remains COMPLETED
- Print job becomes FAILED

---

# 27. Suspend / Resume Sale

Cashier can suspend an open sale.

```text
OPEN → SUSPENDED → OPEN
```

Suspended sales must be isolated to the appropriate:

- store
- register
- cashier

depending on business policy.

---

# 28. Refunds

Refunds must reference the original sale.

Never create a negative sale as the only refund mechanism.

Refund must contain:

- OriginalSaleId
- RefundId
- Items
- Quantities
- Amount
- Reason
- Actor
- PaymentMethod
- Status

Prevent over-refunding: `RefundedQuantity <= SoldQuantity`.

---

# 29. Returns

Returns are different from refunds.

```text
Return
  ↓
Inventory inspection
  ↓
Inventory adjustment
  ↓
Refund
```

Returned inventory must only become sellable after the appropriate inspection process.

---

# 30. Offline Mode

Offline POS must be explicitly designed.

Do not assume the normal online architecture automatically works offline.

Offline client may maintain:

- local product cache
- local pricing snapshot
- local open cart
- pending sales

Every offline transaction receives a `clientTransactionId`.

When reconnecting:

```text
Offline Transaction
       ↓
Sync API
       ↓
Idempotency Check
       ↓
Server Validation
       ↓
Inventory Validation
       ↓
Sale Completion
```

Offline mode must have clearly defined inventory-risk limits.

---

# 31. Idempotency

Critical POS commands require idempotency.

Examples:

- complete sale
- capture payment
- refund payment
- cash movement
- shift closing
- offline sync

Use `Idempotency-Key` or an equivalent command identifier.

Repeated requests must return the original result instead of creating duplicates.

---

# 32. Concurrency

POS must handle:

- Multiple registers
- Multiple cashiers
- Multiple sales
- Concurrent inventory changes
- Concurrent payment callbacks

Database transactions are authoritative.

Redis locks must not replace database correctness.

---

# 33. Domain Events

POS events include:

```text
RegisterCreated
RegisterActivated
RegisterDeactivated

ShiftOpened
ShiftClosed
CashMovementRecorded
SaleRecorded

SaleCreated
SaleSuspended
SaleResumed
SaleCompleted
SaleCancelled

PaymentStarted
PaymentCaptured
PaymentFailed
PaymentRefunded

RefundCreated
RefundCompleted

CashAdded
CashRemoved
CashAdjusted

ReceiptRequested
ReceiptPrinted
ReceiptPrintFailed
```

---

# 34. Integration Events

POS may consume:

- ProductUpdated
- PriceUpdated
- InventoryChanged
- StoreSuspended
- VendorSuspended
- CustomerUpdated

POS may publish:

- SaleCompleted
- PosPaymentCaptured
- PosRefundCompleted

---

# 35. API

Base: `/api/v1/pos`

Registers:

```text
GET    /registers
POST   /registers
GET    /registers/:id
PATCH  /registers/:id
```

Shifts:

```text
POST   /shifts/open
GET    /shifts/current
POST   /shifts/:id/close
```

Sales:

```text
POST   /sales
GET    /sales/:id
POST   /sales/:id/items
PATCH  /sales/:id/items/:itemId
DELETE /sales/:id/items/:itemId
POST   /sales/:id/suspend
POST   /sales/:id/resume
POST   /sales/:id/complete
```

Payments:

```text
POST   /sales/:id/payments
POST   /sales/:id/payments/:paymentId/capture
POST   /sales/:id/refund
```

Products:

```text
GET /products/search
GET /products/barcode/:barcode
```

Cash:

```text
POST /cash/in
POST /cash/out
POST /cash/adjust
POST /cash/deposit
```

Reports:

```text
GET /shifts/:id/summary
GET /registers/:id/summary
GET /reports/end-of-day
```

---

# 36. Permissions

Recommended permissions:

```text
pos.register.read
pos.register.manage

pos.shift.open
pos.shift.close

pos.sale.create
pos.sale.read
pos.sale.cancel
pos.sale.suspend
pos.sale.resume
pos.sale.complete

pos.discount.apply
pos.discount.override

pos.payment.create
pos.payment.refund

pos.return.create

pos.cash.read
pos.cash.manage
pos.cash.deposit
pos.cash.adjust

pos.report.read
```

---

# 37. Role Matrix

**Platform Admin**

Full POS access.

**Vendor Owner**

Access to POS resources belonging to their vendor.

**Store Manager**

Access to assigned stores.

**Store Staff**

Access to operational POS functions.

**Cashier**

Restricted to:

- Current register
- Current shift
- Sales
- Payments
- Allowed discounts
- Basic customer lookup

Cashiers must not:

- Change system pricing
- Change tax configuration
- Modify inventory arbitrarily
- Approve their own high-value refunds
- Close another cashier's shift

---

# 38. Audit

Audit:

- Login
- Register changes
- Shift opening
- Shift closing
- Bank deposits and cash removals
- Discount overrides
- Price overrides
- Refunds
- Returns
- Cash adjustments
- Opening balance loss adjustments
- Manual inventory adjustments
- Permission changes

---

# 39. Database Rules

POS tables must include appropriate ownership references:

```text
vendor_id
store_id
register_id
shift_id
```

Use foreign keys and constraints.

Money: never `DOUBLE`.

Status fields should use controlled values.

Use unique constraints for:

```text
sale_number
receipt_number
register.code + store_id
idempotency_key
client_transaction_id
```

Cash movement records must be append-only and include ownership scope, shift,
actor, movement kind, amount in integer minor units, currency, reason, and
idempotency key. Bank deposits additionally include destination, reference,
and confirmation status. Opening balance adjustments retain before and after
values and audit metadata.

---

# 40. Testing

## Unit

- Sale calculations
- Discount rules
- Tax rules
- Payment allocation
- Change calculation
- Shift calculation
- State transitions
- Refund rules

## Integration

- PostgreSQL
- Inventory
- Pricing
- Customer
- Payment
- RLS

## E2E

```text
Login
→ Open Register
→ Open Shift
→ Scan Product
→ Add Customer
→ Apply Discount
→ Split Payment
→ Complete Sale
→ Print Receipt
→ Close Shift
→ Reconcile Cash
```

---

# 41. Definition of Done

- [ ] Domain implemented
- [ ] Application use cases implemented
- [ ] Persistence implemented
- [ ] API implemented
- [ ] Authorization implemented
- [ ] RLS verified
- [ ] Idempotency implemented
- [ ] Inventory integration implemented
- [ ] Payment integration implemented
- [ ] Receipt workflow implemented
- [ ] Refund workflow implemented
- [ ] Audit logging implemented
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Architecture checks pass
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Production build passes
