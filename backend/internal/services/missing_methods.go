package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (s *Service) DeleteUPI(ctx context.Context, upiID uuid.UUID, merchantID uuid.UUID) error {
	return fmt.Errorf("not implemented")
}

func (s *Service) GetMerchantTransactions(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) ([]models.TransactionLog, error) {
	return s.repo.GetAllTransactions(ctx, filter)
}


func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *Service) GetMerchantByID(ctx context.Context, merchantID uuid.UUID) (*models.Merchant, error) {
	return s.repo.GetMerchantByID(ctx, merchantID)
}

func (s *Service) GetUPIs(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantUPI, error) {
	return s.repo.GetMerchantUPIs(ctx, merchantID)
}

func (s *Service) UpdateWebhook(ctx context.Context, merchantID uuid.UUID, webhookURL string) error {
	return fmt.Errorf("not implemented")
}

func (s *Service) AdminListMerchants(ctx context.Context, filter models.AdminMerchantFilter) ([]models.Merchant, error) {
	return s.repo.AdminListMerchants(ctx, filter)
}

func (s *Service) AdminGetFraudAlerts(ctx context.Context, filter models.AdminFraudFilter) ([]models.FraudAlert, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *Service) GetPaymentByIDFull(ctx context.Context, paymentID uuid.UUID) (*models.Payment, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *Service) AdminListPayments(ctx context.Context) (interface{}, error) {
	return s.repo.AdminListPayments(ctx)
}

func (s *Service) SavePaytmMID(ctx context.Context, merchantID uuid.UUID, upiID, mid string) error {
	return s.repo.SavePaytmMID(ctx, merchantID, upiID, mid)
}

func (s *Service) UpdateKYCDocument(ctx context.Context, merchantID uuid.UUID, docURL string) error {
	return s.repo.UpdateKYCDocumentURL(ctx, merchantID, docURL)
}
