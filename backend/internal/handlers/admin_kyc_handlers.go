package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (h *Handler) AdminListKYC(c *gin.Context) {
	kycs, err := h.service.AdminListKYC(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: kycs})
}

func (h *Handler) AdminReviewKYC(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchant_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant_id"})
		return
	}
	var req struct {
		Status          string `json:"status" binding:"required"`
		RejectionReason string `json:"rejection_reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.AdminReviewKYC(c.Request.Context(), merchantID, req.Status, req.RejectionReason); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	// Send KYC email
	go func() {
		merchant, err := h.service.GetMerchantByID(context.Background(), merchantID)
		if err == nil && merchant != nil {
			if req.Status == "approved" {
				h.email.SendKYCApproved(merchant.Email, merchant.Name)
			} else if req.Status == "rejected" {
				h.email.SendKYCRejected(merchant.Email, merchant.Name, req.RejectionReason)
			}
		}
	}()
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "KYC updated"})
}

func (h *Handler) AdminExtendSubscription(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchant_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid merchant_id"})
		return
	}
	var req struct {
		Days int `json:"days" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.AdminExtendSubscription(c.Request.Context(), merchantID, req.Days); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Subscription extended"})
}
