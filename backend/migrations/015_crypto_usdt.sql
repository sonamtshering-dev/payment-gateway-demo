-- ============================================================================
-- 015_crypto_usdt.sql — USDT (TRC20 / BEP20 / ERC20) payment support
--
-- Design notes:
--  * NovaPay is non-custodial: funds go directly to the merchant's own wallet.
--    We only verify on-chain transactions and update order status.
--  * Crypto amounts are stored as human-unit NUMERIC(36,18) (e.g. 10.003700),
--    NOT in the INR paise column. INR values stay in payments.amount (paise).
--  * Order binding on a shared wallet is done via a UNIQUE expected amount per
--    pending order (the "unique per-order amount" strategy).
-- ============================================================================

-- Per-merchant crypto configuration (one row per merchant)
CREATE TABLE IF NOT EXISTS merchant_crypto_config (
    merchant_id           UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    usdt_enabled          BOOLEAN        NOT NULL DEFAULT FALSE,
    pricing_mode          VARCHAR(20)    NOT NULL DEFAULT 'live'
                          CHECK (pricing_mode IN ('live', 'fixed', 'live_adjustment')),
    fixed_rate            NUMERIC(20,8)  NOT NULL DEFAULT 0,   -- INR per 1 USDT (fixed mode)
    adjustment_pct        NUMERIC(6,2)   NOT NULL DEFAULT 0,   -- +/- % applied to live rate
    required_confirmations INT           NOT NULL DEFAULT 1,   -- merchant floor; code enforces a per-network safe minimum
    payment_timeout_min   INT            NOT NULL DEFAULT 30,
    auto_verify           BOOLEAN        NOT NULL DEFAULT FALSE, -- background polling (future)
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Merchant wallet addresses, one per network. Addresses are public on-chain data
-- so they are stored in plaintext (unlike UPI IDs).
CREATE TABLE IF NOT EXISTS merchant_crypto_wallets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id   UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    network       VARCHAR(10) NOT NULL CHECK (network IN ('trc20', 'bep20', 'erc20')),
    address       TEXT        NOT NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (merchant_id, network)
);

CREATE INDEX IF NOT EXISTS idx_crypto_wallets_merchant ON merchant_crypto_wallets(merchant_id);

-- One crypto payment attempt per (order + network). Created when the customer
-- selects USDT on the checkout page — this is where the rate is locked and the
-- unique payable amount is reserved.
CREATE TABLE IF NOT EXISTS crypto_payments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id        UUID           NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    merchant_id       UUID           NOT NULL REFERENCES merchants(id),
    network           VARCHAR(10)    NOT NULL CHECK (network IN ('trc20', 'bep20', 'erc20')),
    token_contract    TEXT           NOT NULL,               -- official USDT contract for the network
    merchant_wallet   TEXT           NOT NULL,               -- snapshot at creation (detects wallet change)
    inr_amount        BIGINT         NOT NULL,               -- paise, snapshot of the order amount
    exchange_rate     NUMERIC(20,8)  NOT NULL,               -- INR per 1 USDT, LOCKED for this order
    pricing_mode      VARCHAR(20)    NOT NULL,
    base_usdt         NUMERIC(36,18) NOT NULL,               -- amount before the uniqueness nonce
    expected_usdt     NUMERIC(36,18) NOT NULL,               -- exact amount the customer must send
    status            VARCHAR(20)    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'expired', 'failed')),

    -- Filled on successful verification (immutable thereafter)
    tx_hash           TEXT,
    sender_address    TEXT,
    recipient_address TEXT,
    amount_received   NUMERIC(36,18),
    block_number      BIGINT,
    confirmations     INT,
    tx_timestamp      TIMESTAMPTZ,
    verified_at       TIMESTAMPTZ,
    explorer_url      TEXT,
    provider          VARCHAR(30),

    expires_at        TIMESTAMPTZ    NOT NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- A transaction hash may only ever settle ONE order (replay / reuse protection).
CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_payments_txhash
    ON crypto_payments(lower(tx_hash)) WHERE tx_hash IS NOT NULL;

-- Reserve the unique payable amount among currently-pending orders for the same
-- wallet+network, so a pasted TxID binds to exactly one order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_payments_pending_amount
    ON crypto_payments(merchant_id, network, merchant_wallet, expected_usdt)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_crypto_payments_payment  ON crypto_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_merchant ON crypto_payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_pending  ON crypto_payments(status, expires_at) WHERE status = 'pending';

-- Immutable audit of every verification attempt (success or failure).
CREATE TABLE IF NOT EXISTS crypto_verification_log (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crypto_payment_id UUID        REFERENCES crypto_payments(id) ON DELETE SET NULL,
    payment_id        UUID,
    merchant_id       UUID,
    network           VARCHAR(10) NOT NULL DEFAULT '',
    tx_hash           TEXT        NOT NULL DEFAULT '',
    result            VARCHAR(20) NOT NULL,   -- success | failed
    reason            TEXT        NOT NULL DEFAULT '',
    provider          VARCHAR(30) NOT NULL DEFAULT '',
    ip                VARCHAR(45) NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_verif_log_payment ON crypto_verification_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_crypto_verif_log_created ON crypto_verification_log(created_at DESC);

CREATE TRIGGER update_merchant_crypto_config_updated_at
    BEFORE UPDATE ON merchant_crypto_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crypto_payments_updated_at
    BEFORE UPDATE ON crypto_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
