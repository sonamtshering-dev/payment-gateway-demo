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
		ID:          uuid.New(),
		PaymentID:   paymentID,
		Status:      string(status),
		RawResponse: fmt.Sprintf("manual update by admin: %s", note),
		Source:      "manual",
		CreatedAt:   time.Now(),
	})

	if status == models.PaymentStatusPaid {
		go s.dispatchWebhook(context.Background(), payment, "")
	}

	return nil
}

func (s *Service) AdminResolveFraudAlert(ctx context.Context, alertID uuid.UUID) error {
	return s.repo.ResolveFraudAlert(ctx, alertID)
}

func (s *Service) AdminGetSystemStats(ctx context.Context) (*repository.SystemStats, error) {
	return s.repo.GetSystemStats(ctx)
}
