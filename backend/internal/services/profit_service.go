package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/repository"
)

func CalculateSmileStockPrice(baseValue, multiplier, number float64) float64 {
	if number == 0 {
		return 0
	}
	return (baseValue * multiplier) / number
}

func (s *Service) GetSupplierConfigs(ctx context.Context, merchantID uuid.UUID) ([]repository.SupplierConfig, error) {
	return s.repo.GetSupplierConfigs(ctx, merchantID)
}

func (s *Service) UpsertSupplierConfig(ctx context.Context, merchantID uuid.UUID, supplierName string, baseValue, defaultMultiplier, defaultNumber float64, isActive bool) error {
	return s.repo.UpsertSupplierConfig(ctx, merchantID, supplierName, baseValue, defaultMultiplier, defaultNumber, isActive)
}

func (s *Service) CreateProfitTransaction(ctx context.Context, merchantID uuid.UUID, req map[string]interface{}) (*repository.ProfitTransaction, error) {
	supplier := fmt.Sprintf("%v", req["supplier_name"])
	stockPrice := 0.0

	switch supplier {
	case "smile":
		cfg, err := s.repo.GetSupplierConfig(ctx, merchantID, "smile")
		if err != nil || cfg == nil {
			return nil, fmt.Errorf("smile supplier not configured — please set base value first")
		}
			number := toFloat(req["smile_number"])
		if number == 0 { number = cfg.DefaultNumber }
		multiplier := toFloat(req["smile_multiplier"])
		if multiplier == 0 { multiplier = cfg.DefaultMultiplier }
		if number == 0 {
			return nil, fmt.Errorf("smile_number is required — please configure it in supplier settings")
		}
		stockPrice = CalculateSmileStockPrice(cfg.BaseValue, multiplier, number)
	case "moogold":
		stockPrice = toFloat(req["stock_price"])
	case "manual":
		stockPrice = toFloat(req["stock_price"])
	default:
		return nil, fmt.Errorf("unknown supplier: %s", supplier)
	}

	t := &repository.ProfitTransaction{
		MerchantID:        merchantID,
		ProductName:       fmt.Sprintf("%v", req["product_name"]),
		SupplierName:      supplier,
		StockPrice:        stockPrice,
		SellingPrice:      toFloat(req["selling_price"]),
		Quantity:          toInt(req["quantity"]),
		TransactionStatus: "completed",
		SmileNumber:       toFloat(req["smile_number"]),
		SmileMultiplier:   toFloat(req["smile_multiplier"]),
		Notes:             func() string { if req["notes"] == nil { return "" }; return fmt.Sprintf("%v", req["notes"]) }(),
	}
	if t.Quantity == 0 {
		t.Quantity = 1
	}
	if err := s.repo.CreateProfitTransaction(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *Service) GetProfitTransactions(ctx context.Context, merchantID uuid.UUID, limit, offset int) ([]repository.ProfitTransaction, int, error) {
	return s.repo.GetProfitTransactions(ctx, merchantID, limit, offset)
}

func (s *Service) GetProfitSummary(ctx context.Context, merchantID uuid.UUID, period string) (*repository.ProfitSummary, error) {
	now := time.Now()
	var from, to time.Time
	switch period {
	case "today":
		from = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		to = from.Add(24 * time.Hour)
	case "week":
		from = now.AddDate(0, 0, -7)
		to = now
	case "month":
		from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		to = from.AddDate(0, 1, 0)
	default:
		from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		to = from.AddDate(0, 1, 0)
	}
	return s.repo.GetProfitSummary(ctx, merchantID, from, to)
}

func (s *Service) GetMonthlyStatements(ctx context.Context, merchantID uuid.UUID) ([]repository.MonthlyStatement, error) {
	return s.repo.GetMonthlyStatements(ctx, merchantID)
}

func (s *Service) GenerateMonthlyStatement(ctx context.Context, merchantID uuid.UUID, month time.Time) error {
	from := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, 0)
	summary, err := s.repo.GetProfitSummary(ctx, merchantID, from, to)
	if err != nil {
		return err
	}
	stmt := &repository.MonthlyStatement{
		MerchantID:        merchantID,
		Month:             from,
		TotalSales:        summary.TotalSales,
		TotalCost:         summary.TotalCost,
		TotalProfit:       summary.TotalProfit,
		TotalTransactions: summary.TotalTransactions,
		EmailSent:         false,
	}
	if err := s.repo.UpsertMonthlyStatement(ctx, stmt); err != nil {
		return err
	}
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return nil
	}
	go s.email.SendMonthlyStatement(merchant.Email, merchant.Name, month.Format("January 2006"), summary.TotalSales, summary.TotalCost, summary.TotalProfit, summary.TotalTransactions)
	stmt.EmailSent = true
	return s.repo.UpsertMonthlyStatement(ctx, stmt)
}

func toFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case int64:
		return float64(val)
	}
	return 0
}

func toInt(v interface{}) int {
	if v == nil {
		return 1
	}
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case int64:
		return int(val)
	}
	return 1
}
