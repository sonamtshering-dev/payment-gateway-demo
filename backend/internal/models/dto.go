package models

import (
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// AUTH DTOs
// ============================================================================

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=128"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	ExpiresIn    int64    `json:"expires_in"`
	Merchant     MerchantPublic `json:"merchant"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type MerchantPublic struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	APIKey    string    `json:"api_key"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// ============================================================================
// PAYMENT DTOs
// ============================================================================

type CreatePaymentRequest struct {
	MerchantID        string `json:"merchant_id" binding:"required,uuid"`
	OrderID           string `json:"order_id" binding:"required,min=1,max=64"`
	Amount            int64  `json:"amount" binding:"required,min=100"` // min ₹1 (100 paise)
	Currency          string `json:"currency" binding:"required,eq=INR"`
	CustomerReference string `json:"customer_reference" binding:"max=128"`
}

type CreatePaymentResponse struct {
	PaymentID     uuid.UUID `json:"payment_id"`
	UPIIntentLink string    `json:"upi_intent_link"`
	QRCodeBase64  string    `json:"qr_code_base64"`
	Amount        int64     `json:"amount"`
	Currency      string    `json:"currency"`
	ExpiresAt     time.Time `json:"expires_at"`
	Status        string    `json:"status"`
}

type PaymentStatusResponse struct {
	PaymentID     uuid.UUID     `json:"payment_id"`
	OrderID       string        `json:"order_id"`
	MerchantID    uuid.UUID     `json:"merchant_id"`
	Amount        int64         `json:"amount"`
	Currency      string        `json:"currency"`
	Status        PaymentStatus `json:"status"`
	UTR           *string       `json:"utr,omitempty"`
	PaidAt        *time.Time    `json:"paid_at,omitempty"`
	ExpiresAt     time.Time     `json:"expires_at"`
	CreatedAt     time.Time     `json:"created_at"`
}

type VerifyPaymentRequest struct {
	PaymentID string `json:"payment_id" binding:"required,uuid"`
	UTR       string `json:"utr" binding:"required,min=6,max=32"`
	Amount    int64  `json:"amount" binding:"required,min=100"`
}

// ============================================================================
// MERCHANT SETTINGS DTOs
// ============================================================================

type AddUPIRequest struct {
	UPIID    string `json:"upi_id" binding:"required,min=5,max=50"`
	Label    string `json:"label" binding:"max=50"`
	Priority int    `json:"priority"`
}

type UpdateWebhookRequest struct {
	WebhookURL string `json:"webhook_url" binding:"required,url"`
}

type AddCashierRequest struct {
	Phone string `json:"phone" binding:"required,min=10,max=15"`
	Name  string `json:"name" binding:"required,max=50"`
}

// ============================================================================
// WEBHOOK PAYLOAD
// ============================================================================

type WebhookPayload struct {
	PaymentID string `json:"payment_id"`
	OrderID   string `json:"order_id"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	Status    string `json:"status"`
	UTR       string `json:"utr,omitempty"`
	Timestamp int64  `json:"timestamp"`
	Signature string `json:"signature"`
}

// ============================================================================
// DASHBOARD / ANALYTICS DTOs
// ============================================================================

type DashboardStats struct {
	TotalTransactions  int64   `json:"total_transactions"`
	SuccessfulPayments int64   `json:"successful_payments"`
	FailedPayments     int64   `json:"failed_payments"`
	PendingPayments    int64   `json:"pending_payments"`
	TotalVolume        int64   `json:"total_volume"` // in paise
	SuccessRate        float64 `json:"success_rate"`
	TodayTransactions  int64   `json:"today_transactions"`
	TodayVolume        int64   `json:"today_volume"`
}

type TransactionFilter struct {
	Status    string `form:"status"`
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Page      int    `form:"page,default=1"`
	Limit     int    `form:"limit,default=20"`
	OrderID   string `form:"order_id"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	Total      int64       `json:"total"`
	TotalPages int         `json:"total_pages"`
}

// ============================================================================
// ADMIN DTOs
// ============================================================================

type AdminMerchantFilter struct {
	IsActive *bool  `form:"is_active"`
	Search   string `form:"search"`
	Page     int    `form:"page,default=1"`
	Limit    int    `form:"limit,default=20"`
}

type AdminFraudFilter struct {
	Severity string `form:"severity"`
	Resolved *bool  `form:"resolved"`
	Page     int    `form:"page,default=1"`
	Limit    int    `form:"limit,default=20"`
}

// ============================================================================
// GENERIC
// ============================================================================

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
}
