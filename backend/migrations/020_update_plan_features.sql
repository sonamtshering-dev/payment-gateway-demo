-- Migration: 020_update_plan_features.sql
-- Updates plan feature lists to reflect all enforced capabilities

UPDATE plans SET features = '[
  "100 QR codes per billing period",
  "5 active payment links",
  "500 API calls per day",
  "Telegram payment alerts",
  "Basic analytics dashboard",
  "Email support"
]'::jsonb WHERE name = 'Starter';

UPDATE plans SET features = '[
  "Unlimited QR codes",
  "Unlimited payment links",
  "Unlimited API calls",
  "Telegram payment alerts",
  "AI assistant & insights",
  "Team management (multi-user)",
  "Crypto / USDT payments",
  "White-label branding",
  "Advanced analytics",
  "Webhook & SDK support",
  "Priority support"
]'::jsonb WHERE name = 'Pro';

UPDATE plans SET features = '[
  "Everything in Pro",
  "Dedicated infrastructure",
  "Custom rate limits",
  "SLA guarantee",
  "Dedicated account manager",
  "Custom integrations"
]'::jsonb WHERE name = 'Enterprise';
