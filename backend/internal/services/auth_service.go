package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) GetMerchantByEmail(ctx context.Context, email string) (*models.Merchant, error) {
	return s.repo.GetMerchantByEmail(ctx, email)
}

// In-memory store for password reset tokens (prod: use Redis/DB table)
var (
	resetTokens = map[string]resetEntry{}
	resetMu     sync.Mutex
)

type resetEntry struct {
	merchantID string
	expiry     time.Time
}

func (s *Service) SavePasswordResetToken(ctx context.Context, merchantID, token string, expiry time.Time) error {
	resetMu.Lock()
	defer resetMu.Unlock()
	// Clean expired tokens
	for t, e := range resetTokens {
		if time.Now().After(e.expiry) {
			delete(resetTokens, t)
		}
	}
	resetTokens[token] = resetEntry{merchantID: merchantID, expiry: expiry}
	return nil
}

func (s *Service) ValidatePasswordResetToken(ctx context.Context, token string) (string, error) {
	resetMu.Lock()
	defer resetMu.Unlock()
	entry, ok := resetTokens[token]
	if !ok {
		return "", fmt.Errorf("token not found")
	}
	if time.Now().After(entry.expiry) {
		delete(resetTokens, token)
		return "", fmt.Errorf("token expired")
	}
	delete(resetTokens, token) // one-time use
	return entry.merchantID, nil
}

func (s *Service) ResetPassword(ctx context.Context, merchantID, newPassword string) error {
	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.repo.UpdateMerchantPassword(ctx, merchantID, hash)
}
