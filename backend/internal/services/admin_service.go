package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) RotateAPIKeys(ctx context.Context, merchantID uuid.UUID) (string, string, error) {
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return "", "", fmt.Errorf("merchant not found")
	}

	newKey, err := utils.GenerateAPIKey()
	if err != nil {
		return "", "", err
	}
	newSecret, err := utils.GenerateAPISecret()
	if err != nil {
		return "", "", err
	}

	encryptedSecret, err := utils.Encrypt(newSecret, s.config.Security.EncryptionKey)
	if err != nil {
		return "", "", fmt.Errorf("failed to encrypt new secret: %w", err)
	}

	if err := s.repo.UpdateAPIKeys(ctx, merchantID, newKey, encryptedSecret); err != nil {
		return "", "", err
	}

	s.repo.RevokeAllMerchantTokens(ctx, merchantID)
	s.redis.Del(ctx, fmt.Sprintf("merchant:%s", merchantID.String()))

	s.notifyTelegramAPIKeyRotated(ctx, merchantID)

	return newKey, newSecret, nil
}

func (s *Service) ChangePassword(ctx context.Context, merchantID uuid.UUID, currentPassword, newPassword string) error {
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return fmt.Errorf("merchant not found")
	}

	if !utils.CheckPassword(currentPassword, merchant.PasswordHash) {
		return fmt.Errorf("current password is incorrect")
	}

	newHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := s.repo.UpdatePassword(ctx, merchantID, newHash); err != nil {
		return err
	}

	s.repo.RevokeAllMerchantTokens(ctx, merchantID)
	return nil
}

func (s *Service) AdminToggleMerchant(ctx context.Context, merchantID uuid.UUID, active bool) error {
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return fmt.Errorf("merchant not found")
	}

	if err := s.repo.UpdateMerchantActive(ctx, merchantID, active); err != nil {
		return err
	}

	if !active {
		s.repo.RevokeAllMerchantTokens(ctx, merchantID)
	}
	return nil
}

func (s *Service) AdminUpdatePaymentStatus(ctx context.Context, paymentID uuid.UUID, status models.PaymentStatus, note string) error {
	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil || payment == nil {
		return fmt.Errorf("payment not found")
	}

	if err := s.repo.UpdatePaymentStatus(ctx, paymentID, status, nil); err != nil {
		return err
	}

	s.repo.CreateTransactionLog(ctx, &models.TransactionLog{
		ID:          utils.NewID(),
		PaymentID:   paymentID,
		Status:      string(status),
		RawResponse: fmt.Sprintf("manual update by admin: %s", note),
		Source:      "manual",
		CreatedAt:   time.Now(),
	})

	if status == models.PaymentStatusPaid {
		go s.dispatchWebhook(context.Background(), payment, "")
	}
	if status == models.PaymentStatusFailed {
		go s.notifyTelegramPaymentFailed(context.Background(), payment.MerchantID, payment.OrderID, payment.Amount)
	}

	return nil
}

func (s *Service) AdminResolveFraudAlert(ctx context.Context, alertID uuid.UUID) error {
	return s.repo.ResolveFraudAlert(ctx, alertID)
}

func (s *Service) AdminGetSystemStats(ctx context.Context) (*repository.SystemStats, error) {
	return s.repo.GetSystemStats(ctx)
}

func (s *Service) AdminGetRevenueChart(ctx context.Context, days int) ([]repository.DailyRevenue, error) {
	if days <= 0 || days > 365 {
		days = 30
	}
	return s.repo.GetRevenueChart(ctx, days)
}

func (s *Service) AdminGetMerchantDetail(ctx context.Context, merchantID uuid.UUID) (*repository.AdminMerchantDetail, error) {
	return s.repo.GetAdminMerchantDetail(ctx, merchantID)
}

func (s *Service) AdminGetWebhookLogs(ctx context.Context, page, limit int, merchantID string) ([]repository.AdminWebhookLog, int64, error) {
	return s.repo.GetAdminWebhookLogs(ctx, page, limit, merchantID)
}

func (s *Service) AdminRetryWebhook(ctx context.Context, deliveryID uuid.UUID) error {
	return s.repo.MarkWebhookForRetry(ctx, deliveryID)
}

func (s *Service) AdminGetSubscriptions(ctx context.Context, page, limit int) ([]repository.AdminSubscription, int64, error) {
	return s.repo.GetAdminSubscriptions(ctx, page, limit)
}

func (s *Service) AdminGetAuditLogs(ctx context.Context, page, limit int) ([]repository.AdminAuditLog, int64, error) {
	return s.repo.GetAdminAuditLogs(ctx, page, limit)
}

func (s *Service) AdminGetTopMerchants(ctx context.Context, limit int) ([]repository.TopMerchant, error) {
	return s.repo.GetTopMerchants(ctx, limit)
}

func (s *Service) AdminGetPaymentsPaginated(ctx context.Context, page, limit int, status, search string) ([]repository.AdminPaymentRow, int64, error) {
	return s.repo.GetAdminPaymentsPaginated(ctx, page, limit, status, search)
}

func (s *Service) AdminGetFraudAlertsPaginated(ctx context.Context, page, limit int, resolved *bool, severity string) ([]repository.AdminFraudRow, int64, error) {
	return s.repo.GetAdminFraudAlerts(ctx, page, limit, resolved, severity)
}

func (s *Service) AdminResetMerchantPassword(ctx context.Context, merchantID uuid.UUID, newPassword string) error {
	if len(newPassword) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	if err := s.repo.AdminSetMerchantPassword(ctx, merchantID, hash); err != nil {
		return err
	}
	s.repo.RevokeAllMerchantTokens(ctx, merchantID)
	return nil
}

func (s *Service) AdminRotateMerchantKeys(ctx context.Context, merchantID uuid.UUID) (string, string, error) {
	return s.RotateAPIKeys(ctx, merchantID)
}

func (s *Service) AdminUpdateMerchantLimit(ctx context.Context, merchantID uuid.UUID, dailyLimitPaise int64) error {
	return s.repo.UpdateMerchantDailyLimit(ctx, merchantID, dailyLimitPaise)
}
