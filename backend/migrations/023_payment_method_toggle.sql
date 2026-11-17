-- Allow merchants to disable UPI (INR) payments so customers only see USDT.
-- Default TRUE preserves current behaviour for all existing merchants.
ALTER TABLE merchant_crypto_config
    ADD COLUMN IF NOT EXISTS upi_enabled BOOLEAN NOT NULL DEFAULT TRUE;
