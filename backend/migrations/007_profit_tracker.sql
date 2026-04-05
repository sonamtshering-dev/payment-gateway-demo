-- Supplier config per merchant
CREATE TABLE IF NOT EXISTS supplier_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    supplier_name VARCHAR(50) NOT NULL,
    base_value DECIMAL(10,4) DEFAULT 1680,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, supplier_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_configs_merchant ON supplier_configs(merchant_id);

-- Profit transactions table
CREATE TABLE IF NOT EXISTS profit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    supplier_name VARCHAR(50) NOT NULL,
    stock_price DECIMAL(12,4) NOT NULL,
    selling_price DECIMAL(12,4) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    profit DECIMAL(12,4) GENERATED ALWAYS AS ((selling_price - stock_price) * quantity) STORED,
    transaction_status VARCHAR(20) DEFAULT 'completed',
    smile_number DECIMAL(10,4),
    smile_multiplier DECIMAL(10,4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profit_transactions_merchant ON profit_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_profit_transactions_created ON profit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_profit_transactions_month ON profit_transactions(merchant_id, DATE_TRUNC('month', created_at));

-- Monthly statements table
CREATE TABLE IF NOT EXISTS monthly_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    total_sales DECIMAL(12,4) DEFAULT 0,
    total_cost DECIMAL(12,4) DEFAULT 0,
    total_profit DECIMAL(12,4) DEFAULT 0,
    total_transactions INT DEFAULT 0,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_statements_merchant ON monthly_statements(merchant_id);
