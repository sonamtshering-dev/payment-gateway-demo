package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/repository"
)

func (s *Service) AdminListKYC(ctx context.Context) ([]*repository.MerchantKYC, error) {
	return s.repo.AdminListKYC(ctx)
}

func (s *Service) AdminReviewKYC(ctx context.Context, merchantID uuid.UUID, status, reason string) error {
	if status != "approved" && status != "rejected" {
		return fmt.Errorf("invalid status")
	}
	return s.repo.AdminUpdateKYC(ctx, merchantID, status, reason)
}

func (s *Service) AdminExtendSubscription(ctx context.Context, merchantID uuid.UUID, days int) error {
	return s.repo.AdminExtendSubscription(ctx, merchantID, days)
}
