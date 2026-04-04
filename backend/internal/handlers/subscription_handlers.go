package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (h *Handler) GetSubscription(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	sub, err := h.service.GetSubscription(c.Request.Context(), merchantID)
	if err != nil || sub == nil {
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: nil})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: sub})
}

func (h *Handler) CreateSubscription(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		PlanID string `json:"plan_id" binding:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	planID, _ := uuid.Parse(req.PlanID)
	sub, err := h.service.CreateSubscription(c.Request.Context(), merchantID, planID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	// Send subscription email
	go func() {
		merchant, err := h.service.GetMerchantByID(context.Background(), merchantID)
		if err == nil && merchant != nil {
			h.email.SendSubscriptionActivated(merchant.Email, "Pro")
		}
	}()
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: sub, Message: "Subscribed successfully"})
}

func (h *Handler) CancelSubscription(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	if err := h.service.CancelSubscription(c.Request.Context(), merchantID); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Subscription cancelled"})
}

func (h *Handler) GetSubscriptionWithPlan(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	data, err := h.service.GetSubscriptionWithPlan(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: data})
}

func (h *Handler) InitiateSubscriptionPayment(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		PlanID string `json:"plan_id" binding:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	planID, _ := uuid.Parse(req.PlanID)
	resp, err := h.service.CreateSubscriptionPayment(c.Request.Context(), merchantID, planID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: resp})
}
