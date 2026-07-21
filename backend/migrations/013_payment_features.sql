-- Payment link feature flags and customer detail collection
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notify_on_paid           BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS collect_customer_details BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name            VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email           VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_phone           VARCHAR(20)  NOT NULL DEFAULT '';
