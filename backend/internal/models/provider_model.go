package models

import (
	"time"

	"github.com/google/uuid"
)

type MerchantProvider struct {
	ID           uuid.UUID `json:"id"            db:"id"`
	MerchantID   uuid.UUID `json:"merchant_id"   db:"merchant_id"`
	Provider     string    `json:"provider"      db:"provider"`
	MerchantName string    `json:"merchant_name" db:"merchant_name"`
	MerchantMID  string    `json:"merchant_mid"  db:"merchant_mid"`
	UPIID        string    `json:"upi_id"        db:"upi_id"` // stored encrypted, returned masked
	IsActive     bool      `json:"is_active"     db:"is_active"`
	IsDefault    bool      `json:"is_default"    db:"is_default"`
	CreatedAt    time.Time `json:"created_at"    db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"    db:"updated_at"`
}

type ConnectProviderRequest struct {
	Provider     string `json:"provider"      binding:"required,oneof=upi_direct phonepe paytm gpay bharatpe other"`
	MerchantName string `json:"merchant_name" binding:"required,min=2,max=100"`
	MerchantMID  string `json:"merchant_mid"  binding:"omitempty,max=100"`
	UPIID        string `json:"upi_id"        binding:"required"`
}

type UpdateProviderRequest struct {
	MerchantName *string `json:"merchant_name"`
	MerchantMID  *string `json:"merchant_mid"`
	UPIID        *string `json:"upi_id"`
	IsActive     *bool   `json:"is_active"`
	IsDefault    *bool   `json:"is_default"`
}