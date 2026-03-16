package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (h *Handler) GetProviders(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	providers, err := h.service.GetProviders(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch providers"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: providers})
}

func (h *Handler) ConnectProvider(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req models.ConnectProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	p, err := h.service.ConnectProvider(c.Request.Context(), merchantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: p, Message: "Provider connected successfully"})
}

func (h *Handler) UpdateProvider(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	providerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid provider id"})
		return
	}
	var req models.UpdateProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.UpdateProvider(c.Request.Context(), providerID, merchantID, req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Provider updated"})
}

func (h *Handler) DeleteProvider(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	providerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid provider id"})
		return
	}
	if err := h.service.DeleteProvider(c.Request.Context(), providerID, merchantID); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Provider disconnected"})
}
