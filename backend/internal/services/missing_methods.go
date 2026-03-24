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
	if webhookURL != "" {
		if len(webhookURL) < 8 || webhookURL[:8] != "https://" {
			return fmt.Errorf("invalid webhook URL: must use HTTPS")
		}
		for _, blocked := range []string{"localhost", "127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."} {
			if len(webhookURL) > 8 && contains(webhookURL[8:], blocked) {
				return fmt.Errorf("invalid webhook URL: internal addresses not allowed")
			}
		}
	}
	return s.repo.UpdateMerchantWebhook(ctx, merchantID, webhookURL)
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s[:len(substr)] == substr)
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
