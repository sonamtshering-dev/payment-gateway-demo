package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (r *Repository) GetTelegramSettings(ctx context.Context, merchantID uuid.UUID) (*models.MerchantTelegram, error) {
	row := r.db.QueryRow(ctx, `
		SELECT merchant_id, chat_id_encrypted, is_enabled, notification_types, connected_at, updated_at
		FROM merchant_telegram
		WHERE merchant_id = $1`, merchantID)

	var t models.MerchantTelegram
	err := row.Scan(
		&t.MerchantID,
		&t.ChatIDEncrypted,
		&t.IsEnabled,
		&t.NotificationTypes,
		&t.ConnectedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		return nil, nil // not connected
	}
	return &t, nil
}

func (r *Repository) UpsertTelegramSettings(ctx context.Context, t *models.MerchantTelegram) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO merchant_telegram (merchant_id, chat_id_encrypted, is_enabled, notification_types, connected_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (merchant_id) DO UPDATE SET
			chat_id_encrypted  = EXCLUDED.chat_id_encrypted,
			is_enabled         = EXCLUDED.is_enabled,
			notification_types = EXCLUDED.notification_types,
			updated_at         = NOW()`,
		t.MerchantID, t.ChatIDEncrypted, t.IsEnabled, t.NotificationTypes,
	)
	return err
}

func (r *Repository) UpdateTelegramPreferences(ctx context.Context, merchantID uuid.UUID, enabled bool, types []string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_telegram
		SET is_enabled = $2, notification_types = $3, updated_at = NOW()
		WHERE merchant_id = $1`,
		merchantID, enabled, types,
	)
	return err
}

func (r *Repository) DeleteTelegramSettings(ctx context.Context, merchantID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM merchant_telegram WHERE merchant_id = $1`, merchantID)
	return err
}

func (r *Repository) GetMerchantsWithTelegramType(ctx context.Context, notifType string) ([]models.MerchantTelegram, error) {
	rows, err := r.db.Query(ctx, `
		SELECT merchant_id, chat_id_encrypted, is_enabled, notification_types, connected_at, updated_at
		FROM merchant_telegram
		WHERE is_enabled = TRUE AND $1 = ANY(notification_types)`,
		notifType,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.MerchantTelegram
	for rows.Next() {
		var t models.MerchantTelegram
		if err := rows.Scan(&t.MerchantID, &t.ChatIDEncrypted, &t.IsEnabled, &t.NotificationTypes, &t.ConnectedAt, &t.UpdatedAt); err != nil {
			continue
		}
		results = append(results, t)
	}
	return results, nil
}

func (r *Repository) LogTelegramNotification(ctx context.Context, n *models.TelegramNotification) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO telegram_notifications (id, merchant_id, notification_type, message, success, error_message, attempt, sent_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		n.ID, n.MerchantID, n.NotificationType, n.Message, n.Success, n.ErrorMessage, n.Attempt,
	)
	return err
}

func (r *Repository) GetTelegramHistory(ctx context.Context, merchantID uuid.UUID, limit, offset int) ([]models.TelegramNotification, int64, error) {
	var total int64
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM telegram_notifications WHERE merchant_id = $1`, merchantID).Scan(&total)

	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, notification_type, message, success, error_message, attempt, sent_at
		FROM telegram_notifications
		WHERE merchant_id = $1
		ORDER BY sent_at DESC
		LIMIT $2 OFFSET $3`,
		merchantID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []models.TelegramNotification
	for rows.Next() {
		var n models.TelegramNotification
		if err := rows.Scan(&n.ID, &n.MerchantID, &n.NotificationType, &n.Message, &n.Success, &n.ErrorMessage, &n.Attempt, &n.SentAt); err != nil {
			continue
		}
		results = append(results, n)
	}
	return results, total, nil
}

func (r *Repository) DeleteOldTelegramNotifications(ctx context.Context, before time.Time) (int64, error) {
	tag, err := r.db.Exec(ctx, `DELETE FROM telegram_notifications WHERE sent_at < $1`, before)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// GetPaymentSummary returns aggregated stats for a merchant over a time window.
func (r *Repository) GetPaymentSummary(ctx context.Context, merchantID uuid.UUID, from, to time.Time) (total int64, amount int64, successCount int64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT
			COUNT(*)                                       AS total,
			COALESCE(SUM(amount), 0)                       AS amount,
			COUNT(*) FILTER (WHERE status = 'paid')        AS success_count
		FROM payments
		WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3`,
		merchantID, from, to,
	).Scan(&total, &amount, &successCount)
	return
}
