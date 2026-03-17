package providers

import (
	"context"
	
	"fmt"
	"github.com/upay/gateway/internal/utils"

	
)

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

// PaymentProvider abstracts the payment generation and verification layer.
// Implement this interface for each payment processor (UPI direct, Cash-pe, Razorpay, etc.)
type PaymentProvider interface {
	// Name returns the provider identifier
	Name() string

	// GeneratePaymentLink creates the payment URI for the given parameters
	GeneratePaymentLink(params PaymentLinkParams) (string, error)

	// GenerateQRCode returns a base64-encoded PNG QR code for the payment link
	GenerateQRCode(paymentLink string, size int) (string, error)

	// ValidateUPIID checks if a UPI VPA format is valid
	ValidateUPIID(upiID string) bool
}

type PaymentLinkParams struct {
	UPIID        string
	MerchantName string
	Amount       int64  // in paise
	OrderID      string
	Currency     string
}

// ============================================================================
// UPI DIRECT PROVIDER (default — generates standard UPI intent links)
// ============================================================================

type UPIDirectProvider struct{}

func NewUPIDirectProvider() *UPIDirectProvider {
	return &UPIDirectProvider{}
}

func (p *UPIDirectProvider) Name() string {
	return "upi_direct"
}

func (p *UPIDirectProvider) GeneratePaymentLink(params PaymentLinkParams) (string, error) {
	if params.UPIID == "" || params.MerchantName == "" || params.Amount < 100 {
		return "", fmt.Errorf("invalid payment parameters")
	}

	amountStr := fmt.Sprintf("%.2f", float64(params.Amount)/100.0)

	// Standard UPI intent URI format per NPCI specification
	link := fmt.Sprintf(
		"upi://pay?pa=%s&pn=%s&am=%s&cu=%s&tn=%s&mode=02&purpose=00",
		params.UPIID,
		params.MerchantName,
		amountStr,
		params.Currency,
		params.OrderID,
	)

	return link, nil
}

func (p *UPIDirectProvider) GenerateQRCode(paymentLink string, size int) (string, error) {
	if size <= 0 {
		size = 512
	}

	qrData, err := utils.GenerateQRBase64(paymentLink)
	if err != nil {
		return "", fmt.Errorf("QR code generation failed: %w", err)
	}

	return qrData, nil
}

func (p *UPIDirectProvider) ValidateUPIID(upiID string) bool {
	// Basic UPI VPA validation: must contain @ with valid characters
	atIdx := -1
	for i, ch := range upiID {
		if ch == '@' {
			if atIdx != -1 {
				return false // multiple @
			}
			atIdx = i
		}
	}

	if atIdx < 1 || atIdx >= len(upiID)-2 {
		return false
	}

	return true
}

// ============================================================================
// CASH-PE PROVIDER (stub — implement with actual Cash-pe API)
// ============================================================================

type CashPeProvider struct {
	apiKey    string
	apiSecret string
	baseURL   string
}

type CashPeConfig struct {
	APIKey    string
	APISecret string
	BaseURL   string // e.g., https://api.cash-pe.in/v1
}

func NewCashPeProvider(cfg CashPeConfig) *CashPeProvider {
	return &CashPeProvider{
		apiKey:    cfg.APIKey,
		apiSecret: cfg.APISecret,
		baseURL:   cfg.BaseURL,
	}
}

func (p *CashPeProvider) Name() string {
	return "cashpe"
}

func (p *CashPeProvider) GeneratePaymentLink(params PaymentLinkParams) (string, error) {
	// TODO: Implement Cash-pe API integration
	// 1. POST to Cash-pe /create-order with merchant credentials
	// 2. Cash-pe returns a payment URL or UPI link
	// 3. Return the link
	//
	// Example:
	// resp, err := http.Post(p.baseURL+"/create-order", "application/json", body)
	// ...
	// return resp.PaymentURL, nil

	return "", fmt.Errorf("Cash-pe provider not yet implemented — use UPI direct")
}

func (p *CashPeProvider) GenerateQRCode(paymentLink string, size int) (string, error) {
	// Cash-pe may provide its own QR, or we generate one from the payment link
	if size <= 0 {
		size = 512
	}

	qrData, err := utils.GenerateQRBase64(paymentLink)
	if err != nil {
		return "", fmt.Errorf("QR code generation failed: %w", err)
	}

	return qrData, nil
}

func (p *CashPeProvider) ValidateUPIID(upiID string) bool {
	// Cash-pe may have its own validation rules
	return (&UPIDirectProvider{}).ValidateUPIID(upiID)
}

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

type Registry struct {
	providers map[string]PaymentProvider
	defaultID string
}

func NewRegistry() *Registry {
	return &Registry{
		providers: make(map[string]PaymentProvider),
	}
}

func (r *Registry) Register(provider PaymentProvider) {
	r.providers[provider.Name()] = provider
}

func (r *Registry) SetDefault(name string) {
	r.defaultID = name
}

func (r *Registry) Get(name string) (PaymentProvider, error) {
	p, ok := r.providers[name]
	if !ok {
		return nil, fmt.Errorf("payment provider %q not registered", name)
	}
	return p, nil
}

func (r *Registry) Default() PaymentProvider {
	if p, ok := r.providers[r.defaultID]; ok {
		return p
	}
	// Fallback to UPI direct
	return NewUPIDirectProvider()
}

// InitProviders creates and registers all configured providers
func InitProviders(ctx context.Context) *Registry {
	registry := NewRegistry()

	// Always register UPI direct
	upiDirect := NewUPIDirectProvider()
	registry.Register(upiDirect)
	registry.SetDefault("upi_direct")

	// Register Cash-pe if configured
	// cashpeCfg := CashPeConfig{...}
	// registry.Register(NewCashPeProvider(cashpeCfg))

	return registry
}
