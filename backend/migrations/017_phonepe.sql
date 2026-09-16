-- PhonePe Business PG credentials per merchant UPI
ALTER TABLE merchant_upis ADD COLUMN IF NOT EXISTS phonepe_merchant_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE merchant_upis ADD COLUMN IF NOT EXISTS phonepe_salt_key    TEXT        DEFAULT NULL;  -- stored encrypted
ALTER TABLE merchant_upis ADD COLUMN IF NOT EXISTS phonepe_salt_index  VARCHAR(10) DEFAULT '1';
ALTER TABLE merchant_upis ADD COLUMN IF NOT EXISTS phonepe_enabled     BOOLEAN     DEFAULT FALSE;

-- Index for PhonePe polling worker
CREATE INDEX IF NOT EXISTS idx_merchant_upis_phonepe
  ON merchant_upis(merchant_id, phonepe_enabled)
  WHERE phonepe_enabled = TRUE;

-- Reuse paytm_txn_ref as the merchantTransactionId for PhonePe status checks
-- (it's already embedded in the UPI link's tr= param, which PhonePe also honours)
-- No new column needed in payments.
