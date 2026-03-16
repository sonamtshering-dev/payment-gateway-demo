package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) GetKYC(ctx context.Context, merchantID uuid.UUID) (*repository.MerchantKYC, error) {
	return s.repo.GetMerchantKYC(ctx, merchantID)
}

func (s *Service) SubmitKYC(ctx context.Context, merchantID uuid.UUID, aadhaar, pan, business, bankAcc, bankIFSC, bankName string) (*repository.MerchantKYC, error) {
	existing, _ := s.repo.GetMerchantKYC(ctx, merchantID)
	if existing != nil && existing.Status == "approved" {
		return nil, fmt.Errorf("KYC already approved")
	}
	now := time.Now()
	kyc := &repository.MerchantKYC{
		ID:            utils.NewID(),
		MerchantID:    merchantID,
		AadhaarNumber: aadhaar,
		PANNumber:     pan,
		BusinessName:  business,
		BankAccount:   bankAcc,
		BankIFSC:      bankIFSC,
		BankName:      bankName,
		Status:        "pending",
		SubmittedAt:   &now,
	}
	if err := s.repo.UpsertMerchantKYC(ctx, kyc); err != nil {
		return nil, fmt.Errorf("failed to submit KYC: %w", err)
	}
	return kyc, nil
}
