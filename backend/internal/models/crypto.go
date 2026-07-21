package models

import (
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// CRYPTO / USDT MODELS
// ============================================================================

type CryptoPricingMode string

const (
	PricingModeLive       CryptoPricingMode = "live"
	PricingModeFixed      CryptoPricingMode = "fixed"
	PricingModeLiveAdjust CryptoPricingMode = "live_adjustment"
)

// MerchantCryptoConfig is the per-merchant USDT settings row.
type MerchantCryptoConfig struct {
	MerchantID            uuid.UUID `json:"merchant_id" db:"merchant_id"`
	USDTEnabled           bool      `json:"usdt_enabled" db:"usdt_enabled"`
	PricingMode           string    `json:"pricing_mode" db:"pricing_mode"`
	FixedRate             float64   `json:"fixed_rate" db:"fixed_rate"`             // INR per 1 USDT
	AdjustmentPct         float64   `json:"adjustment_pct" db:"adjustment_pct"`     // +/- %
	RequiredConfirmations int       `json:"required_confirmations" db:"required_confirmations"`
	PaymentTimeoutMin     int       `json:"payment_timeout_min" db:"payment_timeout_min"`
	AutoVerify            bool      `json:"auto_verify" db:"auto_verify"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`
}

// MerchantCryptoWallet is one wallet address for one network.
type MerchantCryptoWallet struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Network    string    `json:"network" db:"network"`
	Address    string    `json:"address" db:"address"`
	IsActive   bool      `json:"is_active" db:"is_active"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

// CryptoPayment is a single USDT payment attempt bound to an INR order.
type CryptoPayment struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	PaymentID       uuid.UUID  `json:"payment_id" db:"payment_id"`
	MerchantID      uuid.UUID  `json:"merchant_id" db:"merchant_id"`
	Network         string     `json:"network" db:"network"`
	TokenContract   string     `json:"token_contract" db:"token_contract"`
	MerchantWallet  string     `json:"merchant_wallet" db:"merchant_wallet"`
	INRAmount       int64      `json:"inr_amount" db:"inr_amount"` // paise
	ExchangeRate    float64    `json:"exchange_rate" db:"exchange_rate"`
	PricingMode     string     `json:"pricing_mode" db:"pricing_mode"`
	BaseUSDT        string     `json:"base_usdt" db:"base_usdt"`         // NUMERIC as string for precision
	ExpectedUSDT    string     `json:"expected_usdt" db:"expected_usdt"` // exact amount to send
	Status          string     `json:"status" db:"status"`
	TxHash          *string    `json:"tx_hash,omitempty" db:"tx_hash"`
	SenderAddress   *string    `json:"sender_address,omitempty" db:"sender_address"`
	RecipientAddr   *string    `json:"recipient_address,omitempty" db:"recipient_address"`
	AmountReceived  *string    `json:"amount_received,omitempty" db:"amount_received"`
	BlockNumber     *int64     `json:"block_number,omitempty" db:"block_number"`
	Confirmations   *int       `json:"confirmations,omitempty" db:"confirmations"`
	TxTimestamp     *time.Time `json:"tx_timestamp,omitempty" db:"tx_timestamp"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty" db:"verified_at"`
	ExplorerURL     *string    `json:"explorer_url,omitempty" db:"explorer_url"`
	Provider        *string    `json:"provider,omitempty" db:"provider"`
	ExpiresAt       time.Time  `json:"expires_at" db:"expires_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// ============================================================================
// DASHBOARD REQUESTS (JWT)
// ============================================================================

type UpdateCryptoConfigRequest struct {
	USDTEnabled           bool    `json:"usdt_enabled"`
	PricingMode           string  `json:"pricing_mode"`
	FixedRate             float64 `json:"fixed_rate"`
	AdjustmentPct         float64 `json:"adjustment_pct"`
	RequiredConfirmations int     `json:"required_confirmations"`
	PaymentTimeoutMin     int     `json:"payment_timeout_min"`
	AutoVerify            bool    `json:"auto_verify"`
}

type SaveCryptoWalletRequest struct {
	Network string `json:"network"`
	Address string `json:"address"`
}

// ============================================================================
// PUBLIC CHECKOUT REQUESTS / RESPONSES
// ============================================================================

// CryptoInitRequest is sent when the customer picks USDT + a network.
type CryptoInitRequest struct {
	Network string `json:"network"`
}

// CryptoInitResponse is what the checkout page renders for the USDT flow.
type CryptoInitResponse struct {
	CryptoPaymentID string  `json:"crypto_payment_id"`
	Network         string  `json:"network"`
	NetworkLabel    string  `json:"network_label"`
	MerchantWallet  string  `json:"merchant_wallet"`
	ExpectedUSDT    string  `json:"expected_usdt"`
	ExchangeRate    float64 `json:"exchange_rate"`
	PricingMode     string  `json:"pricing_mode"`
	INRAmount       int64   `json:"inr_amount"`
	QRCodeBase64    string  `json:"qr_code_base64"`
	ExpiresAt       time.Time `json:"expires_at"`
	Status          string  `json:"status"`
}

// CryptoVerifyRequest carries the pasted transaction hash.
type CryptoVerifyRequest struct {
	CryptoPaymentID string `json:"crypto_payment_id"`
	TxHash          string `json:"tx_hash"`
}

// ============================================================================
// BLOCKCHAIN VERIFICATION RESULT (internal, from provider adapters)
// ============================================================================

// CryptoVerificationLog is an immutable record of a verification attempt.
type CryptoVerificationLog struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	CryptoPaymentID *uuid.UUID `json:"crypto_payment_id" db:"crypto_payment_id"`
	PaymentID       *uuid.UUID `json:"payment_id" db:"payment_id"`
	MerchantID      *uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Network         string     `json:"network" db:"network"`
	TxHash          string     `json:"tx_hash" db:"tx_hash"`
	Result          string     `json:"result" db:"result"`
	Reason          string     `json:"reason" db:"reason"`
	Provider        string     `json:"provider" db:"provider"`
	IP              string     `json:"ip" db:"ip"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

// OnChainTransfer is the normalized USDT transfer parsed from any chain.
type OnChainTransfer struct {
	Found         bool
	Success       bool      // transaction executed successfully on-chain
	Recipient     string    // normalized lowercase (EVM) or base58 (Tron)
	Sender        string
	AmountRaw     string    // base units as decimal string
	AmountHuman   string    // human units (decimals applied) as decimal string
	Confirmations int
	BlockNumber   int64
	Timestamp     time.Time
	TokenContract string
	Provider      string
}
