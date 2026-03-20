package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	

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

	apiKey, _ := utils.GenerateAPIKey()
	apiSecret, _ := utils.GenerateAPISecret()
	webhookSecret, _ := utils.GenerateWebhookSecret()

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

	merchant, err := s.repo.GetMerchantByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if merchant == nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !utils.CheckPassword(req.Password, merchant.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

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

	refreshToken, _ := utils.GenerateRefreshToken()

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
		if merchant.LogoURL != nil { merchantLogo = *merchant.LogoURL }
		if merchant.BusinessName != nil { businessName = *merchant.BusinessName }
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
	if err != nil || merchant.WebhookURL == "" {
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

	payloadBytes, _ := json.Marshal(payload)

	payload.Signature = utils.ComputeWebhookSignature(merchant.WebhookSecret, payloadBytes)

	payloadBytes, _ = json.Marshal(payload)

	s.redis.LPush(ctx, "webhook:queue", string(payloadBytes))

	log.Println("Webhook queued")
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
