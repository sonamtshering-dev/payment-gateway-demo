# NovaPay — UPI Payment Gateway

A production-grade UPI payment gateway built for Indian merchants. Accept payments via QR codes, payment links, and direct UPI integrations with zero transaction fees.

🌐 **Live:** [nova-pay.in](https://nova-pay.in)

---

## Features

### For Merchants
- **Payment Links** — Generate shareable UPI payment links instantly
- **QR Codes** — Styled QR codes for in-store and online payments
- **Multi-Provider Support** — Connect GPay, Paytm, PhonePe and any UPI app
- **Real-time Dashboard** — Live stats, transaction history, and analytics
- **Webhook Notifications** — Get notified instantly on payment events
- **API Access** — Integrate payments into your own application
- **Referral Program** — Earn discounts by referring other merchants

### For Admins
- **Merchant Management** — View, disable, and manage all merchants
- **KYC Verification** — Review and approve merchant identity documents
- **Subscription Management** — Manage plans and extend subscriptions
- **Fraud Detection** — Monitor and resolve suspicious activity
- **Payment Oversight** — View all transactions across all merchants
- **Plans Management** — Create and edit pricing plans

### Security
- AES-256 encryption for sensitive data
- HMAC-SHA256 request signing
- JWT authentication with refresh tokens
- Rate limiting and replay attack protection
- bcrypt password hashing
- Parameterized SQL queries (no injection risk)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.24 + Gin |
| Frontend | Next.js 14 + TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Reverse Proxy | Nginx |
| Deployment | Docker Compose on AWS EC2 |
| CDN/SSL | Cloudflare |
| Email | Gmail SMTP |

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- A domain with Cloudflare (for SSL)
- Gmail account with App Password (for emails)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/sonamtshering-dev/payment-gateway-demo.git
cd payment-gateway-demo
```

2. **Configure environment**
```bash
cp .env.example .env
# Fill in your values in .env
```

3. **Start the services**
```bash
docker compose up -d
```

4. **Access the app**
- Frontend: `http://localhost`
- API: `http://localhost/api/v1`

---

## API Overview

### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
```

### Payments (HMAC authenticated)
```
POST /api/v1/payments/create
GET  /api/v1/payments/status/:id
```

### Dashboard (JWT authenticated)
```
GET  /api/v1/dashboard/stats
GET  /api/v1/dashboard/transactions
GET  /api/v1/dashboard/providers
POST /api/v1/dashboard/payments
```

All payment API requests must include:
- `X-API-KEY` — your merchant API key
- `X-SIGNATURE` — HMAC-SHA256 signature of the request body
- `X-TIMESTAMP` — Unix timestamp (within 5 minutes)

---

## Email Notifications

Merchants receive automatic emails for:
- ✅ Account registration (welcome + referral code)
- ✅ Payment received
- ✅ KYC approved or rejected
- ✅ Subscription activated
- ⏰ Subscription expiry reminders (14, 7, 3 days before)

---

## Deployment

```bash
# Pull latest and rebuild
git pull
docker compose build --no-cache frontend
docker compose up -d
```

---

## License

Private project. All rights reserved.

---

Built with ❤️ by [Sonam Tshering](https://github.com/sonamtshering-dev)
