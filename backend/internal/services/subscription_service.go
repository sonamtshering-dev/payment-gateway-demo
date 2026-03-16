package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) GetSubscription(ctx context.Context, merchantID uuid.UUID) (*repository.MerchantSubscription, error) {
	return s.repo.GetMerchantSubscription(ctx, merchantID)
}

func (s *Service) CreateSubscription(ctx context.Context, merchantID, planID uuid.UUID) (*repository.MerchantSubscription, error) {
	plan, err := s.repo.GetPlanByID(ctx, planID)
	if err != nil || plan == nil {
		return nil, fmt.Errorf("plan not found")
	}
	sub := &repository.MerchantSubscription{
		ID:         utils.NewID(),
		MerchantID: merchantID,
		PlanID:     planID,
		Status:     "active",
		StartedAt:  time.Now(),
	}
	if plan.BillingCycle == "per month" {
		exp := time.Now().AddDate(0, 1, 0)
		sub.ExpiresAt = &exp
	}
	if err := s.repo.UpsertMerchantSubscription(ctx, sub); err != nil {
		return nil, fmt.Errorf("failed to save subscription: %w", err)
	}
	return sub, nil
}

func (s *Service) CancelSubscription(ctx context.Context, merchantID uuid.UUID) error {
	return s.repo.CancelMerchantSubscription(ctx, merchantID)
}

func (s *Service) GetSubscriptionWithPlan(ctx context.Context, merchantID uuid.UUID) (map[string]interface{}, error) {
	sub, err := s.repo.GetMerchantSubscription(ctx, merchantID)
	if err != nil || sub == nil {
		return nil, err
	}
	plan, err := s.repo.GetPlanByID(ctx, sub.PlanID)
	if err != nil || plan == nil {
		return map[string]interface{}{"subscription": sub}, nil
	}
	return map[string]interface{}{
		"subscription": sub,
		"plan":         plan,
	}, nil
}


func (s *Service) CreateSubscriptionPayment(ctx context.Context, merchantID uuid.UUID, planID uuid.UUID) (*models.CreatePaymentResponse, error) {
	plan, err := s.repo.GetPlanByID(ctx, planID)
	if err != nil || plan == nil {
		return nil, fmt.Errorf("plan not found")
	}
	if plan.Price == 0 {
		return nil, fmt.Errorf("free plans do not require payment")
	}

	// Get admin merchant account
	adminMerchant, err := s.repo.GetAdminMerchant(ctx)
	if err != nil || adminMerchant == nil {
		return nil, fmt.Errorf("platform account not configured. Contact support")
	}

	// Create payment under admin's account — their UPI will receive the money
	req := models.CreatePaymentRequest{
		MerchantID:        adminMerchant.ID.String(),
		OrderID:           fmt.Sprintf("SUB-%s-%d", planID.String()[:8], time.Now().Unix()),
		Amount:            plan.Price,
		Currency:          "INR",
		CustomerReference: fmt.Sprintf("Subscription: %s plan", plan.Name),
	}

	return s.CreatePayment(ctx, req, "subscription")
}
