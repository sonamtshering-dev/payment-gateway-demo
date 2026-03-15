# UPay Gateway — Merchant Integration Guide

## Overview

UPay Gateway enables merchants to accept UPI payments directly to their own UPI IDs using dynamic QR codes and intent links. This document covers everything needed to integrate.

---

## Architecture

```
Client Website → UPay Gateway API → Payment Session Created
                                    ↓
                              QR Code + UPI Intent Link
                                    ↓
                         Customer scans / clicks UPI link
                                    ↓
                        Payment via UPI (to merchant's VPA)
                                    ↓
                  Merchant verifies → Gateway confirms → Webhook sent
```

---

## Authentication

### Dashboard Access (JWT)
Used for merchant dashboard — login, stats, settings.

```
POST /api/v1/auth/login
{
  "email": "merchant@example.com",
  "password": "your_password"
}

Response:
{
  "access_token": "eyJhbG...",
  "refresh_token": "abc123...",
  "expires_in": 900,
  "merchant": { "id": "uuid", "name": "Shop", ... }
}

// Use in headers:
Authorization: Bearer <access_token>
```

### Payment API Access (HMAC Signature)
Used for creating/verifying payments from your server.

**Required headers on every request:**
| Header | Description |
|--------|-------------|
| `X-API-KEY` | Your API key (from dashboard) |
| `X-TIMESTAMP` | Current Unix timestamp (seconds) |
| `X-SIGNATURE` | HMAC-SHA256 signature |

**Signature Formula:**
```
HMAC_SHA256(api_secret + timestamp + request_body)
```

### Signature Generation Examples

**Node.js:**
```javascript
const crypto = require('crypto');

function sign(apiSecret, timestamp, body) {
  const message = apiSecret + timestamp + body;
  return crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
}
```

**Python:**
```python
import hmac, hashlib, time, json

def sign(api_secret, timestamp, body):
    message = api_secret + str(timestamp) + body
    return hmac.new(api_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
```

**Go:**
```go
func sign(apiSecret, timestamp, body string) string {
    message := apiSecret + timestamp + body
    mac := hmac.New(sha256.New, []byte(apiSecret))
    mac.Write([]byte(message))
    return hex.EncodeToString(mac.Sum(nil))
}
```

**PHP:**
```php
function sign($apiSecret, $timestamp, $body) {
    $message = $apiSecret . $timestamp . $body;
    return hash_hmac('sha256', $message, $apiSecret);
}
```

---

## Payment Flow

### Step 1: Create Payment Session

```
POST /api/v1/payments/create

Headers:
  X-API-KEY: upay_your_key
  X-TIMESTAMP: 1705312800
  X-SIGNATURE: <computed_signature>

Body:
{
  "merchant_id": "uuid-of-merchant",
  "order_id": "ORD-20240115-001",
  "amount": 249900,          // Amount in paise (₹2,499.00)
  "currency": "INR",
  "customer_reference": "Rahul Sharma"
}

Response (201):
{
  "success": true,
  "data": {
    "payment_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "upi_intent_link": "upi://pay?pa=shop@paytm&pn=MyShop&am=2499.00&cu=INR&tn=ORD-20240115-001",
    "qr_code_base64": "iVBORw0KGgo...",  // PNG image, base64 encoded
    "amount": 249900,
    "currency": "INR",
    "expires_at": "2024-01-15T11:00:00Z",
    "status": "pending"
  }
}
```

### Step 2: Display QR / Intent Link

Show the QR code and/or UPI intent link to your customer:

```html
<!-- QR Code -->
<img src="data:image/png;base64,{qr_code_base64}" alt="Pay with UPI" />

<!-- Deep link button for mobile -->
<a href="{upi_intent_link}">Pay ₹2,499.00 with UPI</a>
```

### Step 3: Poll Payment Status

```
GET /api/v1/payments/status/{payment_id}

Response:
{
  "success": true,
  "data": {
    "payment_id": "f47ac10b-...",
    "order_id": "ORD-20240115-001",
    "amount": 249900,
    "status": "pending",    // pending | paid | failed | expired
    "expires_at": "2024-01-15T11:00:00Z"
  }
}
```

Poll every 3-5 seconds until status changes from `pending`.

### Step 4: Verify Payment (Server-Side)

After customer confirms payment (e.g., enters UTR):

```
POST /api/v1/payments/verify

Body:
{
  "payment_id": "f47ac10b-...",
  "utr": "UTR123456789012",
  "amount": 249900
}

Response (200):
{
  "success": true,
  "message": "payment verified successfully"
}
```

### Step 5: Receive Webhook

UPay sends a POST to your configured webhook URL:

```json
POST https://yoursite.com/webhooks/upay

Headers:
  Content-Type: application/json
  X-Webhook-Signature: <hmac_sha256_of_payload>
  X-Webhook-Timestamp: 1705312900

Body:
{
  "payment_id": "f47ac10b-...",
  "order_id": "ORD-20240115-001",
  "amount": 249900,
  "currency": "INR",
  "status": "paid",
  "utr": "UTR123456789012",
  "timestamp": 1705312900,
  "signature": "<hmac>"
}
```

**Verify the webhook signature:**
```javascript
const signature = req.headers['x-webhook-signature'];
const expected = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

const valid = crypto.timingSafeEqual(
  Buffer.from(signature, 'hex'),
  Buffer.from(expected, 'hex')
);
```

---

## UPI ID Management

### Add UPI ID
```
POST /api/v1/dashboard/upi
Authorization: Bearer <token>

{ "upi_id": "shop@paytm", "label": "Primary Paytm", "priority": 1 }
```

### List UPI IDs
```
GET /api/v1/dashboard/upi
Authorization: Bearer <token>
```

UPI IDs are automatically rotated across payment sessions to distribute load.

---

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_HEADERS` | Required auth headers not provided |
| `TIMESTAMP_INVALID` | Request timestamp too old (>5 min) |
| `INVALID_API_KEY` | API key not found or deactivated |
| `INVALID_SIGNATURE` | HMAC signature verification failed |
| `REPLAY_DETECTED` | Duplicate request (replay attack) |
| `RATE_LIMIT_EXCEEDED` | Too many requests from this IP |
| `VALIDATION_ERROR` | Request body validation failed |

---

## Security Best Practices

1. **Never expose your API Secret** in client-side code
2. **Always verify webhook signatures** before processing
3. **Use HTTPS only** for all API communication
4. **Validate amounts** match between your order and payment
5. **Check UTR uniqueness** to prevent double-crediting
6. **Set webhook URL to HTTPS** endpoint only
7. **Implement idempotency** using order_id as key
8. **Rotate API keys** periodically via the dashboard

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 5 requests/minute |
| Payment create | 20 requests/second |
| Payment status | 60 requests/minute |
| Dashboard APIs | 60 requests/minute |

---

## Webhook Retry Policy

Failed webhook deliveries are retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 2 minutes
- Attempt 3: 4 minutes  
- Attempt 4: 8 minutes
- Attempt 5: 16 minutes (final)

Return HTTP 2xx to acknowledge receipt. Any other status triggers a retry.

---

## Testing

Use the sandbox environment for testing:
- Base URL: `https://sandbox.api.upay.dev`
- Test UPI ID: `test@upay`
- Test UTR: `TESTUTRNUMBER123`

---

## Support

- Dashboard: https://dashboard.upay.dev
- API Status: https://status.upay.dev
- Email: support@upay.dev
