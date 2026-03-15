# UPay Gateway

A secure, production-ready UPI payment gateway that allows merchants to accept payments directly to their own UPI IDs using dynamic QR codes.

## Architecture

```
Cloudflare → Nginx (reverse proxy + rate limiting)
                ↓
         Go API Server (Gin) ×N replicas
           ↓           ↓
     PostgreSQL      Redis
                       ↓
              Background Workers
              (expiry, webhooks, fraud)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend API | Go 1.22 (Gin framework) |
| Frontend | React/Next.js Dashboard |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Proxy | Nginx |
| Container | Docker + Docker Compose |
| Auth | JWT (access + refresh tokens) |
| Encryption | AES-256-GCM (secrets at rest) |
| Signing | HMAC-SHA256 (API + webhooks) |

## Project Structure

```
upay/
├── backend/
│   ├── cmd/server/main.go          # Entry point, router setup
│   ├── internal/
│   │   ├── config/                  # Environment configuration
│   │   ├── middleware/              # Auth, rate limit, CORS, security
│   │   ├── models/                  # DB models + DTOs
│   │   ├── handlers/                # HTTP controllers
│   │   ├── services/                # Business logic
│   │   ├── repository/              # Database queries
│   │   ├── utils/                   # Crypto, JWT, helpers
│   │   └── workers/                 # Background processors
│   ├── migrations/                  # SQL schema
│   ├── docs/                        # API documentation
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/Dashboard.jsx        # Main dashboard
│   │   ├── lib/api.ts               # API client
│   │   └── types/                   # TypeScript types
│   └── Dockerfile
├── nginx/nginx.conf                 # Reverse proxy config
├── docker-compose.yml
├── scripts/setup.sh
└── .env.example
```

## Quick Start

```bash
# Clone and setup
git clone https://github.com/yourusername/upay-gateway.git
cd upay-gateway

# Auto-generate secrets and start all services
chmod +x scripts/setup.sh
./scripts/setup.sh

# Services available at:
# Dashboard: http://localhost:3000
# API:       http://localhost/api/v1
# Health:    http://localhost/health
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register merchant |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh tokens |

### Payment API (HMAC-signed)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/create` | Create payment session |
| GET | `/api/v1/payments/status/:id` | Check payment status |
| POST | `/api/v1/payments/verify` | Verify payment with UTR |

### Dashboard (JWT-authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Analytics overview |
| GET | `/api/v1/dashboard/transactions` | Transaction list |
| POST | `/api/v1/dashboard/upi` | Add UPI ID |
| GET | `/api/v1/dashboard/upi` | List UPI IDs |
| PUT | `/api/v1/dashboard/webhook` | Update webhook URL |

### Admin (JWT + admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/merchants` | List all merchants |
| GET | `/api/v1/admin/fraud-alerts` | View fraud alerts |

## Security Features

- **AES-256-GCM encryption** for all secrets at rest (API secrets, UPI IDs)
- **HMAC-SHA256 signature** verification on every payment API request
- **Timestamp validation** (5-minute window) prevents replay attacks
- **Replay detection** via Redis-backed signature cache
- **Rate limiting** at both Nginx and application layers
- **JWT with refresh token rotation** (old tokens auto-revoked)
- **Bcrypt password hashing** (cost factor 12)
- **Security headers** (HSTS, CSP, X-Frame-Options, etc.)
- **Input validation** on all endpoints
- **SQL injection prevention** via parameterized queries

## Fraud Protection

- **UTR duplicate detection** — flags reuse of transaction references
- **Amount mismatch detection** — alerts on verification amount discrepancies
- **Rate limiting per IP** — blocks excessive requests
- **Daily transaction limits** — per-merchant configurable caps
- **Payment session expiry** — auto-expires stale sessions (15min default)
- **Webhook replay protection** — signed payloads with timestamp checks

## Scalability Design

- **Stateless API servers** — horizontal scaling via Docker replicas
- **Connection pooling** — pgxpool (25 max connections)
- **Redis caching** — payment sessions, rate limits, signature replay
- **Background workers** — async webhook delivery, payment expiry
- **Database indexing** — composite indexes for dashboard queries
- **Nginx load balancing** — least_conn upstream distribution

## Running Tests

```bash
cd backend
go test ./internal/utils/ -v
go test ./... -cover
```

## Environment Variables

See `.env.example` for full list. Key variables:

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | AES-256 key (32 bytes hex) |
| `JWT_ACCESS_SECRET` | JWT signing secret |
| `DB_PASSWORD` | PostgreSQL password |
| `RATE_LIMIT_PER_MINUTE` | API rate limit |
| `PAYMENT_SESSION_TTL_MINUTES` | QR code expiry |

## License

MIT
