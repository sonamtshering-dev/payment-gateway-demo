package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SystemStats struct {
	TotalMerchants     int64   `json:"total_merchants"`
	ActiveMerchants    int64   `json:"active_merchants"`
	TotalPayments      int64   `json:"total_payments"`
	TodayPayments      int64   `json:"today_payments"`
	TodayVolume        int64   `json:"today_volume"`
	PendingAlerts      int64   `json:"pending_alerts"`
	FailedWebhooks     int64   `json:"failed_webhooks"`
	OverallSuccessRate float64 `json:"overall_success_rate"`
}

func (r *Repository) UpdateAPIKeys(ctx context.Context, merchantID uuid.UUID, apiKey, encryptedSecret string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchants SET api_key = $1, api_secret = $2, updated_at = $3 WHERE id = $4`,
		apiKey, encryptedSecret, time.Now(), merchantID,
	)
	return err
}

func (r *Repository) UpdatePassword(ctx context.Context, merchantID uuid.UUID, passwordHash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchants SET password_hash = $1, updated_at = $2 WHERE id = $3`,
		passwordHash, time.Now(), merchantID,
	)
	return err
}

func (r *Repository) UpdateMerchantActive(ctx context.Context, merchantID uuid.UUID, active bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchants SET is_active = $1, updated_at = $2 WHERE id = $3`,
		active, time.Now(), merchantID,
	)
	return err
}

func (r *Repository) ResolveFraudAlert(ctx context.Context, alertID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE fraud_alerts SET resolved = true WHERE id = $1`, alertID)
	return err
}

func (r *Repository) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	stats := &SystemStats{}

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
		FROM merchants
	`).Scan(&stats.TotalMerchants, &stats.ActiveMerchants)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= CURRENT_DATE), 0),
			CASE WHEN COUNT(*) > 0
				THEN ROUND(COUNT(*) FILTER (WHERE status = 'paid')::numeric / COUNT(*)::numeric * 100, 1)
				ELSE 0 END
		FROM payments
	`).Scan(&stats.TotalPayments, &stats.TodayPayments, &stats.TodayVolume, &stats.OverallSuccessRate)
	if err != nil {
		return nil, err
	}

	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM fraud_alerts WHERE resolved = false`).Scan(&stats.PendingAlerts)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM webhook_deliveries WHERE success = false AND created_at >= NOW() - INTERVAL '24 hours'`).Scan(&stats.FailedWebhooks)

	return stats, nil
}
