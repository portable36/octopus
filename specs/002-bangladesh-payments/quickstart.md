# Quickstart & Verification Guide: Local Bangladesh Payment Gateways

**Feature**: `002-bangladesh-payments`  
**Date**: 2026-09-05

## 1. Automated Test Suites

Run focused test suites covering all gateway adapters, handlers, and controllers:

```powershell
# Run payment gateway domain & adapter tests
npm.cmd run test -- backend/src/modules/payment

# Run order & checkout integration tests
npm.cmd run test -- backend/src/modules/checkout backend/src/modules/order

# Full repository validation
npm.cmd run validate
```

---

## 2. Key Scenarios for Verification

### Scenario 1: bKash Hosted Checkout & Capture
1. Create a checkout session with `paymentMethod='BKASH'`.
2. Call `POST /payments/:paymentIntentId/initiate-session`.
3. Verify that `redirectUrl` is returned and `PaymentIntent` is in `REQUIRES_PAYMENT`.
4. Send bKash webhook callback (`POST /payments/gateways/bkash/callback`) with `paymentID` and `status='success'`.
5. Verify `PaymentIntent` transitions to `CAPTURED`, transaction is created, and `OrderPort.markPaidFromPayment` marks the order `PAID`.
6. Verify duplicate callback returns success without re-executing order payment.

### Scenario 2: SSLCommerz Session & Validation
1. Create a checkout session with `paymentMethod='SSLCOMMERZ'`.
2. Initiate gateway session; verify SSLCommerz `GatewayPageURL`.
3. Submit IPN notification with `val_id` and `tran_id`.
4. Verify secondary server-to-server query validates payment and marks payment `CAPTURED`.

### Scenario 3: Nagad Direct Session & Verification
1. Create a checkout session with `paymentMethod='NAGAD'`.
2. Initiate gateway session; verify callback URL.
3. Submit callback with `payment_ref_id` and verify status is `CAPTURED`.

### Scenario 4: Refund via Gateway
1. Call `POST /payments/:paymentIntentId/refunds` on a captured bKash payment intent.
2. Verify provider's refund transaction ID is captured on `payment_refunds`.
