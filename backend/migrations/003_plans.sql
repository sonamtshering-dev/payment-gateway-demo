-- Migration: 003_plans.sql
-- Run after 002_indexes_admin.sql
-- Adds admin-controlled public pricing plans

CREATE TABLE IF NOT EXISTS plans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(80)  NOT NULL,
    price         INTEGER      NOT NULL DEFAULT 0,   -- in paise (0 = free)
    billing_cycle VARCHAR(40)  NOT NULL DEFAULT 'per month',
    badge         VARCHAR(40),                        -- e.g. "Most popular"
    is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    cta_label     VARCHAR(60)  NOT NULL DEFAULT 'Get started',
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    -- limits stored as JSON for flexibility
    qr_limit      INTEGER      NOT NULL DEFAULT -1,  -- -1 = unlimited
    link_limit    INTEGER      NOT NULL DEFAULT -1,
    api_limit     INTEGER      NOT NULL DEFAULT -1,
    features      JSONB        NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON plans (is_active, sort_order);

-- Seed default plans (admin can edit/delete from admin panel)
INSERT INTO plans (name, price, billing_cycle, badge, is_featured, cta_label, sort_order, qr_limit, link_limit, api_limit, features) VALUES
(
    'Starter', 0, 'forever', NULL, FALSE, 'Get started', 1,
    100, 5, 500,
    '["100 QR codes / month","5 payment links","Basic analytics","Email support"]'
),
(
    'Pro', 99900, 'per month', 'Most popular', TRUE, 'Start free trial', 2,
    -1, -1, -1,
    '["Unlimited QR codes","Unlimited payment links","Advanced analytics","Webhook support","Priority support","API access"]'
),
(
    'Enterprise', 0, 'contact us', NULL, FALSE, 'Contact sales', 3,
    -1, -1, -1,
    '["Everything in Pro","Dedicated infrastructure","Custom rate limits","SLA guarantee","White-label option","Dedicated account manager"]'
)
ON CONFLICT DO NOTHING;