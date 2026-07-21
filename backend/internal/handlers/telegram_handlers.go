package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// TELEGRAM HANDLERS (JWT-authenticated dashboard endpoints)
// ============================================================================

// GetTelegramStatus returns the merchant's Telegram connection state.
func (h *Handler) GetTelegramStatus(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	status, err := h.service.GetTelegramStatus(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch Telegram status"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: status})
}

// GenerateTelegramCode generates a short-lived connect code for the merchant.
func (h *Handler) GenerateTelegramCode(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	resp, err := h.service.GenerateTelegramConnectCode(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to generate connect code"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: resp})
}

// UpdateTelegramSettings updates is_enabled and notification_types.
func (h *Handler) UpdateTelegramSettings(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req models.TelegramSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}
	if err := h.service.UpdateTelegramSettings(c.Request.Context(), merchantID, req.IsEnabled, req.NotificationTypes); err != nil {
		if err.Error() == "not connected" {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Telegram not connected"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update settings"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Telegram settings updated"})
}

// SendTelegramTest sends a test notification to the merchant's connected Telegram.
func (h *Handler) SendTelegramTest(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	// Rate limit: 20 tests per hour per merchant
	rateKey := fmt.Sprintf("telegram:test_rate:%s", merchantID.String())
	count, _ := h.service.Redis().Incr(c.Request.Context(), rateKey).Result()
	if count == 1 {
		h.service.Redis().Expire(c.Request.Context(), rateKey, time.Hour)
	}
	if count > 20 {
		c.JSON(http.StatusTooManyRequests, models.ErrorResponse{Error: "test notification limit reached (20 per hour)"})
		return
	}

	if err := h.service.SendTelegramTest(c.Request.Context(), merchantID); err != nil {
		if err.Error() == "not connected" {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Telegram not connected"})
			return
		}
		// Log the real error server-side; never expose Telegram API details to clients
		log.Error().Err(err).Str("merchant_id", merchantID.String()).Msg("Telegram test send failed")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to send test notification. Check that your Telegram is still connected."})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Test notification sent"})
}

// DisconnectTelegram removes the merchant's Telegram connection.
func (h *Handler) DisconnectTelegram(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	if err := h.service.DisconnectTelegram(c.Request.Context(), merchantID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to disconnect Telegram"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Telegram disconnected"})
}

// GetTelegramHistory returns the notification log for a merchant.
func (h *Handler) GetTelegramHistory(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	items, total, err := h.service.GetTelegramHistory(c.Request.Context(), merchantID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch history"})
		return
	}
	if items == nil {
		items = []models.TelegramNotification{}
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data":  items,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// ============================================================================
// TELEGRAM BOT WEBHOOK (public, verified via secret-token header)
// ============================================================================

// TelegramBotWebhook receives updates from Telegram and processes bot commands.
func (h *Handler) TelegramBotWebhook(c *gin.Context) {
	secret := c.GetHeader("X-Telegram-Bot-Api-Secret-Token")
	if !h.service.ValidateTelegramWebhookSecret(secret) {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false})
		return
	}

	var update models.TelegramWebhookUpdate
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false})
		return
	}

	if update.Message != nil {
		text := strings.TrimSpace(update.Message.Text)
		chatID := fmt.Sprintf("%d", update.Message.Chat.ID)

		// Extract code: handles both "/connect CODE" and "/start CODE" (deep link)
		var connectCode string
		if strings.HasPrefix(text, "/connect ") {
			connectCode = strings.TrimSpace(strings.TrimPrefix(text, "/connect "))
		} else if strings.HasPrefix(text, "/start ") {
			connectCode = strings.TrimSpace(strings.TrimPrefix(text, "/start "))
		}

		if connectCode != "" {
			if err := h.service.LinkTelegramChat(c.Request.Context(), connectCode, chatID); err != nil {
				h.service.SendTelegramDirect(c.Request.Context(), chatID,
					"Invalid or expired code. Please generate a new one from your NovaPay dashboard.")
			} else {
				h.service.SendTelegramDirect(c.Request.Context(), chatID,
					"<b>Connected!</b>\n\nYour NovaPay account is now linked. You will receive payment notifications here.")
			}
		} else if text == "/start" {
			h.service.SendTelegramDirect(c.Request.Context(), chatID,
				"Welcome to <b>NovaPay Alerts</b>.\n\nTo connect, click <b>Connect Telegram</b> in your NovaPay dashboard and tap the button — it will open this chat and connect automatically.")
		} else if text == "/stop" {
			if err := h.service.DisconnectTelegramByChatID(c.Request.Context(), chatID); err == nil {
				h.service.SendTelegramDirect(c.Request.Context(), chatID,
					"Disconnected. You will no longer receive notifications.")
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
