package handlers

import (
	"net/http"

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

// ============================================================================
// AUTH HANDLERS
// ============================================================================

// POST /api/v1/auth/register

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
func (h *Handler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	resp, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "merchant registered successfully",
		Data:    resp,
	})
}

// POST /api/v1/auth/login
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

// POST /api/v1/auth/refresh
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

// POST /api/v1/payments/create
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
		status := http.StatusBadRequest
		if err.Error() == "daily transaction limit exceeded" {
			status = http.StatusTooManyRequests
		}
		c.JSON(status, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    resp,
	})
}

// GET /api/v1/payments/status/:payment_id
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

// POST /api/v1/payments/verify
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

// GET /api/v1/dashboard/stats
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

// GET /api/v1/dashboard/transactions
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

// GET /api/v1/dashboard/profile
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

// POST /api/v1/dashboard/upi
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

// GET /api/v1/dashboard/upi
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

// PUT /api/v1/dashboard/webhook
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

// GET /api/v1/admin/merchants
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

// GET /api/v1/admin/fraud-alerts
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
		c.JSON(500, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": stats})
}

func (h *Handler) EmailSubscribe(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Email == "" {
		c.JSON(400, gin.H{"success": false, "error": "valid email required"})
		return
	}
	h.service.AddEmailSubscriber(body.Email)
	c.JSON(200, gin.H{"success": true, "message": "Subscribed!"})
}

// POST /api/v1/dashboard/paytm-mid
func (h *Handler) SavePaytmMID(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		UPIID    string `json:"upi_id"    binding:"required"`
		PaytmMID string `json:"paytm_mid" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"success": false, "error": "upi_id and paytm_mid are required"})
		return
	}
	if err := h.service.SavePaytmMID(c.Request.Context(), merchantID, req.UPIID, req.PaytmMID); err != nil {
		c.JSON(500, gin.H{"success": false, "error": "failed to save MID"})
		return
	}
	c.JSON(200, gin.H{"success": true, "message": "Paytm MID saved. Auto-verification enabled."})
}
