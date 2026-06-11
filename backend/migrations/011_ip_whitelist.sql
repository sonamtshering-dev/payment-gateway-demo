-- Merchant IP whitelist for payment API authentication
CREATE TABLE IF NOT EXISTS merchant_ip_whitelist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    ip_cidr     VARCHAR(50) NOT NULL,   -- e.g. "203.0.113.5" or "10.0.0.0/24"
    label       VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (merchant_id, ip_cidr)
);

CREATE INDEX IF NOT EXISTS idx_merchant_ip_whitelist_merchant ON merchant_ip_whitelist(merchant_id);
