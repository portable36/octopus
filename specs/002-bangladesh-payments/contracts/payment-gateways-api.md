# API Contracts: Local Bangladesh Payment Gateways

**Feature**: `002-bangladesh-payments`  
**Date**: 2026-09-05

## 1. Storefront / Client Endpoints

### 1.1 Initiate Gateway Session (`POST /api/v1/payments/:paymentIntentId/initiate-session`)
Used by the storefront during online checkout when `paymentMethod` is `SSLCOMMERZ`, `BKASH`, or `NAGAD`.

**Request**:
```http
POST /api/v1/payments/c1d88bb4-0000-4000-8000-000000000001/initiate-session HTTP/1.1
Content-Type: application/json
Authorization: Bearer <customer_or_checkout_token>

{}
```

**Response (200 OK)**:
```json
{
  "paymentIntentId": "c1d88bb4-0000-4000-8000-000000000001",
  "paymentMethod": "BKASH",
  "status": "REQUIRES_PAYMENT",
  "amountMinor": 150000,
  "currencyCode": "BDT",
  "redirectUrl": "https://tokenized.sandbox.bka.sh/v1.2.0-beta/checkout?paymentID=PID12345678"
}
```

---

## 2. Public Gateway Webhook / Callback Endpoints

Public endpoints unauthenticated by user bearer tokens, secured by gateway parameters, IPN payload validation, and server-to-server secondary verification.

### 2.1 SSLCommerz Callback (`POST /api/v1/payments/gateways/sslcommerz/callback`)
Receives customer return from SSLCommerz.

**Request (Form URL Encoded or JSON)**:
```http
POST /api/v1/payments/gateways/sslcommerz/callback HTTP/1.1
Content-Type: application/x-www-form-urlencoded

tran_id=c1d88bb4-0000-4000-8000-000000000001&val_id=260905123456&status=VALID&amount=1500.00&currency=BDT&bank_tran_id=SSL123456789
```

**Response (302 Redirect or 200 OK)**:
Redirects browser to storefront order status page `/checkout/payment-return?orderId=...&status=PAID` or returns:
```json
{
  "success": true,
  "paymentIntentId": "c1d88bb4-0000-4000-8000-000000000001",
  "status": "CAPTURED",
  "providerTransactionId": "SSL123456789"
}
```

### 2.2 SSLCommerz IPN (`POST /api/v1/payments/gateways/sslcommerz/ipn`)
Background server-to-server notification from SSLCommerz.

**Response (200 OK)**:
```json
{
  "received": true
}
```

### 2.3 bKash Callback (`POST /api/v1/payments/gateways/bkash/callback`)
Receives customer return or server webhook from bKash.

**Request (JSON / Query)**:
```http
POST /api/v1/payments/gateways/bkash/callback HTTP/1.1
Content-Type: application/json

{
  "paymentID": "PID12345678",
  "status": "success",
  "apiVersion": "v1.2.0-beta"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "paymentIntentId": "c1d88bb4-0000-4000-8000-000000000001",
  "status": "CAPTURED",
  "trxID": "TRX987654321"
}
```

### 2.4 Nagad Callback (`POST /api/v1/payments/gateways/nagad/callback`)
Receives customer return or server webhook from Nagad.

**Request (JSON / Query)**:
```http
POST /api/v1/payments/gateways/nagad/callback HTTP/1.1
Content-Type: application/json

{
  "payment_ref_id": "NAGAD_REF_12345",
  "status": "Success",
  "order_id": "c1d88bb4-0000-4000-8000-000000000001"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "paymentIntentId": "c1d88bb4-0000-4000-8000-000000000001",
  "status": "CAPTURED",
  "trxId": "NAGAD_TRX_999"
}
```

---

## 3. Administrative Refund Execution

Handled by existing `POST /api/v1/payments/:paymentIntentId/refunds`, which now delegates gateway payments to `PaymentGatewayRefundDispatcher`.

**Request**:
```http
POST /api/v1/payments/c1d88bb4-0000-4000-8000-000000000001/refunds HTTP/1.1
Content-Type: application/json
Authorization: Bearer <admin_or_vendor_token>
Idempotency-Key: refund_idempotency_key_12345

{
  "amountMinor": 50000,
  "currency": "BDT",
  "reason": "Customer returned defective item"
}
```

**Response (201 Created)**:
```json
{
  "refundId": "ref_uuid_here",
  "paymentIntentId": "c1d88bb4-0000-4000-8000-000000000001",
  "amountMinor": 50000,
  "currency": "BDT",
  "status": "COMPLETED",
  "providerRefundId": "REF_TRX_9999",
  "createdAt": "2026-09-05T10:05:00.000Z"
}
```
