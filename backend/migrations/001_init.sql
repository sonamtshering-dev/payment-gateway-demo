-- ============================================================================
-- UPay Gateway Database Schema
-- PostgreSQL 15+
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- MERCHANTS
-- ============================================================================
CREATE TABLE merchants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)     NOT NULL,
    email           VARCHAR(255)     NOT NULL UNIQUE,
    password_hash   VARCHAR(255)     NOT NULL,
    api_key         VARCHAR(128)     NOT NULL UNIQUE,
    api_secret      TEXT             NOT NULL,  -- AES-256-GCM encrypted
    webhook_url     TEXT             NOT NULL DEFAULT '',
    webhook_secret  VARCHAR(128)     NOT NULL,
    is_active       BOOLEAN          NOT NULL DEFAULT true,
    is_admin        BOOLEAN          NOT NULL DEFAULT false,
    daily_limit     BIGINT           NOT NULL DEFAULT 10000000, -- ₹1,00,000 in paise
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_email ON merchants(email);
CREATE INDEX idx_merchants_api_key ON merchants(api_key);
CREATE INDEX idx_merchants_active ON merchants(is_active) WHERE is_active = true;

-- ============================================================================
-- MERCHANT UPI IDs
-- ============================================================================
CREATE TABLE merchant_upis (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id     UUID             NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    upi_id          TEXT             NOT NULL,  -- AES-256-GCM encrypted
    label           VARCHAR(50)      NOT NULL DEFAULT '',
    is_active       BOOLEAN          NOT NULL DEFAULT true,
    priority        INTEGER          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchant_upis_merchant ON merchant_upis(merchant_id);
CREATE INDEX idx_merchant_upis_active ON merchant_upis(merchant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- CASHIER PHONES (optional)
-- ============================================================================
CREATE TABLE cashier_phones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id     UUID             NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    phone           VARCHAR(15)      NOT NULL,
    name            VARCHAR(50)      NOT NULL,
    is_active       BOOLEAN          NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cashier_phones_merchant ON cashier_phones(merchant_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id         UUID             NOT NULL REFERENCES merchants(id),
    order_id            VARCHAR(64)      NOT NULL,
    amount              BIGINT           NOT NULL CHECK (amount >= 100), -- min ₹1
    currency            VARCHAR(3)       NOT NULL DEFAULT 'INR',
    status              VARCHAR(20)      NOT NULL DEFAULT 'pending'
                                         CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
    customer_reference  VARCHAR(128)     NOT NULL DEFAULT '',
    upi_id              TEXT             NOT NULL,  -- encrypted reference
    upi_intent_link     TEXT             NOT NULL,
    qr_code_data        TEXT             NOT NULL,
    utr                 VARCHAR(32),
    expires_at          TIMESTAMPTZ      NOT NULL,
    paid_at             TIMESTAMPTZ,
    client_ip           VARCHAR(45)      NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Unique constraint: one active order per merchant
CREATE UNIQUE INDEX idx_payments_merchant_order ON payments(merchant_id, order_id)
    WHERE status IN ('pending', 'paid');

-- Performance indexes
CREATE INDEX idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_expires ON payments(expires_at) WHERE status = 'pending';
CREATE INDEX idx_payments_utr ON payments(utr) WHERE utr IS NOT NULL;

-- Composite index for dashboard queries
CREATE INDEX idx_payments_merchant_status_date ON payments(merchant_id, status, created_at DESC);

-- ============================================================================
-- TRANSACTION LOGS (audit trail)
-- ============================================================================
CREATE TABLE transaction_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID             NOT NULL REFERENCES payments(id),
    status          VARCHAR(20)      NOT NULL,
    raw_response    TEXT             NOT NULL DEFAULT '',
    source          VARCHAR(20)      NOT NULL DEFAULT 'api', -- api, webhook, manual, worker
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transaction_logs_payment ON transaction_logs(payment_id);
CREATE INDEX idx_transaction_logs_created ON transaction_logs(created_at DESC);

-- ============================================================================
-- WEBHOOK DELIVERIES
-- ============================================================================
CREATE TABLE webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID             NOT NULL REFERENCES payments(id),
    merchant_id     UUID             NOT NULL REFERENCES merchants(id),
    url             TEXT             NOT NULL,
    payload         TEXT             NOT NULL,
    response_code   INTEGER          NOT NULL DEFAULT 0,
    response_body   TEXT             NOT NULL DEFAULT '',
    attempt         INTEGER          NOT NULL DEFAULT 0,
    success         BOOLEAN          NOT NULL DEFAULT false,
    next_retry_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_payment ON webhook_deliveries(payment_id);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at)
    WHERE success = false AND attempt < 5;

-- ============================================================================
-- FRAUD ALERTS
-- ============================================================================
CREATE TABLE fraud_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID             NOT NULL REFERENCES payments(id),
    merchant_id     UUID             NOT NULL REFERENCES merchants(id),
    alert_type      VARCHAR(50)      NOT NULL, -- duplicate_utr, amount_mismatch, rate_limit, velocity
    details         TEXT             NOT NULL DEFAULT '',
    severity        VARCHAR(20)      NOT NULL DEFAULT 'medium'
                                     CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved        BOOLEAN          NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_merchant ON fraud_alerts(merchant_id);
CREATE INDEX idx_fraud_alerts_severity ON fraud_alerts(severity, resolved);
CREATE INDEX idx_fraud_alerts_created ON fraud_alerts(created_at DESC);

-- ============================================================================
-- REFRESH TOKENS
-- ============================================================================
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id     UUID             NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    token_hash      VARCHAR(128)     NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ      NOT NULL,
    revoked         BOOLEAN          NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked = false;
CREATE INDEX idx_refresh_tokens_merchant ON refresh_tokens(merchant_id);

-- Cleanup expired tokens periodically
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens(expires_at) WHERE revoked = false;

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id     UUID             REFERENCES merchants(id),
    action          VARCHAR(50)      NOT NULL,
    resource        VARCHAR(100)     NOT NULL,
    ip              VARCHAR(45)      NOT NULL DEFAULT '',
    user_agent      TEXT             NOT NULL DEFAULT '',
    details         TEXT             NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_merchant ON audit_logs(merchant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Partition audit logs by month for performance (optional for high volume)
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
