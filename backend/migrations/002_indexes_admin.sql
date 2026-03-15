-- ============================================================================
-- Migration 002: Additional indexes + admin seed helper
-- ============================================================================

-- Track when API keys were last rotated
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS keys_rotated_at TIMESTAMPTZ;

-- Index for webhook retry performance
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
    ON webhook_deliveries(merchant_id, success, created_at DESC)
    WHERE success = false;

-- Index for daily volume calculation
CREATE INDEX IF NOT EXISTS idx_payments_daily_volume
    ON payments(merchant_id, created_at)
    WHERE status = 'paid' AND created_at >= CURRENT_DATE;

-- Partial index for active payment sessions (fast status polling)
CREATE INDEX IF NOT EXISTS idx_payments_active_sessions
    ON payments(id, status, expires_at)
    WHERE status = 'pending';

-- ============================================================================
-- SEED ADMIN FUNCTION
-- Call: SELECT create_admin('Admin Name', 'admin@upay.dev', '<bcrypt_hash>', 'upay_xxx', '<encrypted_secret>', 'whsec_xxx');
-- Generate bcrypt hash externally: htpasswd -nbBC 12 "" "password" | cut -d: -f2
-- ============================================================================
CREATE OR REPLACE FUNCTION create_admin(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_api_key VARCHAR,
    p_api_secret TEXT,
    p_webhook_secret VARCHAR
) RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO merchants (id, name, email, password_hash, api_key, api_secret, webhook_secret, is_active, is_admin, daily_limit)
    VALUES (uuid_generate_v4(), p_name, p_email, p_password_hash, p_api_key, p_api_secret, p_webhook_secret, true, true, 999999999999)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;
