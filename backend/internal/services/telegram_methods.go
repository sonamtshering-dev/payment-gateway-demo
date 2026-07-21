package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

const telegramConnectTTL = 10 * time.Minute
const telegramConnectPrefix = "telegram:connect:"

// GetTelegramStatus returns the current connection state for a merchant.
func (s *Service) GetTelegramStatus(ctx context.Context, merchantID uuid.UUID) (*models.TelegramStatusResponse, error) {
	settings, err := s.repo.GetTelegramSettings(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	botName := ""
	if s.telegram != nil {
		botName = s.telegram.BotName()
	}
	if settings == nil {
		return &models.TelegramStatusResponse{
			Connected:         false,
			IsEnabled:         false,
			NotificationTypes: []string{},
			BotName:           botName,
		}, nil
	}
	return &models.TelegramStatusResponse{
		Connected:         true,
		IsEnabled:         settings.IsEnabled,
		NotificationTypes: settings.NotificationTypes,
		ConnectedAt:       &settings.ConnectedAt,
		BotName:           botName,
	}, nil
}

// GenerateTelegramConnectCode creates a 6-char alphanumeric code, stores it in
// Redis for 10 minutes, and returns it to the merchant.
func (s *Service) GenerateTelegramConnectCode(ctx context.Context, merchantID uuid.UUID) (*models.TelegramConnectResponse, error) {
	code, err := generateConnectCode()
	if err != nil {
		return nil, err
	}
	key := telegramConnectPrefix + code
	if err := s.redis.Set(ctx, key, merchantID.String(), telegramConnectTTL).Err(); err != nil {
		return nil, err
	}
	botName := ""
	if s.telegram != nil {
		botName = s.telegram.BotName()
	}
	return &models.TelegramConnectResponse{
		Code:      code,
		BotName:   botName,
		ExpiresIn: int(telegramConnectTTL.Seconds()),
	}, nil
}

// LinkTelegramChat processes a /connect CODE command from the bot, looks up the
// merchant ID in Redis, and stores the encrypted chat ID.
func (s *Service) LinkTelegramChat(ctx context.Context, code, chatID string) error {
	key := telegramConnectPrefix + code
	merchantIDStr, err := s.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return fmt.Errorf("invalid or expired code")
	}
	if err != nil {
		return err
	}
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		return fmt.Errorf("invalid merchant ID in code")
	}
	encrypted, err := utils.Encrypt(chatID, s.config.Security.EncryptionKey)
	if err != nil {
		return fmt.Errorf("encryption failed")
	}
	allTypes := []string{
		TGNotifPaymentReceived, TGNotifPaymentFailed, TGNotifPaymentExpired,
		TGNotifKYCApproved, TGNotifKYCRejected,
		TGNotifSubscriptionActive, TGNotifSubscriptionExpiry,
		TGNotifWebhookFailure, TGNotifAPIKeyRotated, TGNotifSuspiciousActivity,
		TGNotifDailySummary, TGNotifWeeklySummary,
	}
	settings := &models.MerchantTelegram{
		MerchantID:        merchantID,
		ChatIDEncrypted:   encrypted,
		IsEnabled:         true,
		NotificationTypes: allTypes,
	}
	if err := s.repo.UpsertTelegramSettings(ctx, settings); err != nil {
		return err
	}
	// Secondary index for /stop disconnect: chat -> merchant
	s.redis.Set(ctx, "telegram:chat:"+chatID, merchantID.String(), 0)
	// Delete the one-time code
	s.redis.Del(ctx, key)
	return nil
}

// UpdateTelegramSettings updates enabled flag and notification type preferences.
func (s *Service) UpdateTelegramSettings(ctx context.Context, merchantID uuid.UUID, enabled bool, types []string) error {
	existing, err := s.repo.GetTelegramSettings(ctx, merchantID)
	if err != nil {
		return err
	}
	if existing == nil {
		return fmt.Errorf("not connected")
	}
	return s.repo.UpdateTelegramPreferences(ctx, merchantID, enabled, types)
}

// SendTelegramTest sends a test message to the merchant's connected Telegram chat.
func (s *Service) SendTelegramTest(ctx context.Context, merchantID uuid.UUID) error {
	settings, err := s.repo.GetTelegramSettings(ctx, merchantID)
	if err != nil {
		return err
	}
	if settings == nil {
		return fmt.Errorf("not connected")
	}
	chatID, err := utils.Decrypt(settings.ChatIDEncrypted, s.config.Security.EncryptionKey)
	if err != nil {
		return fmt.Errorf("failed to decrypt chat ID")
	}
	text := "<b>NovaPay Test Notification</b>\n\nYour Telegram alerts are working correctly."
	return s.telegram.Send(ctx, chatID, text)
}

// DisconnectTelegram removes a merchant's Telegram connection.
func (s *Service) DisconnectTelegram(ctx context.Context, merchantID uuid.UUID) error {
	return s.repo.DeleteTelegramSettings(ctx, merchantID)
}

// DisconnectTelegramByChatID finds and removes a connection by encrypted chat ID
// (used when the user sends /stop to the bot directly).
func (s *Service) DisconnectTelegramByChatID(ctx context.Context, chatID string) error {
	// We can't reverse-lookup an encrypted chat ID efficiently.
	// Store a secondary index: telegram:chat:<chatID> = merchantID during LinkTelegramChat.
	key := "telegram:chat:" + chatID
	merchantIDStr, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("not found")
	}
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		return fmt.Errorf("invalid merchant")
	}
	s.redis.Del(ctx, key)
	return s.repo.DeleteTelegramSettings(ctx, merchantID)
}

// GetTelegramHistory returns paginated notification log.
func (s *Service) GetTelegramHistory(ctx context.Context, merchantID uuid.UUID, limit, offset int) ([]models.TelegramNotification, int64, error) {
	return s.repo.GetTelegramHistory(ctx, merchantID, limit, offset)
}

// ValidateTelegramWebhookSecret checks the secret token header from Telegram.
func (s *Service) ValidateTelegramWebhookSecret(secret string) bool {
	configured := s.config.Telegram.WebhookSecret
	if configured == "" {
		return true // not configured = accept all (dev mode)
	}
	return secret == configured
}

// SendTelegramDirect sends a message directly (used by the bot webhook handler).
func (s *Service) SendTelegramDirect(ctx context.Context, chatID, text string) {
	if s.telegram == nil {
		return
	}
	_ = s.telegram.Send(ctx, chatID, text)
}

// EnqueueTelegram pushes a notification to the Redis queue.
// Called from service methods to trigger async delivery.
func (s *Service) EnqueueTelegram(ctx context.Context, merchantID uuid.UUID, notifType, text string) {
	if s.telegram == nil {
		return
	}
	s.telegram.Enqueue(ctx, merchantID, notifType, text)
}

// Redis exposes the redis client for handlers that need direct Redis access.
func (s *Service) Redis() *redis.Client {
	return s.redis
}

// generateConnectCode returns a random 8-char alphanumeric uppercase code.
func generateConnectCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "NP" + hex.EncodeToString(b)[:6], nil
}

// ============================================================================
// NOTIFICATION TRIGGER HELPERS (called from service methods)
// ============================================================================

func (s *Service) notifyTelegramPaymentReceived(ctx context.Context, merchantID uuid.UUID, orderID string, amount int64) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifPaymentReceived, FormatPaymentReceived(orderID, amount))
}

func (s *Service) notifyTelegramPaymentFailed(ctx context.Context, merchantID uuid.UUID, orderID string, amount int64) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifPaymentFailed, FormatPaymentFailed(orderID, amount))
}

func (s *Service) notifyTelegramPaymentExpired(ctx context.Context, merchantID uuid.UUID, orderID string, amount int64) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifPaymentExpired, FormatPaymentExpired(orderID, amount))
}

func (s *Service) notifyTelegramKYCApproved(ctx context.Context, merchantID uuid.UUID) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifKYCApproved, FormatKYCApproved())
}

func (s *Service) notifyTelegramKYCRejected(ctx context.Context, merchantID uuid.UUID, reason string) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifKYCRejected, FormatKYCRejected(reason))
}

func (s *Service) notifyTelegramSubscriptionActivated(ctx context.Context, merchantID uuid.UUID, planName string) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifSubscriptionActive, FormatSubscriptionActivated(planName))
}

func (s *Service) notifyTelegramAPIKeyRotated(ctx context.Context, merchantID uuid.UUID) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifAPIKeyRotated, FormatAPIKeyRotated())
}

func (s *Service) notifyTelegramSuspiciousActivity(ctx context.Context, merchantID uuid.UUID, detail string) {
	s.EnqueueTelegram(ctx, merchantID, TGNotifSuspiciousActivity, FormatSuspiciousActivity(detail))
}

// PublicTelegramTriggers exposes triggers for code paths outside the service
// package (e.g. admin handlers, KYC handlers).
func (s *Service) TelegramNotifyKYCApproved(ctx context.Context, merchantID uuid.UUID) {
	s.notifyTelegramKYCApproved(ctx, merchantID)
}

func (s *Service) TelegramNotifyKYCRejected(ctx context.Context, merchantID uuid.UUID, reason string) {
	s.notifyTelegramKYCRejected(ctx, merchantID, reason)
}

func (s *Service) TelegramNotifySuspiciousActivity(ctx context.Context, merchantID uuid.UUID, detail string) {
	s.notifyTelegramSuspiciousActivity(ctx, merchantID, detail)
}

// ISTNow returns the current time in IST.
func ISTNow() time.Time {
	return time.Now().UTC().Add(5*time.Hour + 30*time.Minute)
}
