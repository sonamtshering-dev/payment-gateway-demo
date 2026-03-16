package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (h *Handler) GetKYC(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	kyc, err := h.service.GetKYC(c.Request.Context(), merchantID)
	if err != nil || kyc == nil {
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: nil})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: kyc})
}

func (h *Handler) SubmitKYC(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		AadhaarNumber string `json:"aadhaar_number" binding:"required"`
		PANNumber     string `json:"pan_number" binding:"required"`
		BusinessName  string `json:"business_name" binding:"required"`
		BankAccount   string `json:"bank_account" binding:"required"`
		BankIFSC      string `json:"bank_ifsc" binding:"required"`
		BankName      string `json:"bank_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	kyc, err := h.service.SubmitKYC(c.Request.Context(), merchantID, req.AadhaarNumber, req.PANNumber, req.BusinessName, req.BankAccount, req.BankIFSC, req.BankName)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: kyc, Message: "KYC submitted successfully"})
}
