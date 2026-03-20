-- Paytm MID storage per merchant
ALTER TABLE merchant_upis ADD COLUMN IF NOT EXISTS paytm_mid VARCHAR(50) DEFAULT NULL;
ALTER TABLE merchant_upis ADD COLUMN IF NOT EXISTS paytm_enabled BOOLEAN DEFAULT FALSE;

-- Index for paytm polling worker
CREATE INDEX IF NOT EXISTS idx_merchant_upis_paytm ON merchant_upis(merchant_id, paytm_enabled) WHERE paytm_enabled = TRUE;

-- Store Paytm transaction reference in payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paytm_txn_ref VARCHAR(100) DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paytm_verified BOOLEAN DEFAULT FALSE;

-- Index for worker to find pending payments that need Paytm verification
CREATE INDEX IF NOT EXISTS idx_payments_paytm_pending 
  ON payments(status, paytm_txn_ref, created_at) 
  WHERE status = 'pending' AND paytm_txn_ref IS NOT NULL;