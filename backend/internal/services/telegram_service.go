package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

const (
	TGNotifPaymentReceived    = "payment_received"
	TGNotifPaymentFailed      = "payment_failed"
	TGNotifPaymentExpired     = "payment_expired"
	TGNotifKYCApproved        = "kyc_approved"
	TGNotifKYCRejected        = "kyc_rejected"
	TGNotifSubscriptionActive = "subscription_activated"
	TGNotifSubscriptionExpiry = "subscription_expiring"
	TGNotifWebhookFailure     = "webhook_failure"
	TGNotifAPIKeyRotated      = "api_key_rotated"
	TGNotifSuspiciousActivity = "suspicious_activity"
	TGNotifDailySummary       = "daily_summary"
	TGNotifWeeklySummary      = "weekly_summary"

	telegramQueue = "telegram:queue"
)

type TelegramService struct {
	botToken string
	botName  string
	client   *http.Client
	redis    *redis.Client
}

type TelegramQueueMessage struct {
	MerchantID       uuid.UUID `json:"merchant_id"`
	NotificationType string    `json:"notification_type"`
	Text             string    `json:"text"`
}

func NewTelegramService(botToken, botName string, rdb *redis.Client) *TelegramService {
	return &TelegramService{
		botToken: botToken,
		botName:  botName,
		client:   &http.Client{Timeout: 10 * time.Second},
		redis:    rdb,
	}
}

func (t *TelegramService) Configured() bool {
	return t.botToken != ""
}

func (t *TelegramService) BotName() string {
	return t.botName
}

// Enqueue pushes a notification to the Redis queue for async delivery.
// It is a no-op when the bot token is not configured.
func (t *TelegramService) Enqueue(ctx context.Context, merchantID uuid.UUID, notifType, text string) {
	if !t.Configured() {
		return
	}
	msg := TelegramQueueMessage{
		MerchantID:       merchantID,
		NotificationType: notifType,
		Text:             text,
	}
	b, _ := json.Marshal(msg)
	if err := t.redis.LPush(ctx, telegramQueue, string(b)).Err(); err != nil {
		log.Error().Err(err).Str("merchant_id", merchantID.String()).Msg("Failed to enqueue Telegram notification")
	}
}

// Send delivers a message directly to a Telegram chat ID (plain, already decrypted).
func (t *TelegramService) Send(ctx context.Context, chatID, text string) error {
	if !t.Configured() {
		fmt.Printf("[TELEGRAM SKIPPED] chat=%s msg=%s\n", chatID, text)
		return nil
	}
	appURL := os.Getenv("APP_URL")
	if appURL == "" || strings.HasPrefix(appURL, "http://localhost") || strings.HasPrefix(appURL, "https://localhost") || !strings.HasPrefix(appURL, "https://") {
		appURL = "https://nova-pay.in"
	}
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.botToken)
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
		"reply_markup": map[string]interface{}{
			"inline_keyboard": [][]map[string]interface{}{
				{{"text": "Open Dashboard", "url": appURL + "/dashboard"}},
			},
		},
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := t.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram API %d: %s", resp.StatusCode, string(bodyBytes))
	}
	return nil
}

// SetWebhook registers the bot webhook URL with Telegram.
func (t *TelegramService) SetWebhook(webhookURL, secretToken string) error {
	if !t.Configured() {
		return nil
	}
	url := fmt.Sprintf("https://api.telegram.org/bot%s/setWebhook", t.botToken)
	payload := map[string]string{
		"url":          webhookURL,
		"secret_token": secretToken,
	}
	b, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewReader(b)) //nolint:noctx
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("setWebhook failed: %d", resp.StatusCode)
	}
	return nil
}

// ============================================================================
// MESSAGE FORMATTERS
// ============================================================================

func FormatPaymentReceived(orderID string, amount int64) string {
	return fmt.Sprintf(
		"<b>Payment Received</b>\n\nOrder: <code>%s</code>\nAmount: <b>₹%.2f</b>\nStatus: Paid",
		orderID, float64(amount)/100,
	)
}

func FormatPaymentFailed(orderID string, amount int64) string {
	return fmt.Sprintf(
		"<b>Payment Failed</b>\n\nOrder: <code>%s</code>\nAmount: ₹%.2f\nStatus: Failed",
		orderID, float64(amount)/100,
	)
}

func FormatPaymentExpired(orderID string, amount int64) string {
	return fmt.Sprintf(
		"<b>Payment Expired</b>\n\nOrder: <code>%s</code>\nAmount: ₹%.2f\nStatus: Expired",
		orderID, float64(amount)/100,
	)
}

func FormatKYCApproved() string {
	return "<b>KYC Approved</b>\n\nYour identity has been verified. Your account is now fully active."
}

func FormatKYCRejected(reason string) string {
	return fmt.Sprintf("<b>KYC Rejected</b>\n\nReason: %s\n\nPlease resubmit your documents.", reason)
}

func FormatSubscriptionActivated(planName string) string {
	return fmt.Sprintf("<b>Subscription Active</b>\n\nPlan: <b>%s</b>\nFull API and gateway access unlocked.", planName)
}

func FormatSubscriptionExpiring(planName string, daysLeft int) string {
	return fmt.Sprintf(
		"<b>Subscription Expiring</b>\n\nPlan: <b>%s</b>\nExpires in: <b>%d days</b>\n\nRenew now to avoid service interruption.",
		planName, daysLeft,
	)
}

func FormatWebhookFailure(url string) string {
	return fmt.Sprintf("<b>Webhook Delivery Failed</b>\n\nURL: <code>%s</code>\nMax retry attempts reached. Check your endpoint.", url)
}

func FormatAPIKeyRotated() string {
	return "<b>API Key Rotated</b>\n\nYour API key and secret have been regenerated. Update your integration immediately."
}

func FormatSuspiciousActivity(detail string) string {
	return fmt.Sprintf("<b>Suspicious Activity Detected</b>\n\n%s\n\nReview your recent transactions.", detail)
}

func FormatDailySummary(date string, totalPayments int64, totalAmount int64, successRate float64) string {
	return fmt.Sprintf(
		"<b>Daily Summary — %s</b>\n\nTotal Payments: <b>%d</b>\nTotal Amount: <b>₹%.2f</b>\nSuccess Rate: <b>%.1f%%</b>",
		date, totalPayments, float64(totalAmount)/100, successRate,
	)
}

func FormatWeeklySummary(weekLabel string, totalPayments int64, totalAmount int64, successRate float64) string {
	return fmt.Sprintf(
		"<b>Weekly Summary — %s</b>\n\nTotal Payments: <b>%d</b>\nTotal Amount: <b>₹%.2f</b>\nSuccess Rate: <b>%.1f%%</b>",
		weekLabel, totalPayments, float64(totalAmount)/100, successRate,
	)
}
