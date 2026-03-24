package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/services"
)

type Handler struct {
	service *services.Service
}

func New(service *services.Service) *Handler {
	return &Handler{service: service}
}

// FIX: centralized error code detection instead of string comparison
var errCodeStatus = map[string]int{
	"RATE_LIMIT_EXCEEDED": http.StatusTooManyRequests,
	"DUPLICATE_ORDER":     http.StatusConflict,
	"KYC_REQUIRED":        http.StatusForbidden,
	"SUBSCRIPTION_EXPIRED": http.StatusPaymentRequired,
	"SUBSCRIPTION_REQUIRED": http.StatusPaymentRequired,
	"UPI_REQUIRED":        http.StatusUnprocessableEntity,
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func isValidEmail(email string) bool {
	return emailRegex.MatchString(strings.TrimSpace(email))
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

func (h *Handler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		// FIX: only return 409 for duplicate email, 500 for everything else
		if err.Error() == "email already registered" {
			c.JSON(http.StatusConflict, models.ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "registration failed"})
		}
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "merchant registered successfully",
		Data:    resp,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

func (h *Handler) RefreshToken(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.RefreshTokens(c.Request.Context(), req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

// ============================================================================
// PAYMENT HANDLERS (API-key authenticated)
// ============================================================================

func (h *Handler) CreatePayment(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
			Code:  "VALIDATION_ERROR",
		})
		return
	}

	req.MerchantID = merchantID.String()
	resp, err := h.service.CreatePayment(c.Request.Context(), req, c.ClientIP())
	if err != nil {
		// FIX: use error code map instead of string comparison
		status := http.StatusBadRequest
		for code, s := range errCodeStatus {
			if strings.Contains(err.Error(), code) {
				status = s
				break
			}
		}
		c.JSON(status, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

func (h *Handler) GetPaymentStatus(c *gin.Context) {
	paymentIDStr := c.Param("payment_id")
	paymentID, err := uuid.Parse(paymentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid payment_id"})
		return
	}

	resp, err := h.service.GetPaymentStatus(c.Request.Context(), paymentID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

func (h *Handler) VerifyPayment(c *gin.Context) {
	var req models.VerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	if err := h.service.VerifyPayment(c.Request.Context(), req, merchantID); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "payment verified successfully",
	})
}

// ============================================================================
// MERCHANT DASHBOARD HANDLERS (JWT authenticated)
// ============================================================================

func (h *Handler) GetDashboardStats(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	stats, err := h.service.GetMerchantStats(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch stats"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    stats,
	})
}

func (h *Handler) GetTransactions(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	var filter models.TransactionFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.GetMerchantTransactions(c.Request.Context(), merchantID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

func (h *Handler) GetProfile(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	merchant, err := h.service.GetMerchantByID(c.Request.Context(), merchantID)
	if err != nil || merchant == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "merchant not found"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.MerchantPublic{
			ID:           merchant.ID,
			Name:         merchant.Name,
			Email:        merchant.Email,
			APIKey:       merchant.APIKey,
			IsActive:     merchant.IsActive,
			IsAdmin:      merchant.IsAdmin,
			CreatedAt:    merchant.CreatedAt,
			LogoURL:      derefStr(merchant.LogoURL),
			BusinessName: derefStr(merchant.BusinessName),
		},
	})
}

// ============================================================================
// UPI MANAGEMENT
// ============================================================================

func (h *Handler) AddUPI(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	var req models.AddUPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.service.AddUPI(c.Request.Context(), merchantID, req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "UPI ID added successfully",
	})
}

func (h *Handler) ListUPIs(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	upis, err := h.service.GetUPIs(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch UPI IDs"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    upis,
	})
}

// ============================================================================
// WEBHOOK SETTINGS
// ============================================================================

func (h *Handler) UpdateWebhook(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	var req models.UpdateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.service.UpdateWebhook(c.Request.Context(), merchantID, req.WebhookURL); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update webhook"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "webhook URL updated",
	})
}

// ============================================================================
// ADMIN HANDLERS
// ============================================================================

func (h *Handler) AdminListMerchants(c *gin.Context) {
	var filter models.AdminMerchantFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.AdminListMerchants(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch merchants"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

func (h *Handler) AdminGetFraudAlerts(c *gin.Context) {
	var filter models.AdminFraudFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.AdminGetFraudAlerts(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch fraud alerts"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "upay-gateway",
		"version": "1.0.0",
	})
}

func (h *Handler) GetReferralStats(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	stats, err := h.service.GetReferralStats(merchantID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

func (h *Handler) EmailSubscribe(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "valid email required"})
		return
	}
	// FIX: validate email format
	if !isValidEmail(body.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid email format"})
		return
	}
	h.service.AddEmailSubscriber(strings.TrimSpace(body.Email))
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscribed!"})
}

func (h *Handler) SavePaytmMID(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		UPIID    string `json:"upi_id"    binding:"required"`
		PaytmMID string `json:"paytm_mid" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "upi_id and paytm_mid are required"})
		return
	}
	if err := h.service.SavePaytmMID(c.Request.Context(), merchantID, req.UPIID, req.PaytmMID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to save MID"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Paytm MID saved. Auto-verification enabled."})
}
