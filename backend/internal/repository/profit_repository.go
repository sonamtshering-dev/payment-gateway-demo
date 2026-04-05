package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SupplierConfig struct {
	ID                uuid.UUID `json:"id"`
	MerchantID        uuid.UUID `json:"merchant_id"`
	SupplierName      string    `json:"supplier_name"`
	BaseValue         float64   `json:"base_value"`
	DefaultMultiplier float64   `json:"default_multiplier"`
	DefaultNumber     float64   `json:"default_number"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type ProfitTransaction struct {
	ID                uuid.UUID `json:"id"`
	MerchantID        uuid.UUID `json:"merchant_id"`
	ProductName       string    `json:"product_name"`
	SupplierName      string    `json:"supplier_name"`
	StockPrice        float64   `json:"stock_price"`
	SellingPrice      float64   `json:"selling_price"`
	Quantity          int       `json:"quantity"`
	Profit            float64   `json:"profit"`
	TransactionStatus string    `json:"transaction_status"`
	SmileNumber       float64   `json:"smile_number,omitempty"`
	SmileMultiplier   float64   `json:"smile_multiplier,omitempty"`
	Notes             string    `json:"notes,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type MonthlyStatement struct {
	ID                uuid.UUID `json:"id"`
	MerchantID        uuid.UUID `json:"merchant_id"`
	Month             time.Time `json:"month"`
	TotalSales        float64   `json:"total_sales"`
	TotalCost         float64   `json:"total_cost"`
	TotalProfit       float64   `json:"total_profit"`
	TotalTransactions int       `json:"total_transactions"`
	EmailSent         bool      `json:"email_sent"`
	CreatedAt         time.Time `json:"created_at"`
}

type ProfitSummary struct {
	TotalSales        float64 `json:"total_sales"`
	TotalCost         float64 `json:"total_cost"`
	TotalProfit       float64 `json:"total_profit"`
	TotalTransactions int     `json:"total_transactions"`
}

func (r *Repository) GetSupplierConfigs(ctx context.Context, merchantID uuid.UUID) ([]SupplierConfig, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, supplier_name, base_value, COALESCE(default_multiplier,2), COALESCE(default_number,1.37), is_active, created_at, updated_at
		FROM supplier_configs WHERE merchant_id = $1 ORDER BY supplier_name
	`, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var configs []SupplierConfig
	for rows.Next() {
		var c SupplierConfig
		if err := rows.Scan(&c.ID, &c.MerchantID, &c.SupplierName, &c.BaseValue, &c.DefaultMultiplier, &c.DefaultNumber, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			continue
		}
		configs = append(configs, c)
	}
	return configs, nil
}

func (r *Repository) UpsertSupplierConfig(ctx context.Context, merchantID uuid.UUID, supplierName string, baseValue, defaultMultiplier, defaultNumber float64, isActive bool) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO supplier_configs (id, merchant_id, supplier_name, base_value, default_multiplier, default_number, is_active, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (merchant_id, supplier_name) DO UPDATE
		SET base_value = $3, default_multiplier = $4, default_number = $5, is_active = $6, updated_at = NOW()
	`, merchantID, supplierName, baseValue, defaultMultiplier, defaultNumber, isActive)
	return err
}

func (r *Repository) GetSupplierConfig(ctx context.Context, merchantID uuid.UUID, supplierName string) (*SupplierConfig, error) {
	var c SupplierConfig
	err := r.db.QueryRow(ctx, `
		SELECT id, merchant_id, supplier_name, base_value, COALESCE(default_multiplier,2), COALESCE(default_number,1.37), is_active, created_at, updated_at
		FROM supplier_configs WHERE merchant_id = $1 AND supplier_name = $2
	`, merchantID, supplierName).Scan(&c.ID, &c.MerchantID, &c.SupplierName, &c.BaseValue, &c.DefaultMultiplier, &c.DefaultNumber, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) CreateProfitTransaction(ctx context.Context, t *ProfitTransaction) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO profit_transactions
		(id, merchant_id, product_name, supplier_name, stock_price, selling_price, quantity,
		transaction_status, smile_number, smile_multiplier, notes, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
	`, t.MerchantID, t.ProductName, t.SupplierName, t.StockPrice, t.SellingPrice,
		t.Quantity, t.TransactionStatus, t.SmileNumber, t.SmileMultiplier, t.Notes)
	return err
}

func (r *Repository) GetProfitTransactions(ctx context.Context, merchantID uuid.UUID, limit, offset int) ([]ProfitTransaction, int, error) {
	var total int
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM profit_transactions WHERE merchant_id = $1`, merchantID).Scan(&total)
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, product_name, supplier_name, stock_price, selling_price,
		quantity, profit, transaction_status,
		COALESCE(smile_number,0), COALESCE(smile_multiplier,0), COALESCE(notes,''), created_at
		FROM profit_transactions WHERE merchant_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, merchantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var txns []ProfitTransaction
	for rows.Next() {
		var t ProfitTransaction
		if err := rows.Scan(&t.ID, &t.MerchantID, &t.ProductName, &t.SupplierName,
			&t.StockPrice, &t.SellingPrice, &t.Quantity, &t.Profit, &t.TransactionStatus,
			&t.SmileNumber, &t.SmileMultiplier, &t.Notes, &t.CreatedAt); err != nil {
			continue
		}
		txns = append(txns, t)
	}
	return txns, total, nil
}

func (r *Repository) GetProfitSummary(ctx context.Context, merchantID uuid.UUID, from, to time.Time) (*ProfitSummary, error) {
	var s ProfitSummary
	err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(selling_price * quantity), 0),
			COALESCE(SUM(stock_price * quantity), 0),
			COALESCE(SUM(profit), 0),
			COUNT(*)
		FROM profit_transactions
		WHERE merchant_id = $1 AND transaction_status = 'completed'
		AND created_at >= $2 AND created_at < $3
	`, merchantID, from, to).Scan(&s.TotalSales, &s.TotalCost, &s.TotalProfit, &s.TotalTransactions)
	return &s, err
}

func (r *Repository) GetMerchantsForMonthlyStatement(ctx context.Context, month time.Time) ([]uuid.UUID, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT merchant_id FROM profit_transactions
		WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::timestamptz)
		AND transaction_status = 'completed'
	`, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *Repository) UpsertMonthlyStatement(ctx context.Context, s *MonthlyStatement) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO monthly_statements
		(id, merchant_id, month, total_sales, total_cost, total_profit, total_transactions, email_sent, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (merchant_id, month) DO UPDATE
		SET total_sales=$3, total_cost=$4, total_profit=$5, total_transactions=$6, email_sent=$7
	`, s.MerchantID, s.Month, s.TotalSales, s.TotalCost, s.TotalProfit, s.TotalTransactions, s.EmailSent)
	return err
}

func (r *Repository) GetMonthlyStatements(ctx context.Context, merchantID uuid.UUID) ([]MonthlyStatement, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, month, total_sales, total_cost, total_profit,
		total_transactions, email_sent, created_at
		FROM monthly_statements WHERE merchant_id = $1 ORDER BY month DESC LIMIT 12
	`, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stmts []MonthlyStatement
	for rows.Next() {
		var s MonthlyStatement
		if err := rows.Scan(&s.ID, &s.MerchantID, &s.Month, &s.TotalSales, &s.TotalCost,
			&s.TotalProfit, &s.TotalTransactions, &s.EmailSent, &s.CreatedAt); err != nil {
			continue
		}
		stmts = append(stmts, s)
	}
	return stmts, nil
}
