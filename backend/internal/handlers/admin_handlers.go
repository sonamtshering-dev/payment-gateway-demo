package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// MERCHANT SETTINGS HANDLERS
// ============================================================================

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8,max=128"`
}

// POST /api/v1/dashboard/rotate-keys
func (h *Handler) RotateAPIKeys(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	newKey, newSecret, err := h.service.RotateAPIKeys(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "API keys rotated. Old keys are now invalid. Store these securely.",
		Data: gin.H{
			"api_key":    newKey,
			"api_secret": newSecret,
		},
	})
}

// POST /api/v1/dashboard/change-password
func (h *Handler) ChangePassword(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.service.ChangePassword(c.Request.Context(), merchantID, req.CurrentPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Password changed. All sessions have been revoked.",
	})
}

// DELETE /api/v1/dashboard/upi/:upi_id
func (h *Handler) DeleteUPI(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	upiIDStr := c.Param("upi_id")
	upiID, err := uuid.Parse(upiIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid upi_id"})
		return
	}

	if err := h.service.DeleteUPI(c.Request.Context(), upiID, merchantID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "UPI ID deactivated"})
}

// ============================================================================
// ADMIN HANDLERS
// ============================================================================

type ToggleMerchantRequest struct {
	Active bool `json:"active"`
}

type UpdatePaymentStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=paid failed"`
	Note   string `json:"note" binding:"max=500"`
}

// PUT /api/v1/admin/merchants/:id/toggle
func (h *Handler) AdminToggleMerchant(c *gin.Context) {
	merchantIDStr := c.Param("id")
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}

	var req ToggleMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.service.AdminToggleMerchant(c.Request.Context(), merchantID, req.Active); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "merchant status updated"})
}

// PUT /api/v1/admin/payments/:id/status
func (h *Handler) AdminUpdatePaymentStatus(c *gin.Context) {
	paymentIDStr := c.Param("id")
	paymentID, err := uuid.Parse(paymentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid payment ID"})
		return
	}

	var req UpdatePaymentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	status := models.PaymentStatus(req.Status)
	if err := h.service.AdminUpdatePaymentStatus(c.Request.Context(), paymentID, status, req.Note); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "payment status updated"})
}

// PUT /api/v1/admin/fraud-alerts/:id/resolve
func (h *Handler) AdminResolveFraudAlert(c *gin.Context) {
	alertIDStr := c.Param("id")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid alert ID"})
		return
	}

	if err := h.service.AdminResolveFraudAlert(c.Request.Context(), alertID); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "fraud alert resolved"})
}

// GET /api/v1/admin/stats
func (h *Handler) AdminGetSystemStats(c *gin.Context) {
	stats, err := h.service.AdminGetSystemStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch system stats"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: stats})
}


func (h *Handler) AdminListPayments(c *gin.Context) {
	result, err := h.service.AdminListPayments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: result})
}

// PUT /api/v1/admin/subscriptions/:merchant_id/status
func (h *Handler) AdminUpdateSubscriptionStatus(c *gin.Context) {
	merchantIDStr := c.Param("merchant_id")
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.AdminUpdateSubscriptionStatus(c.Request.Context(), merchantID, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "subscription status updated"})
}

// PUT /api/v1/admin/subscriptions/:merchant_id/plan
func (h *Handler) AdminChangeMerchantPlan(c *gin.Context) {
	merchantIDStr := c.Param("merchant_id")
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}
	var req struct {
		PlanID       string `json:"plan_id" binding:"required"`
		DurationDays int    `json:"duration_days"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	planID, err := uuid.Parse(req.PlanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid plan ID"})
		return
	}
	if err := h.service.AdminChangeMerchantPlan(c.Request.Context(), merchantID, planID, req.DurationDays); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "merchant plan updated"})
}

// ============================================================================
// NEW ADMIN HANDLERS
// ============================================================================

func pageLimit(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return page, limit
}

// GET /api/v1/admin/merchants/:id
func (h *Handler) AdminGetMerchantDetail(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}
	detail, err := h.service.AdminGetMerchantDetail(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	if detail == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "merchant not found"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: detail})
}

// POST /api/v1/admin/merchants/:id/reset-password
func (h *Handler) AdminResetMerchantPassword(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}
	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.AdminResetMerchantPassword(c.Request.Context(), merchantID, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "password reset, all sessions revoked"})
}

// POST /api/v1/admin/merchants/:id/rotate-keys
func (h *Handler) AdminRotateMerchantKeys(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}
	newKey, newSecret, err := h.service.AdminRotateMerchantKeys(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "API keys rotated",
		Data:    gin.H{"api_key": newKey, "api_secret": newSecret},
	})
}

// PUT /api/v1/admin/merchants/:id/limit
func (h *Handler) AdminUpdateMerchantLimit(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant ID"})
		return
	}
	var req struct {
		DailyLimitRupees int64 `json:"daily_limit_rupees" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.AdminUpdateMerchantLimit(c.Request.Context(), merchantID, req.DailyLimitRupees*100); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "daily limit updated"})
}

// GET /api/v1/admin/webhook-logs
func (h *Handler) AdminGetWebhookLogs(c *gin.Context) {
	page, limit := pageLimit(c)
	merchantID := c.Query("merchant_id")
	logs, total, err := h.service.AdminGetWebhookLogs(c.Request.Context(), page, limit, merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":  logs,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// POST /api/v1/admin/webhook-logs/:id/retry
func (h *Handler) AdminRetryWebhook(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid ID"})
		return
	}
	if err := h.service.AdminRetryWebhook(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "webhook queued for retry"})
}

// GET /api/v1/admin/revenue-chart
func (h *Handler) AdminGetRevenueChart(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	data, err := h.service.AdminGetRevenueChart(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: data})
}

// GET /api/v1/admin/subscriptions
func (h *Handler) AdminGetSubscriptions(c *gin.Context) {
	page, limit := pageLimit(c)
	subs, total, err := h.service.AdminGetSubscriptions(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":  subs,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// GET /api/v1/admin/audit-logs
func (h *Handler) AdminGetAuditLogs(c *gin.Context) {
	page, limit := pageLimit(c)
	logs, total, err := h.service.AdminGetAuditLogs(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":  logs,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// GET /api/v1/admin/top-merchants
func (h *Handler) AdminGetTopMerchants(c *gin.Context) {
	limitN, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	merchants, err := h.service.AdminGetTopMerchants(c.Request.Context(), limitN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: merchants})
}

// GET /api/v1/admin/payments-v2 (paginated with search/filter)
func (h *Handler) AdminListPaymentsPaginated(c *gin.Context) {
	page, limit := pageLimit(c)
	status := c.Query("status")
	search := c.Query("search")
	payments, total, err := h.service.AdminGetPaymentsPaginated(c.Request.Context(), page, limit, status, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":  payments,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// GET /api/v1/admin/fraud-v2 (paginated with filter)
func (h *Handler) AdminListFraudPaginated(c *gin.Context) {
	page, limit := pageLimit(c)
	severity := c.Query("severity")
	var resolved *bool
	if r := c.Query("resolved"); r != "" {
		b := r == "true"
		resolved = &b
	}
	alerts, total, err := h.service.AdminGetFraudAlertsPaginated(c.Request.Context(), page, limit, resolved, severity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":  alerts,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}