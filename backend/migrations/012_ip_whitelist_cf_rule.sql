-- Add Cloudflare rule ID column to merchant_ip_whitelist
-- This stores the CF firewall access rule ID so we can auto-delete it from Cloudflare when the entry is removed
ALTER TABLE merchant_ip_whitelist
    ADD COLUMN IF NOT EXISTS cf_rule_id VARCHAR(64) DEFAULT '';
