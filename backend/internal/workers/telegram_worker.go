package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/services"
	"github.com/upay/gateway/internal/utils"
)

// telegramDispatchWorker consumes telegram:queue and delivers messages.
func (w *Worker) telegramDispatchWorker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Telegram dispatch worker stopped")
			return
		default:
			result, err := w.redis.BRPop(ctx, 5*time.Second, "telegram:queue").Result()
			if err != nil {
				if err != redis.Nil && ctx.Err() == nil {
					log.Error().Err(err).Msg("Telegram queue pop error")
				}
				continue
			}
			if len(result) < 2 {
				continue
			}
			var msg services.TelegramQueueMessage
			if err := json.Unmarshal([]byte(result[1]), &msg); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal telegram queue message")
				continue
			}
			w.deliverTelegram(ctx, msg)
		}
	}
}

func (w *Worker) deliverTelegram(ctx context.Context, msg services.TelegramQueueMessage) {
	settings, err := w.repo.GetTelegramSettings(ctx, msg.MerchantID)
	if err != nil || settings == nil {
		return // merchant not connected
	}
	if !settings.IsEnabled {
		return
	}
	if !containsString(settings.NotificationTypes, msg.NotificationType) {
		return // this type not enabled for merchant
	}

	chatID, err := utils.Decrypt(settings.ChatIDEncrypted, w.config.Security.EncryptionKey)
	if err != nil {
		log.Error().Err(err).Str("merchant_id", msg.MerchantID.String()).Msg("Failed to decrypt telegram chat ID")
		return
	}

	sendErr := w.telegram.Send(ctx, chatID, msg.Text)

	var errMsg *string
	if sendErr != nil {
		s := sendErr.Error()
		errMsg = &s
	}
	notif := &models.TelegramNotification{
		ID:               utils.NewID(),
		MerchantID:       msg.MerchantID,
		NotificationType: msg.NotificationType,
		Message:          msg.Text,
		Success:          sendErr == nil,
		ErrorMessage:     errMsg,
		Attempt:          1,
	}
	if err := w.repo.LogTelegramNotification(ctx, notif); err != nil {
		log.Error().Err(err).Msg("Failed to log telegram notification")
	}
	if sendErr != nil {
		log.Warn().Str("merchant_id", msg.MerchantID.String()).Str("type", msg.NotificationType).Err(sendErr).Msg("Telegram delivery failed")
	}
}

// telegramSummaryWorker fires daily and weekly summaries at 9 AM IST (3:30 AM UTC).
func (w *Worker) telegramSummaryWorker(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Telegram summary worker stopped")
			return
		case t := <-ticker.C:
			ist := t.UTC().Add(5*time.Hour + 30*time.Minute)
			if ist.Hour() == 9 && ist.Minute() < 30 {
				dateKey := ist.Format("2006-01-02")
				dailyFired := "telegram:daily:" + dateKey
				if w.redis.SetNX(ctx, dailyFired, "1", 2*time.Hour).Val() {
					w.sendSummaries(ctx, services.TGNotifDailySummary, ist)
				}
				// weekly on Monday
				if ist.Weekday() == time.Monday {
					_, isoWeek := ist.ISOWeek()
					weekKey := fmt.Sprintf("telegram:weekly:%d-%d", ist.Year(), isoWeek)
					weekFired := "telegram:weekly:" + weekKey
					if w.redis.SetNX(ctx, weekFired, "1", 26*time.Hour).Val() {
						w.sendSummaries(ctx, services.TGNotifWeeklySummary, ist)
					}
				}
			}
		}
	}
}

func (w *Worker) sendSummaries(ctx context.Context, notifType string, now time.Time) {
	merchants, err := w.repo.GetMerchantsWithTelegramType(ctx, notifType)
	if err != nil {
		log.Error().Err(err).Str("type", notifType).Msg("Failed to fetch telegram merchants for summary")
		return
	}
	for _, m := range merchants {
		var from, to time.Time
		if notifType == services.TGNotifWeeklySummary {
			to = now.Truncate(24 * time.Hour)
			from = to.AddDate(0, 0, -7)
		} else {
			to = now.Truncate(24 * time.Hour)
			from = to.AddDate(0, 0, -1)
		}
		total, amount, success, err := w.repo.GetPaymentSummary(ctx, m.MerchantID, from, to)
		if err != nil {
			continue
		}
		var successRate float64
		if total > 0 {
			successRate = float64(success) / float64(total) * 100
		}

		var text string
		if notifType == services.TGNotifWeeklySummary {
			_, week := from.ISOWeek()
			text = services.FormatWeeklySummary(fmt.Sprintf("Week %d", week), total, amount, successRate)
		} else {
			text = services.FormatDailySummary(from.Format("2 Jan 2006"), total, amount, successRate)
		}
		w.telegram.Enqueue(ctx, m.MerchantID, notifType, text)
	}
	log.Info().Str("type", notifType).Int("count", len(merchants)).Msg("Queued Telegram summaries")
}

// telegramRetentionWorker deletes notification logs older than 90 days.
func (w *Worker) telegramRetentionWorker(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Telegram retention worker stopped")
			return
		case <-ticker.C:
			cutoff := time.Now().AddDate(0, 0, -90)
			deleted, err := w.repo.DeleteOldTelegramNotifications(ctx, cutoff)
			if err != nil {
				log.Error().Err(err).Msg("Error pruning telegram notification log")
				continue
			}
			if deleted > 0 {
				log.Info().Int64("deleted", deleted).Msg("Pruned old telegram notifications")
			}
		}
	}
}

func containsString(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

// SendTelegramNotification is used by callers in workers to send a typed notification
// for a specific merchant without going through the Redis queue (useful for retry logic).
func (w *Worker) enqueueTelegramForMerchant(ctx context.Context, merchantID uuid.UUID, notifType, text string) {
	w.telegram.Enqueue(ctx, merchantID, notifType, text)
}
