package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// DASHBOARD: CRYPTO SETTINGS (JWT)
// ============================================================================

func (h *Handler) GetCryptoSettings(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	data, err := h.service.GetCryptoSettings(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to load crypto settings"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: data})
}

func (h *Handler) UpdateCryptoConfig(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req models.UpdateCryptoConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}
	if err := h.service.UpdateCryptoConfig(c.Request.Context(), merchantID, req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Crypto settings updated"})
}

func (h *Handler) SaveCryptoWallet(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req models.SaveCryptoWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}
	if err := h.service.SaveCryptoWallet(c.Request.Context(), merchantID, req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Wallet saved"})
}

func (h *Handler) DeleteCryptoWallet(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	network := c.Param("network")
	if err := h.service.DeleteCryptoWallet(c.Request.Context(), merchantID, network); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to delete wallet"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Wallet removed"})
}

// ============================================================================
// PUBLIC CHECKOUT: INIT + VERIFY
// ============================================================================

// InitCryptoPayment is called when a customer selects USDT + a network.
func (h *Handler) InitCryptoPayment(c *gin.Context) {
	paymentID, err := uuid.Parse(c.Param("payment_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid payment id"})
		return
	}
	var req models.CryptoInitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}
	resp, err := h.service.InitCryptoPayment(c.Request.Context(), paymentID, req.Network)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: resp})
}

// VerifyCryptoPayment verifies a customer-submitted transaction hash.
func (h *Handler) VerifyCryptoPayment(c *gin.Context) {
	var req models.CryptoVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	// Public endpoint — rate limit by IP to blunt brute-force TxID guessing.
	ip := c.ClientIP()
	rateKey := fmt.Sprintf("crypto:verify_rate:%s", ip)
	count, _ := h.service.Redis().Incr(c.Request.Context(), rateKey).Result()
	if count == 1 {
		h.service.Redis().Expire(c.Request.Context(), rateKey, time.Minute)
	}
	if count > 15 {
		c.JSON(http.StatusTooManyRequests, models.ErrorResponse{Error: "too many attempts, please wait a minute"})
		return
	}

	result, err := h.service.VerifyCryptoPayment(c.Request.Context(), req, ip)
	if err != nil {
		// Business errors are safe to show the customer (they're actionable and
		// contain no internal detail).
		log.Info().Str("ip", ip).Str("reason", err.Error()).Msg("Crypto verify rejected")
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: result})
}
