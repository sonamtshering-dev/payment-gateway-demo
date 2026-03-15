package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	qrcode "github.com/skip2/go-qrcode"
	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/utils"
)

type Service struct {
	repo   *repository.Repository
	redis  *redis.Client
	config *config.Config
}

func New(repo *repository.Repository, redis *redis.Client, cfg *config.Config) *Service {
	return &Service{repo: repo, redis: redis, config: cfg}
}

// ============================================================================
// AUTH SERVICE
// ============================================================================

func (s *Service) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {
	// Check if merchant exists
	existing, err := s.repo.GetMerchantByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	// Hash password
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Generate API credentials
	apiKey, err := utils.GenerateAPIKey()
	if err != nil {
		return nil, err
	}
	apiSecret, err := utils.GenerateAPISecret()
	if err != nil {
		return nil, err
	}
	webhookSecret, err := utils.GenerateWebhookSecret()
	if err != nil {
		return nil, err
	}

	// Encrypt the API secret before storage
	encryptedSecret, err := utils.Encrypt(apiSecret, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt secret: %w", err)
	}

	merchant := &models.Merchant{
		ID:            uuid.New(),
		Name:          req.Name,
		Email:         req.Email,
		PasswordHash:  passwordHash,
		APIKey:        apiKey,
		APISecret:     encryptedSecret,
		WebhookSecret: webhookSecret,
		IsActive:      true,
		IsAdmin:       false,
		DailyLimit:    10000000, // ₹1,00,000 default daily limit
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.repo.CreateMerchant(ctx, merchant); err != nil {
		return nil, fmt.Errorf("failed to create merchant: %w", err)
	}

	// Generate tokens
	return s.generateAuthResponse(ctx, merchant, apiSecret)
}

func (s *Service) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	merchant, err := s.repo.GetMerchantByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	if merchant == nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !utils.CheckPassword(req.Password, merchant.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !merchant.IsActive {
		return nil, fmt.Errorf("account deactivated")
	}

	// Decrypt API secret for response
	apiSecret, err := utils.Decrypt(merchant.APISecret, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("internal error")
	}

	return s.generateAuthResponse(ctx, merchant, apiSecret)
}

func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	tokenHash := utils.HashToken(refreshToken)
	rt, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	if rt == nil {
		return nil, fmt.Errorf("invalid refresh token")
	}

	// Revoke old token (rotation)
	if err := s.repo.RevokeRefreshToken(ctx, tokenHash); err != nil {
		return nil, err
	}

	merchant, err := s.repo.GetMerchantByID(ctx, rt.MerchantID)
	if err != nil || merchant == nil {
		return nil, fmt.Errorf("merchant not found")
	}

	apiSecret, err := utils.Decrypt(merchant.APISecret, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("internal error")
	}

	return s.generateAuthResponse(ctx, merchant, apiSecret)
}

func (s *Service) generateAuthResponse(ctx context.Context, merchant *models.Merchant, plainSecret string) (*models.AuthResponse, error) {
	accessToken, err := utils.GenerateAccessToken(
		merchant.ID, merchant.Email, merchant.IsAdmin,
		s.config.JWT.AccessSecret, s.config.JWT.AccessExpiry,
	)
	if err != nil {
		return nil, err
	}

	refreshToken, err := utils.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	// Store refresh token hash
	rt := &models.RefreshToken{
		ID:         uuid.New(),
		MerchantID: merchant.ID,
		TokenHash:  utils.HashToken(refreshToken),
		ExpiresAt:  time.Now().Add(s.config.JWT.RefreshExpiry),
		Revoked:    false,
		CreatedAt:  time.Now(),
	}
	if err := s.repo.SaveRefreshToken(ctx, rt); err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.config.JWT.AccessExpiry.Seconds()),
		Merchant: models.MerchantPublic{
			ID:        merchant.ID,
			Name:      merchant.Name,
			Email:     merchant.Email,
			APIKey:    merchant.APIKey,
			IsActive:  merchant.IsActive,
			CreatedAt: merchant.CreatedAt,
		},
	}, nil
}

// ============================================================================
// PAYMENT SERVICE
// ============================================================================

func (s *Service) CreatePayment(ctx context.Context, req models.CreatePaymentRequest, clientIP string) (*models.CreatePaymentResponse, error) {
	merchantID, err := uuid.Parse(req.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("invalid merchant_id")
	}

	// Verify merchant exists and is active
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	if merchant == nil || !merchant.IsActive {
		return nil, fmt.Errorf("merchant not found or inactive")
	}

	// Check duplicate order ID
	isDup, err := s.repo.CheckDuplicateOrderID(ctx, merchantID, req.OrderID)
	if err != nil {
		return nil, err
	}
	if isDup {
		return nil, fmt.Errorf("duplicate order_id: %s", req.OrderID)
	}

	// Check daily transaction limit
	dailyVolume, err := s.repo.GetMerchantDailyVolume(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	if dailyVolume+req.Amount > merchant.DailyLimit {
		return nil, fmt.Errorf("daily transaction limit exceeded")
	}

	// Get UPI ID with rotation
	upi, err := s.repo.GetNextUPIForRotation(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	if upi == nil {
		return nil, fmt.Errorf("no active UPI IDs configured for merchant")
	}

	// Decrypt UPI ID
	decryptedUPI, err := utils.Decrypt(upi.UPIID, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("internal error decrypting UPI")
	}

	// Generate UPI intent link
	upiLink := utils.GenerateUPILink(decryptedUPI, merchant.Name, req.Amount, req.OrderID)

	// Generate QR code
	qrBytes, err := qrcode.Encode(upiLink, qrcode.Medium, 512)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %w", err)
	}
	qrBase64 := base64.StdEncoding.EncodeToString(qrBytes)

	paymentID := uuid.New()
	expiresAt := time.Now().Add(s.config.Security.PaymentSessionTTL)

	payment := &models.Payment{
		ID:                paymentID,
		MerchantID:        merchantID,
		OrderID:           req.OrderID,
		Amount:            req.Amount,
		Currency:          req.Currency,
		Status:            models.PaymentStatusPending,
		CustomerReference: req.CustomerReference,
		UPIID:             upi.UPIID, // store encrypted
		UPIIntentLink:     upiLink,
		QRCodeData:        qrBase64,
		ExpiresAt:         expiresAt,
		ClientIP:          clientIP,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.repo.CreatePayment(ctx, payment); err != nil {
		return nil, fmt.Errorf("failed to create payment: %w", err)
	}

	// Cache payment session in Redis for fast status checks
	sessionData, _ := json.Marshal(map[string]interface{}{
		"payment_id":  paymentID.String(),
		"merchant_id": merchantID.String(),
		"amount":      req.Amount,
		"status":      string(models.PaymentStatusPending),
		"expires_at":  expiresAt.Unix(),
	})
	s.redis.Set(ctx, fmt.Sprintf("payment:%s", paymentID.String()), sessionData, s.config.Security.PaymentSessionTTL)

	// Log transaction
	s.repo.CreateTransactionLog(ctx, &models.TransactionLog{
		ID:        uuid.New(),
		PaymentID: paymentID,
		Status:    string(models.PaymentStatusPending),
		Source:    "api",
		CreatedAt: time.Now(),
	})

	return &models.CreatePaymentResponse{
		PaymentID:     paymentID,
		UPIIntentLink: upiLink,
		QRCodeBase64:  qrBase64,
		Amount:        req.Amount,
		Currency:      req.Currency,
		ExpiresAt:     expiresAt,
		Status:        string(models.PaymentStatusPending),
	}, nil
}

func (s *Service) GetPaymentStatus(ctx context.Context, paymentID uuid.UUID) (*models.PaymentStatusResponse, error) {
	// Try Redis cache first
	cached, err := s.redis.Get(ctx, fmt.Sprintf("payment:%s", paymentID.String())).Result()
	if err == nil {
		var data map[string]interface{}
		if json.Unmarshal([]byte(cached), &data) == nil {
			// If paid or terminal, get full data from DB
			if status, ok := data["status"].(string); ok && status == "pending" {
				// Return cached pending status quickly
			}
		}
	}

	// Get from database
	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return nil, err
	}
	if payment == nil {
		return nil, fmt.Errorf("payment not found")
	}

	return &models.PaymentStatusResponse{
		PaymentID:  payment.ID,
		OrderID:    payment.OrderID,
		MerchantID: payment.MerchantID,
		Amount:     payment.Amount,
		Currency:   payment.Currency,
		Status:     payment.Status,
		UTR:        payment.UTR,
		PaidAt:     payment.PaidAt,
		ExpiresAt:  payment.ExpiresAt,
		CreatedAt:  payment.CreatedAt,
	}, nil
}

func (s *Service) VerifyPayment(ctx context.Context, req models.VerifyPaymentRequest, merchantID uuid.UUID) error {
	paymentID, err := uuid.Parse(req.PaymentID)
	if err != nil {
		return fmt.Errorf("invalid payment_id")
	}

	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return err
	}
	if payment == nil {
		return fmt.Errorf("payment not found")
	}

	// Verify merchant ownership
	if payment.MerchantID != merchantID {
		return fmt.Errorf("unauthorized")
	}

	// Check payment is still pending
	if payment.Status != models.PaymentStatusPending {
		return fmt.Errorf("payment is not in pending state, current: %s", payment.Status)
	}

	// Check expiry
	if time.Now().After(payment.ExpiresAt) {
		s.repo.UpdatePaymentStatus(ctx, paymentID, models.PaymentStatusExpired, nil)
		return fmt.Errorf("payment session expired")
	}

	// FRAUD CHECK: Duplicate UTR detection
	isDuplicate, err := s.repo.CheckDuplicateUTR(ctx, req.UTR)
	if err != nil {
		return err
	}
	if isDuplicate {
		// Create fraud alert
		s.repo.CreateFraudAlert(ctx, &models.FraudAlert{
			ID:         uuid.New(),
			PaymentID:  paymentID,
			MerchantID: merchantID,
			AlertType:  "duplicate_utr",
			Details:    fmt.Sprintf("UTR %s already used in another payment", req.UTR),
			Severity:   "high",
			CreatedAt:  time.Now(),
		})
		return fmt.Errorf("duplicate UTR detected")
	}

	// FRAUD CHECK: Amount mismatch
	if req.Amount != payment.Amount {
		s.repo.CreateFraudAlert(ctx, &models.FraudAlert{
			ID:         uuid.New(),
			PaymentID:  paymentID,
			MerchantID: merchantID,
			AlertType:  "amount_mismatch",
			Details:    fmt.Sprintf("Expected %d, got %d", payment.Amount, req.Amount),
			Severity:   "critical",
			CreatedAt:  time.Now(),
		})
		return fmt.Errorf("amount mismatch: expected %d, got %d", payment.Amount, req.Amount)
	}

	// Mark as paid
	utr := req.UTR
	if err := s.repo.UpdatePaymentStatus(ctx, paymentID, models.PaymentStatusPaid, &utr); err != nil {
		return err
	}

	// Update Redis cache
	s.redis.Set(ctx, fmt.Sprintf("payment:%s", paymentID.String()),
		fmt.Sprintf(`{"status":"paid","utr":"%s"}`, utr),
		30*time.Minute,
	)

	// Log transaction
	s.repo.CreateTransactionLog(ctx, &models.TransactionLog{
		ID:        uuid.New(),
		PaymentID: paymentID,
		Status:    string(models.PaymentStatusPaid),
		Source:    "api",
		CreatedAt: time.Now(),
	})

	// Dispatch webhook asynchronously
	go s.dispatchWebhook(context.Background(), payment, utr)

	return nil
}

// ============================================================================
// WEBHOOK DISPATCH
// ============================================================================

func (s *Service) dispatchWebhook(ctx context.Context, payment *models.Payment, utr string) {
	merchant, err := s.repo.GetMerchantByID(ctx, payment.MerchantID)
	if err != nil || merchant == nil || merchant.WebhookURL == "" {
		return
	}

	payload := models.WebhookPayload{
		PaymentID: payment.ID.String(),
		OrderID:   payment.OrderID,
		Amount:    payment.Amount,
		Currency:  payment.Currency,
		Status:    string(models.PaymentStatusPaid),
		UTR:       utr,
		Timestamp: time.Now().Unix(),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal webhook payload: %v", err)
		return
	}

	// Sign the payload
	payload.Signature = utils.ComputeWebhookSignature(merchant.WebhookSecret, payloadBytes)
	payloadBytes, _ = json.Marshal(payload)

	// Queue for delivery via Redis
	s.redis.LPush(ctx, "webhook:queue", string(payloadBytes))

	// Also store the delivery attempt
	s.repo.CreateWebhookDelivery(ctx, &models.WebhookDelivery{
		ID:          uuid.New(),
		PaymentID:   payment.ID,
		MerchantID:  merchant.ID,
		URL:         merchant.WebhookURL,
		Payload:     string(payloadBytes),
		Attempt:     0,
		Success:     false,
		NextRetryAt: timePtr(time.Now()),
		CreatedAt:   time.Now(),
	})
}

// ============================================================================
// MERCHANT SETTINGS
// ============================================================================

func (s *Service) AddUPI(ctx context.Context, merchantID uuid.UUID, req models.AddUPIRequest) error {
	if !utils.ValidateUPIID(req.UPIID) {
		return fmt.Errorf("invalid UPI ID format")
	}

	// Encrypt UPI ID before storage
	encryptedUPI, err := utils.Encrypt(req.UPIID, s.config.Security.EncryptionKey)
	if err != nil {
		return fmt.Errorf("failed to encrypt UPI ID: %w", err)
	}

	upi := &models.MerchantUPI{
		ID:         uuid.New(),
		MerchantID: merchantID,
		UPIID:      encryptedUPI,
		Label:      req.Label,
		IsActive:   true,
		Priority:   req.Priority,
		CreatedAt:  time.Now(),
	}

	return s.repo.AddMerchantUPI(ctx, upi)
}

func (s *Service) GetUPIs(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantUPI, error) {
	upis, err := s.repo.GetMerchantUPIs(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	// Decrypt UPI IDs for display (mask them partially)
	for i := range upis {
		decrypted, err := utils.Decrypt(upis[i].UPIID, s.config.Security.EncryptionKey)
		if err == nil {
			// Mask: show first 3 and last 4 chars
			if len(decrypted) > 7 {
				upis[i].UPIID = decrypted[:3] + "****" + decrypted[len(decrypted)-4:]
			}
		}
	}
	return upis, nil
}

func (s *Service) GetMerchantStats(ctx context.Context, merchantID uuid.UUID) (*models.DashboardStats, error) {
	return s.repo.GetMerchantStats(ctx, merchantID)
}

func (s *Service) GetMerchantTransactions(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) (*models.PaginatedResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 20
	}

	payments, total, err := s.repo.GetPaymentsByMerchant(ctx, merchantID, filter)
	if err != nil {
		return nil, err
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit != 0 {
		totalPages++
	}

	return &models.PaginatedResponse{
		Data:       payments,
		Page:       filter.Page,
		Limit:      filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (s *Service) UpdateWebhook(ctx context.Context, merchantID uuid.UUID, url string) error {
	return s.repo.UpdateMerchantWebhook(ctx, merchantID, url)
}

func (s *Service) DeleteUPI(ctx context.Context, upiID, merchantID uuid.UUID) error {
	return s.repo.DeleteMerchantUPI(ctx, upiID, merchantID)
}

func (s *Service) GetMerchantByID(ctx context.Context, id uuid.UUID) (*models.Merchant, error) {
	return s.repo.GetMerchantByID(ctx, id)
}

func (s *Service) GetPaymentByIDFull(ctx context.Context, id uuid.UUID) (*models.Payment, error) {
	return s.repo.GetPaymentByID(ctx, id)
}

// ============================================================================
// ADMIN SERVICE
// ============================================================================

func (s *Service) AdminListMerchants(ctx context.Context, filter models.AdminMerchantFilter) (*models.PaginatedResponse, error) {
	merchants, total, err := s.repo.ListMerchants(ctx, filter)
	if err != nil {
		return nil, err
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit != 0 {
		totalPages++
	}

	return &models.PaginatedResponse{
		Data:       merchants,
		Page:       filter.Page,
		Limit:      filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (s *Service) AdminGetFraudAlerts(ctx context.Context, filter models.AdminFraudFilter) (*models.PaginatedResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 20
	}

	alerts, total, err := s.repo.GetFraudAlerts(ctx, filter)
	if err != nil {
		return nil, err
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit != 0 {
		totalPages++
	}

	return &models.PaginatedResponse{
		Data:       alerts,
		Page:       filter.Page,
		Limit:      filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func timePtr(t time.Time) *time.Time {
	return &t
}
