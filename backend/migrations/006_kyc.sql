CREATE TABLE IF NOT EXISTS merchant_kyc (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    aadhaar_number  TEXT,
    pan_number      TEXT,
    business_name   TEXT,
    bank_account    TEXT,
    bank_ifsc       TEXT,
    bank_name       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    submitted_at    TIMESTAMPTZ,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_kyc_merchant ON merchant_kyc(merchant_id);
