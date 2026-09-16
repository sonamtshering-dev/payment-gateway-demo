package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) GetMerchantByEmail(ctx context.Context, email string) (*models.Merchant, error) {
	return s.repo.GetMerchantByEmail(ctx, email)
}

func (s *Service) SavePasswordResetToken(ctx context.Context, merchantID, token string, expiry time.Time) error {
	ttl := time.Until(expiry)
	if ttl <= 0 {
		return fmt.Errorf("expiry is in the past")
	}
	return s.redis.Set(ctx, "pwreset:"+token, merchantID, ttl).Err()
}

func (s *Service) ValidatePasswordResetToken(ctx context.Context, token string) (string, error) {
	val, err := s.redis.GetDel(ctx, "pwreset:"+token).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("token not found or expired")
	}
	if err != nil {
		return "", fmt.Errorf("failed to validate token")
	}
	return val, nil
}

func (s *Service) ResetPassword(ctx context.Context, merchantID, newPassword string) error {
	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	if err := s.repo.UpdateMerchantPassword(ctx, merchantID, hash); err != nil {
		return err
	}
	// Invalidate all active sessions so old tokens cannot be reused after a password reset
	mid, parseErr := uuid.Parse(merchantID)
	if parseErr == nil {
		_ = s.repo.RevokeAllMerchantTokens(ctx, mid)
	}
	return nil
}
