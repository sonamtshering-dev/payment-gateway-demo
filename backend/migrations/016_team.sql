-- ============================================================================
-- 016_team.sql — Team members (multi-user access to a merchant account)
-- Members log in with their own email/password and act within the owner's
-- merchant account, scoped by role:
--   owner  — implicit (the merchant row itself), full control
--   admin  — can change settings, cannot manage team or rotate keys
--   viewer — read-only dashboard access
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_team_members (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id       UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    name              VARCHAR(100) NOT NULL DEFAULT '',
    role              VARCHAR(20)  NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    password_hash     VARCHAR(255) NOT NULL DEFAULT '',
    status            VARCHAR(20)  NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
    invite_token_hash VARCHAR(128),
    invite_expires_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_merchant ON merchant_team_members(merchant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_token ON merchant_team_members(invite_token_hash) WHERE invite_token_hash IS NOT NULL;

CREATE TRIGGER update_merchant_team_members_updated_at
    BEFORE UPDATE ON merchant_team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
