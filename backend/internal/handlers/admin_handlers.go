package handlers

import (
	"net/http"

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
