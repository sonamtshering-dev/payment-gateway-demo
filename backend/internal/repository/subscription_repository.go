package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type MerchantSubscription struct {
	ID         uuid.UUID  `json:"id"`
	MerchantID uuid.UUID  `json:"merchant_id"`
	PlanID     uuid.UUID  `json:"plan_id"`
	Status     string     `json:"status"`
	StartedAt  time.Time  `json:"started_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
}

func (r *Repository) GetMerchantSubscription(ctx context.Context, merchantID uuid.UUID) (*MerchantSubscription, error) {
	var sub MerchantSubscription
	err := r.db.QueryRow(ctx, `
		SELECT id, merchant_id, plan_id, status, started_at, expires_at
		FROM merchant_subscriptions WHERE merchant_id=$1 AND status IN ('active','expired')
		ORDER BY created_at DESC LIMIT 1
	`, merchantID).Scan(&sub.ID, &sub.MerchantID, &sub.PlanID, &sub.Status, &sub.StartedAt, &sub.ExpiresAt)
	if err != nil {
		return nil, nil
	}
	return &sub, nil
}

func (r *Repository) UpsertMerchantSubscription(ctx context.Context, sub *MerchantSubscription) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_subscriptions SET status='cancelled', updated_at=NOW()
		WHERE merchant_id=$1 AND status='active'
	`, sub.MerchantID)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		INSERT INTO merchant_subscriptions (id, merchant_id, plan_id, status, started_at, expires_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
	`, sub.ID, sub.MerchantID, sub.PlanID, sub.Status, sub.StartedAt, sub.ExpiresAt)
	return err
}

func (r *Repository) CancelMerchantSubscription(ctx context.Context, merchantID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_subscriptions SET status='cancelled', updated_at=NOW()
		WHERE merchant_id=$1 AND status='active'
	`, merchantID)
	return err
}

func (r *Repository) ExpireSubscriptions(ctx context.Context) (int64, error) {
	result, err := r.db.Exec(ctx, `
		UPDATE merchant_subscriptions 
		SET status='expired', updated_at=NOW()
		WHERE status='active' 
		AND expires_at IS NOT NULL 
		AND expires_at < NOW()
	`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (r *Repository) GetMerchantUsage(ctx context.Context, merchantID uuid.UUID) (qrUsed int, linksActive int, apiToday int, err error) {
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE merchant_id=$1`, merchantID).Scan(&qrUsed)
	if err != nil { return }
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE merchant_id=$1 AND status='pending'`, merchantID).Scan(&linksActive)
	if err != nil { return }
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE merchant_id=$1 AND created_at >= NOW() - INTERVAL '24 hours'`, merchantID).Scan(&apiToday)
	return
}
