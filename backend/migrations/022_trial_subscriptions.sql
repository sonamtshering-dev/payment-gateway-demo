-- Allow 'trial' status in merchant_subscriptions (no schema change needed, status is varchar)
-- Ensure existing active free-plan subscriptions are unaffected.
-- This migration is a no-op — just documents the new 'trial' status value.
SELECT 1;
