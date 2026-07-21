-- Telegram integration: one row per connected merchant
CREATE TABLE IF NOT EXISTS merchant_telegram (
    merchant_id        UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    chat_id_encrypted  TEXT        NOT NULL,
    is_enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
    notification_types TEXT[]      NOT NULL DEFAULT '{}',
    connected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rolling notification log (90-day retention enforced by worker)
CREATE TABLE IF NOT EXISTS telegram_notifications (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id       UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    message           TEXT        NOT NULL,
    success           BOOLEAN     NOT NULL DEFAULT FALSE,
    error_message     TEXT,
    attempt           INT         NOT NULL DEFAULT 1,
    sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_notif_merchant_time
    ON telegram_notifications (merchant_id, sent_at DESC);
