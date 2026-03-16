package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// CheckMerchantGating verifies KYC, subscription, and UPI before allowing payment creation
func (s *Service) CheckMerchantGating(ctx context.Context, merchantID uuid.UUID) error {
	// Check KYC
	kyc, err := s.repo.GetMerchantKYC(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("failed to check KYC status")
	}
	if kyc == nil || kyc.Status != "approved" {
		status := "not submitted"
		if kyc != nil {
			status = kyc.Status
		}
		return fmt.Errorf("KYC_REQUIRED: KYC verification is %s. Please complete KYC to use the gateway", status)
	}

	// Check active subscription
	sub, err := s.repo.GetMerchantSubscription(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("failed to check subscription")
	}
	if sub == nil || sub.Status != "active" {
		return fmt.Errorf("SUBSCRIPTION_REQUIRED: No active subscription found. Please purchase a plan to use the gateway")
	}

	// Check UPI configured
	upis, err := s.repo.GetActiveUPIs(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("failed to check UPI configuration")
	}
	if len(upis) == 0 {
		return fmt.Errorf("UPI_REQUIRED: No UPI ID configured. Please add a UPI ID in Settings to receive payments")
	}

	return nil
}
