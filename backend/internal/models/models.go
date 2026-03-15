package models

import (
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// MERCHANT
// ============================================================================

type Merchant struct {
	ID           uuid.UUID    `json:"id" db:"id"`
	Name         string       `json:"name" db:"name"`
	Email        string       `json:"email" db:"email"`
	PasswordHash string       `json:"-" db:"password_hash"`
	APIKey       string       `json:"api_key" db:"api_key"`
	APISecret    string       `json:"-" db:"api_secret"` // stored encrypted
	WebhookURL   string       `json:"webhook_url" db:"webhook_url"`
	WebhookSecret string      `json:"-" db:"webhook_secret"`
	IsActive     bool         `json:"is_active" db:"is_active"`
	IsAdmin      bool         `json:"is_admin" db:"is_admin"`
	DailyLimit   int64        `json:"daily_limit" db:"daily_limit"` // in paise
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
	UPIIDs       []MerchantUPI `json:"upi_ids,omitempty"`
}

type MerchantUPI struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	UPIID      string    `json:"upi_id" db:"upi_id"` // stored encrypted
	Label      string    `json:"label" db:"label"`
	IsActive   bool      `json:"is_active" db:"is_active"`
	Priority   int       `json:"priority" db:"priority"` // for rotation
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type CashierPhone struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Phone      string    `json:"phone" db:"phone"`
	Name       string    `json:"name" db:"name"`
	IsActive   bool      `json:"is_active" db:"is_active"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// ============================================================================
// PAYMENT
// ============================================================================

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "pending"
	PaymentStatusPaid    PaymentStatus = "paid"
	PaymentStatusFailed  PaymentStatus = "failed"
	PaymentStatusExpired PaymentStatus = "expired"
)

type Payment struct {
	ID                uuid.UUID     `json:"id" db:"id"`
	MerchantID        uuid.UUID     `json:"merchant_id" db:"merchant_id"`
	OrderID           string        `json:"order_id" db:"order_id"`
	Amount            int64         `json:"amount" db:"amount"` // in paise
	Currency          string        `json:"currency" db:"currency"`
	Status            PaymentStatus `json:"status" db:"status"`
	CustomerReference string        `json:"customer_reference" db:"customer_reference"`
	UPIID             string        `json:"upi_id" db:"upi_id"`
	UPIIntentLink     string        `json:"upi_intent_link" db:"upi_intent_link"`
	UTR               *string       `json:"utr,omitempty" db:"utr"`
	QRCodeData        string        `json:"-" db:"qr_code_data"` // base64 PNG
	ExpiresAt         time.Time     `json:"expires_at" db:"expires_at"`
	PaidAt            *time.Time    `json:"paid_at,omitempty" db:"paid_at"`
	ClientIP          string        `json:"-" db:"client_ip"`
	CreatedAt         time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at" db:"updated_at"`
}

// ============================================================================
// TRANSACTION LOG
// ============================================================================

type TransactionLog struct {
	ID          uuid.UUID `json:"id" db:"id"`
	PaymentID   uuid.UUID `json:"payment_id" db:"payment_id"`
	Status      string    `json:"status" db:"status"`
	RawResponse string    `json:"raw_response" db:"raw_response"`
	Source      string    `json:"source" db:"source"` // api, webhook, manual, worker
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

type WebhookDelivery struct {
	ID           uuid.UUID `json:"id" db:"id"`
	PaymentID    uuid.UUID `json:"payment_id" db:"payment_id"`
	MerchantID   uuid.UUID `json:"merchant_id" db:"merchant_id"`
	URL          string    `json:"url" db:"url"`
	Payload      string    `json:"payload" db:"payload"`
	ResponseCode int       `json:"response_code" db:"response_code"`
	ResponseBody string    `json:"response_body" db:"response_body"`
	Attempt      int       `json:"attempt" db:"attempt"`
	Success      bool      `json:"success" db:"success"`
	NextRetryAt  *time.Time `json:"next_retry_at,omitempty" db:"next_retry_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
}

// ============================================================================
// FRAUD ALERT
// ============================================================================

type FraudAlert struct {
	ID         uuid.UUID `json:"id" db:"id"`
	PaymentID  uuid.UUID `json:"payment_id" db:"payment_id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	AlertType  string    `json:"alert_type" db:"alert_type"` // duplicate_utr, amount_mismatch, rate_limit, etc.
	Details    string    `json:"details" db:"details"`
	Severity   string    `json:"severity" db:"severity"` // low, medium, high, critical
	Resolved   bool      `json:"resolved" db:"resolved"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// ============================================================================
// API AUDIT LOG
// ============================================================================

type AuditLog struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID *uuid.UUID `json:"merchant_id,omitempty" db:"merchant_id"`
	Action     string    `json:"action" db:"action"`
	Resource   string    `json:"resource" db:"resource"`
	IP         string    `json:"ip" db:"ip"`
	UserAgent  string    `json:"user_agent" db:"user_agent"`
	Details    string    `json:"details" db:"details"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

type RefreshToken struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	TokenHash  string    `json:"-" db:"token_hash"`
	ExpiresAt  time.Time `json:"expires_at" db:"expires_at"`
	Revoked    bool      `json:"revoked" db:"revoked"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}
