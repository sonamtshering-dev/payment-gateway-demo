package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) GetProviders(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantProvider, error) {
	providers, err := s.repo.GetMerchantProviders(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	for i := range providers {
		decrypted, err := utils.Decrypt(providers[i].UPIID, s.config.Security.EncryptionKey)
		if err == nil && len(decrypted) > 7 {
			providers[i].UPIID = decrypted[:3] + "****" + decrypted[len(decrypted)-4:]
		}
	}
	return providers, nil
}

func (s *Service) ConnectProvider(ctx context.Context, merchantID uuid.UUID, req models.ConnectProviderRequest) (*models.MerchantProvider, error) {
	if !utils.ValidateUPIID(req.UPIID) {
		return nil, fmt.Errorf("invalid UPI ID format")
	}
	encryptedUPI, err := utils.Encrypt(req.UPIID, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt UPI ID: %w", err)
	}
	existing, err := s.repo.GetMerchantProviders(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	p := &models.MerchantProvider{
		ID:           uuid.New(),
		MerchantID:   merchantID,
		Provider:     req.Provider,
		MerchantName: req.MerchantName,
		MerchantMID:  req.MerchantMID,
		UPIID:        encryptedUPI,
		IsActive:     true,
		IsDefault:    len(existing) == 0,
	}
	if err := s.repo.CreateMerchantProvider(ctx, p); err != nil {
		return nil, fmt.Errorf("failed to save provider: %w", err)
	}
	upi := &models.MerchantUPI{
		ID:         uuid.New(),
		MerchantID: merchantID,
		UPIID:      encryptedUPI,
		Label:      req.Provider + " - " + req.MerchantName,
		IsActive:   true,
		Priority:   len(existing),
	}
	s.repo.AddMerchantUPI(ctx, upi)
	if len(req.UPIID) > 7 {
		p.UPIID = req.UPIID[:3] + "****" + req.UPIID[len(req.UPIID)-4:]
	}
	return p, nil
}

func (s *Service) UpdateProvider(ctx context.Context, providerID, merchantID uuid.UUID, req models.UpdateProviderRequest) error {
	if req.UPIID != nil {
		if !utils.ValidateUPIID(*req.UPIID) {
			return fmt.Errorf("invalid UPI ID format")
		}
		encrypted, err := utils.Encrypt(*req.UPIID, s.config.Security.EncryptionKey)
		if err != nil {
			return err
		}
		req.UPIID = &encrypted
	}
	return s.repo.UpdateMerchantProvider(ctx, providerID, merchantID, req)
}

func (s *Service) DeleteProvider(ctx context.Context, providerID, merchantID uuid.UUID) error {
	return s.repo.DeleteMerchantProvider(ctx, providerID, merchantID)
}
