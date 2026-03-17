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
	} else if plan.BillingCycle == "per year" {
		exp := time.Now().AddDate(1, 0, 0)
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

	// Get admin's UPI directly — bypasses KYC/subscription gating
	upi, err := s.repo.GetNextUPIForRotation(ctx, adminMerchant.ID)
	if err != nil || upi == nil {
		return nil, fmt.Errorf("platform UPI not configured. Contact support")
	}

	decryptedUPI, err := utils.Decrypt(upi.UPIID, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("payment configuration error")
	}

	orderID := fmt.Sprintf("SUB-%s-%d", planID.String()[:8], time.Now().Unix())
	upiLink := utils.GenerateUPILink(decryptedUPI, "NovaPay Subscription", plan.Price, orderID)
	qrBase64, err := utils.GenerateQRBase64(upiLink)
	if err != nil {
		return nil, err
	}

	paymentID := utils.NewID()
	expires := time.Now().Add(5 * time.Minute)
	payment := &models.Payment{
		ID:                paymentID,
		MerchantID:        adminMerchant.ID,
		OrderID:           orderID,
		Amount:            plan.Price,
		Currency:          "INR",
		Status:            models.PaymentStatusPending,
		CustomerReference: fmt.Sprintf("Subscription: %s plan for %s", plan.Name, merchantID.String()[:8]),
		UPIID:             upi.UPIID,
		UPIIntentLink:     upiLink,
		QRCodeData:        qrBase64,
		ExpiresAt:         expires,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := s.repo.CreatePayment(ctx, payment); err != nil {
		return nil, err
	}

	return &models.CreatePaymentResponse{
		QRCodeBase64:  qrBase64,
		PaymentID:     paymentID,
		UPIIntentLink: upiLink,
		Amount:        plan.Price,
		Currency:      "INR",
		ExpiresAt:     expires,
		Status:        "pending",
	}, nil
}
