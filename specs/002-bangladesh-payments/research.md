# Technical Research: Local Bangladesh Payment Gateways

**Feature**: `002-bangladesh-payments`  
**Date**: 2026-09-05

## 1. Gateway Specifications & Protocols

### 1.1 SSLCommerz
- **Integration Model**: Hosted Payment Gateway with Redirection.
- **Base URLs**:
  - Sandbox: `https://sandbox.sslcommerz.com`
  - Production: `https://securepay.sslcommerz.com`
- **Session Initiation (`POST /gwprocess/v4/api.php`)**:
  - Parameters: `store_id`, `store_passwd`, `total_amount`, `currency='BDT'`, `tran_id` (internal paymentIntentId), `success_url`, `fail_url`, `cancel_url`, `ipn_url`.
  - Response: `{ status: "SUCCESS", GatewayPageURL: "https://..." }`.
- **Secondary Server-to-Server Validation (`GET /validator/api/validationserverAPI.php`)**:
  - Query parameters: `val_id`, `store_id`, `store_passwd`, `format='json'`.
  - Required checks: `status` equals `VALID` or `VALIDATED`, `currency_amount` matches internal `amountMinor / 100`, `currency_type` equals `BDT`, `tran_id` matches internal payment intent ID.
- **Refund API (`GET /validator/api/merchantTransIDvalidationAPI.php`)**:
  - Query parameters: `bank_tran_id`, `refund_amount`, `refund_remarks`, `store_id`, `store_passwd`, `format='json'`.

### 1.2 bKash (Tokenized Checkout v1.2.0-beta)
- **Integration Model**: Merchant Tokenized Checkout API.
- **Base URLs**:
  - Sandbox: `https://tokenized.sandbox.bka.sh/v1.2.0-beta`
  - Production: `https://tokenized.pay.bka.sh/v1.2.0-beta`
- **Token Grant (`POST /tokenized/checkout/token/grant`)**:
  - Headers: `username`, `password`.
  - Body: `{ app_key, app_secret }`.
  - Response: `{ id_token, token_type: "Bearer", refresh_token }`. Cached in Redis with TTL.
- **Payment Creation (`POST /tokenized/checkout/create`)**:
  - Headers: `Authorization: <id_token>`, `X-APP-Key`.
  - Body: `{ mode: '0011', payerReference, callbackURL, amount, currency: 'BDT', intent: 'sale', merchantInvoiceNumber }`.
  - Response: `{ paymentID, bkashURL, statusMessage: "Successful" }`.
- **Payment Execution (`POST /tokenized/checkout/execute`)**:
  - Headers: `Authorization: <id_token>`, `X-APP-Key`.
  - Body: `{ paymentID }`.
  - Response: `{ paymentID, trxID, transactionStatus: "Completed", amount, currency }`.
- **Payment Query / Secondary Validation (`GET /tokenized/checkout/payment/search/{paymentID}`)**:
  - Verifies completed status and captures `trxID`.
- **Refund API (`POST /tokenized/checkout/payment/refund`)**:
  - Body: `{ paymentID, trxID, amount, sku, reason }`.

### 1.3 Nagad (Direct Merchant Integration)
- **Integration Model**: Sensitive Data Encrypted Direct Merchant API.
- **Base URLs**:
  - Sandbox: `http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs`
  - Production: `https://api.mynagad.com/api/dfs`
- **Session Initiation (`POST /check-out/initialize/{merchantId}/{orderId}`)**:
  - Cryptographic handshake using RSA private key to generate signature.
  - Returns sensitive data token and `callBackUrl`.
- **Verification (`GET /check-out/verify/{paymentRefId}`)**:
  - Secondary verification confirms `status: "Success"`, amount, and transaction identifier.
- **Refund API (`POST /check-out/refund`)**:
  - Initiates gateway refund returning refund transaction ID.

---

## 2. Replay Prevention & Concurrency Control

In high-concurrency e-commerce environments, payment webhooks and user return redirects may arrive concurrently.
- **Redis Replay Guard**:
  ```typescript
  const lockKey = `payment:replay:${provider}:${providerTransactionId}`;
  const acquired = await redis.set(lockKey, 'locked', 'EX', 86400, 'NX');
  if (!acquired) {
    // Already processed or processing: return idempotent OK immediately
    return { status: 'DUPLICATE_IGNORED' };
  }
  ```
- **Transaction Isolation**:
  The external gateway verification HTTP call happens **before** opening the database transaction. Once verified, the database transaction atomically:
  1. Records `PaymentTransactionOrmEntity`.
  2. Updates `PaymentIntent` status to `CAPTURED`.
  3. Calls `OrderPort.markPaidFromPayment`.
  4. Appends `PaymentCaptured` event to `payment_outbox`.

---

## 3. Dual-Mode Mock & Simulation Architecture

To ensure 100% test reproducibility without external bank sandbox dependencies:
- When credentials (`SSLCOMMERZ_STORE_ID`, `BKASH_APP_KEY`, `NAGAD_MERCHANT_ID`) are missing or when `PAYMENT_GATEWAY_MODE=sandbox-mock`:
  - `SslCommerzGatewayAdapter`, `BkashGatewayAdapter`, and `NagadGatewayAdapter` operate in **Simulated Mode**.
  - `initializeSession` returns a deterministic simulated redirect URL:
    `/checkout/mock-gateway?provider=SSLCOMMERZ&intentId=<id>&amount=<amt>`
  - Secondary verification queries for mock transaction IDs return simulated `SUCCESS` responses with exact matching amounts.
- When credentials are provided and `PAYMENT_GATEWAY_MODE=live` or `sandbox`, the adapters make real outbound HTTPS calls using Node.js fetch with configured timeouts and retry backoff.
