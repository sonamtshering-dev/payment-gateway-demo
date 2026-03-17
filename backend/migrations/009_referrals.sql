-- Referral codes on merchants
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS referral_discount_pct INT DEFAULT 0;

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reward_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Email subscribers (landing page capture)
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'landing',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate referral codes for existing merchants
UPDATE merchants SET referral_code = UPPER(SUBSTRING(MD5(id::text), 1, 8)) WHERE referral_code IS NULL;
