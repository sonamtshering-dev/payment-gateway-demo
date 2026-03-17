-- Per-merchant limit overrides (admin can set custom limits)
ALTER TABLE merchants 
  ADD COLUMN IF NOT EXISTS qr_limit_override INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS link_limit_override INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS api_limit_override INT DEFAULT NULL;
