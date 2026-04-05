package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/logger"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/utils"
)

type Service struct {
	repo   *repository.Repository
	redis  *redis.Client
	config *config.Config
	email  *EmailService
}

func New(repo *repository.Repository, redis *redis.Client, cfg *config.Config) *Service {
	return &Service{repo: repo, redis: redis, config: cfg, email: NewEmailService()}
}

////////////////////////////////////////////////////////////////////
//////////////////////// AUTH SERVICE //////////////////////////////
////////////////////////////////////////////////////////////////////

func (s *Service) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {

	existing, err := s.repo.GetMerchantByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// FIX: handle errors from key generation instead of silently ignoring
	apiKey, err := utils.GenerateAPIKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate API key")
	}
	apiSecret, err := utils.GenerateAPISecret()
	if err != nil {
		return nil, fmt.Errorf("failed to generate API secret")
	}
	webhookSecret, err := utils.GenerateWebhookSecret()
	if err != nil {
		return nil, fmt.Errorf("failed to generate webhook secret")
	}

	encryptedSecret, err := utils.Encrypt(apiSecret, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, err
	}

	merchant := &models.Merchant{
		ID:            utils.NewID(),
		Name:          req.Name,
		Email:         req.Email,
		PasswordHash:  passwordHash,
		APIKey:        apiKey,
		APISecret:     encryptedSecret,
		WebhookSecret: webhookSecret,
		IsActive:      true,
		IsAdmin:       false,
		DailyLimit:    10000000,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.repo.CreateMerchant(ctx, merchant); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(ctx, merchant, apiSecret)
}

func (s *Service) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {

	// Brute force protection — lock after 5 failed attempts for 15 minutes
	lockKey := fmt.Sprintf("login:lock:%s", req.Email)
	attemptsKey := fmt.Sprintf("login:attempts:%s", req.Email)

	locked, _ := s.redis.Exists(ctx, lockKey).Result()
	if locked > 0 {
		return nil, fmt.Errorf("account temporarily locked due to too many failed attempts. Try again in 15 minutes")
	}

	merchant, err := s.repo.GetMerchantByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if merchant == nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !utils.CheckPassword(req.Password, merchant.PasswordHash) {
		// Increment failed attempts
		attempts, _ := s.redis.Incr(ctx, attemptsKey).Result()
		s.redis.Expire(ctx, attemptsKey, 15*time.Minute)
		if attempts >= 5 {
			s.redis.Set(ctx, lockKey, "1", 15*time.Minute)
			s.redis.Del(ctx, attemptsKey)
			return nil, fmt.Errorf("account temporarily locked due to too many failed attempts. Try again in 15 minutes")
		}
		return nil, fmt.Errorf("invalid credentials")
	}

	// Successful login — clear failed attempts
	s.redis.Del(ctx, attemptsKey, lockKey)

	apiSecret, err := utils.Decrypt(merchant.APISecret, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, err
	}

	return s.generateAuthResponse(ctx, merchant, apiSecret)
}

func (s *Service) generateAuthResponse(ctx context.Context, merchant *models.Merchant, secret string) (*models.AuthResponse, error) {

	accessToken, err := utils.GenerateAccessToken(
		merchant.ID,
		merchant.Email,
		merchant.IsAdmin,
		s.config.JWT.AccessSecret,
		s.config.JWT.AccessExpiry,
	)
	if err != nil {
		return nil, err
	}

	refreshToken, err := utils.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token")
	}

	rt := &models.RefreshToken{
		ID:         utils.NewID(),
		MerchantID: merchant.ID,
		TokenHash:  utils.HashToken(refreshToken),
		ExpiresAt:  time.Now().Add(s.config.JWT.RefreshExpiry),
		CreatedAt:  time.Now(),
	}

	s.repo.SaveRefreshToken(ctx, rt)

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
			IsAdmin:   merchant.IsAdmin,
			CreatedAt: merchant.CreatedAt,
		},
	}, nil
}

////////////////////////////////////////////////////////////////////
//////////////////////// PAYMENT SERVICE ///////////////////////////
////////////////////////////////////////////////////////////////////

func (s *Service) CreatePayment(ctx context.Context, req models.CreatePaymentRequest, clientIP string) (*models.CreatePaymentResponse, error) {

	merchantID, err := uuid.Parse(req.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("invalid merchant id")
	}

	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return nil, fmt.Errorf("merchant not found")
	}

	// Per-merchant rate limit: 100/min normal, Cloudflare + HMAC protects against bots
	rateLimitKey := fmt.Sprintf("merchant:ratelimit:%s", merchantID.String())
	count, _ := s.redis.Incr(ctx, rateLimitKey).Result()
	if count == 1 {
		s.redis.Expire(ctx, rateLimitKey, time.Minute)
	}
	if count > 100 {
		return nil, fmt.Errorf("RATE_LIMIT_EXCEEDED: too many payment requests, slow down")
	}

	// Check merchant gating (KYC + subscription + UPI)
	if err := s.CheckMerchantGating(ctx, merchantID); err != nil {
		return nil, err
	}

	isDup, err := s.repo.CheckDuplicateOrderID(ctx, merchantID, req.OrderID)
	if err != nil {
		return nil, err
	}
	if isDup {
		return nil, fmt.Errorf("duplicate order id")
	}

	upi, err := s.repo.GetNextUPIForRotation(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	if upi == nil {
		return nil, fmt.Errorf("no active upi ids configured")
	}

	decryptedUPI, err := utils.Decrypt(upi.UPIID, s.config.Security.EncryptionKey)
	if err != nil {
		return nil, err
	}

	paytmTxnRef := utils.GenPaytmTxnRef(req.OrderID)
	upiLink := utils.GenerateUPILinkWithRef(decryptedUPI, merchant.Name, req.Amount, req.OrderID, paytmTxnRef)

	qrBase64, err := utils.GenerateQRBase64(upiLink)
	if err != nil {
		return nil, err
	}

	paymentID := utils.NewID()
	expires := time.Now().Add(s.config.Security.PaymentSessionTTL)

	payment := &models.Payment{
		ID:                paymentID,
		MerchantID:        merchantID,
		OrderID:           req.OrderID,
		Amount:            req.Amount,
		Currency:          req.Currency,
		Status:            models.PaymentStatusPending,
		CustomerReference: req.CustomerReference,
		UPIID:             upi.UPIID,
		UPIIntentLink:     upiLink,
		QRCodeData:        qrBase64,
		PaytmTxnRef:       paytmTxnRef,
		RedirectURL:       req.RedirectURL,
		ExpiresAt:         expires,
		ClientIP:          clientIP,
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
		Amount:        req.Amount,
		Currency:      req.Currency,
		ExpiresAt:     expires,
		Status:        "pending",
	}, nil
}

////////////////////////////////////////////////////////////////////
/////////////////////// PAYMENT STATUS //////////////////////////////
////////////////////////////////////////////////////////////////////

func (s *Service) GetPaymentStatus(ctx context.Context, paymentID uuid.UUID) (*models.PaymentStatusResponse, error) {

	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return nil, err
	}

	if payment == nil {
		return nil, fmt.Errorf("payment not found")
	}

	merchant, _ := s.repo.GetMerchantByID(ctx, payment.MerchantID)
	var merchantLogo, businessName string
	if merchant != nil {
		if merchant.LogoURL != nil {
			merchantLogo = *merchant.LogoURL
		}
		if merchant.BusinessName != nil {
			businessName = *merchant.BusinessName
		}
		if businessName == "" {
			businessName = merchant.Name
		}
	}
	return &models.PaymentStatusResponse{
		PaymentID:     payment.ID,
		OrderID:       payment.OrderID,
		MerchantID:    payment.MerchantID,
		Amount:        payment.Amount,
		Currency:      payment.Currency,
		Status:        payment.Status,
		UTR:           payment.UTR,
		PaidAt:        payment.PaidAt,
		ExpiresAt:     payment.ExpiresAt,
		CreatedAt:     payment.CreatedAt,
		QRCodeBase64:  payment.QRCodeData,
		UPIIntentLink: payment.UPIIntentLink,
		RedirectURL:   payment.RedirectURL,
		CustomerRef:   payment.CustomerReference,
		MerchantLogo:  merchantLogo,
		BusinessName:  businessName,
	}, nil
}

////////////////////////////////////////////////////////////////////
//////////////////// VERIFY PAYMENT /////////////////////////////////
////////////////////////////////////////////////////////////////////

func (s *Service) VerifyPayment(ctx context.Context, req models.VerifyPaymentRequest, merchantID uuid.UUID) error {

	paymentID, err := uuid.Parse(req.PaymentID)
	if err != nil {
		return fmt.Errorf("invalid payment id")
	}

	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return err
	}

	// FIX: nil check before accessing payment fields
	if payment == nil {
		return fmt.Errorf("payment not found")
	}

	if payment.MerchantID != merchantID {
		return fmt.Errorf("unauthorized")
	}

	if payment.Status != models.PaymentStatusPending {
		return fmt.Errorf("payment already processed")
	}

	if req.Amount != payment.Amount {
		return fmt.Errorf("amount mismatch")
	}

	utr := req.UTR

	if err := s.repo.UpdatePaymentStatus(ctx, paymentID, models.PaymentStatusPaid, &utr); err != nil {
		return err
	}

	go s.dispatchWebhook(context.Background(), payment, utr)

	return nil
}

////////////////////////////////////////////////////////////////////
//////////////////////// WEBHOOK ///////////////////////////////////
////////////////////////////////////////////////////////////////////

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
		Status:    "paid",
		UTR:       utr,
		Timestamp: time.Now().Unix(),
	}

	// FIX: marshal once, compute signature, then marshal final payload
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		logger.Error().Err(err).Str("payment_id", payment.ID.String()).Msg("Failed to marshal webhook payload")
		return
	}

	payload.Signature = utils.ComputeWebhookSignature(merchant.WebhookSecret, payloadBytes)

	finalBytes, err := json.Marshal(payload)
	if err != nil {
		logger.Error().Err(err).Str("payment_id", payment.ID.String()).Msg("Failed to marshal final webhook payload")
		return
	}

	s.redis.LPush(ctx, "webhook:queue", string(finalBytes))

	// FIX: use zerolog instead of standard log
	logger.Info().Str("payment_id", payment.ID.String()).Str("merchant_id", payment.MerchantID.String()).Msg("Webhook queued")
}

////////////////////////////////////////////////////////////////////
//////////////////// MERCHANT SETTINGS //////////////////////////////
////////////////////////////////////////////////////////////////////

func (s *Service) AddUPI(ctx context.Context, merchantID uuid.UUID, req models.AddUPIRequest) error {

	if !utils.ValidateUPIID(req.UPIID) {
		return fmt.Errorf("invalid upi id")
	}

	encryptedUPI, err := utils.Encrypt(req.UPIID, s.config.Security.EncryptionKey)
	if err != nil {
		return err
	}

	upi := &models.MerchantUPI{
		ID:         utils.NewID(),
		MerchantID: merchantID,
		UPIID:      encryptedUPI,
		Label:      req.Label,
		IsActive:   true,
		Priority:   req.Priority,
		CreatedAt:  time.Now(),
	}

	return s.repo.AddMerchantUPI(ctx, upi)
}

func (s *Service) GetMerchantStats(ctx context.Context, merchantID uuid.UUID) (*models.DashboardStats, error) {
	return s.repo.GetMerchantStats(ctx, merchantID)
}

func (s *Service) UpdateMerchantLogo(ctx context.Context, merchantID uuid.UUID, logoURL string) error {
	return s.repo.UpdateMerchantField(ctx, merchantID, "logo_url", logoURL)
}

func (s *Service) UpdateBusinessName(ctx context.Context, merchantID uuid.UUID, name string) error {
	return s.repo.UpdateMerchantField(ctx, merchantID, "business_name", name)
}

func (s *Service) GetReferralStats(merchantId string) (map[string]interface{}, error) {
	return s.repo.GetReferralStats(merchantId)
}

func (s *Service) AddEmailSubscriber(email string) {
	s.repo.AddEmailSubscriber(email, "landing")
}


func (s *Service) GetRecentPublicPayments(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := s.repo.GetRecentPaidPayments(ctx, 5)
	if err != nil {
		return nil, err
	}
	var result []map[string]interface{}
	for _, p := range rows {
		// Mask the order ID for privacy
		masked := "****"
		if len(p.OrderID) >= 4 {
			masked = "****" + p.OrderID[len(p.OrderID)-4:]
		}
		result = append(result, map[string]interface{}{
			"masked_id": masked,
			"amount":    p.Amount,
			"method":    "UPI",
			"created_at": p.CreatedAt,
		})
	}
	return result, nil
}

func (s *Service) GetPlanByID(ctx context.Context, id uuid.UUID) (*models.Plan, error) {
	return s.repo.GetPlanByID(ctx, id)
}
