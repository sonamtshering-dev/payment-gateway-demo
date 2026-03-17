CREATE TABLE IF NOT EXISTS merchant_providers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id   UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL,
    display_name  VARCHAR(100),
    api_key       TEXT,
    api_secret    TEXT,
    webhook_url   TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    config        JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchant_providers_merchant ON merchant_providers(merchant_id);
