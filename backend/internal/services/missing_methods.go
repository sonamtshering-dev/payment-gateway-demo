package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/utils"
	"github.com/upay/gateway/internal/models"
)

func (s *Service) DeleteUPI(ctx context.Context, upiID uuid.UUID, merchantID uuid.UUID) error {
	return s.repo.DeleteMerchantUPI(ctx, upiID, merchantID)
}

func (s *Service) GetMerchantTransactions(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) ([]models.TransactionLog, error) {
	payments, _, err := s.repo.GetPaymentsByMerchant(ctx, merchantID, filter)
	if err != nil {
		return nil, err
	}
	var logs []models.TransactionLog
	for _, p := range payments {
		logs = append(logs, models.TransactionLog{
			ID:        p.ID,
			PaymentID: p.ID,
			Status:    string(p.Status),
			Source:    "payment",
			CreatedAt: p.CreatedAt,
		})
	}
	return logs, nil
}


func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	tokenHash := utils.HashToken(refreshToken)
	rt, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil || rt == nil {
		return nil, fmt.Errorf("invalid or expired refresh token")
	}

	// Revoke old token
	s.repo.RevokeRefreshToken(ctx, tokenHash)

	// Get merchant
	merchant, err := s.repo.GetMerchantByID(ctx, rt.MerchantID)
	if err != nil || merchant == nil {
		return nil, fmt.Errorf("merchant not found")
	}

	apiSecret, err := utils.Decrypt(merchant.APISecret, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("internal error")
	}

	return s.generateAuthResponse(ctx, merchant, apiSecret)
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
	if filter.Page == 0 { filter.Page = 1 }
	if filter.Limit == 0 { filter.Limit = 20 }
	alerts, _, err := s.repo.GetFraudAlerts(ctx, filter)
	return alerts, err
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

func (s *Service) GetMerchantPayments(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) ([]models.Payment, int64, error) {
	return s.repo.GetPaymentsByMerchant(ctx, merchantID, filter)
}
