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
		if sub != nil && sub.Status == "expired" {
			return fmt.Errorf("SUBSCRIPTION_EXPIRED: Your subscription has expired. Please renew to continue using the gateway")
		}
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


	// Check plan limits
	sub2, _ := s.repo.GetMerchantSubscription(ctx, merchantID)
	if sub2 != nil {
		plan, _ := s.repo.GetPlanByID(ctx, sub2.PlanID)
		if plan != nil {
			qrUsed, linksActive, apiToday, _ := s.repo.GetMerchantUsage(ctx, merchantID)
			if plan.QRLimit > 0 && qrUsed >= plan.QRLimit {
				return fmt.Errorf("QR_LIMIT_REACHED: You have reached your plan limit of %d QR codes. Please upgrade your plan", plan.QRLimit)
			}
			if plan.LinkLimit > 0 && linksActive >= plan.LinkLimit {
				return fmt.Errorf("LINK_LIMIT_REACHED: You have reached your plan limit of %d active payment links. Please upgrade your plan", plan.LinkLimit)
			}
			if plan.APILimit > 0 && apiToday >= plan.APILimit {
				return fmt.Errorf("API_LIMIT_REACHED: You have reached your daily API limit of %d calls. Limit resets every 24 hours", plan.APILimit)
			}
		}
	}

	return nil
}
