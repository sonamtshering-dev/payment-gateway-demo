package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

func (r *Repository) GenerateReferralCode(merchantId string) (string, error) {
	b := make([]byte, 4)
	rand.Read(b)
	code := strings.ToUpper(hex.EncodeToString(b))
	ctx := context.Background()
	r.db.Exec(ctx, `UPDATE merchants SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL`, code, merchantId)
	var existing string
	r.db.QueryRow(ctx, `SELECT referral_code FROM merchants WHERE id = $1`, merchantId).Scan(&existing)
	return existing, nil
}

func (r *Repository) GetMerchantByReferralCode(code string) (string, error) {
	var id string
	err := r.db.QueryRow(context.Background(), `SELECT id FROM merchants WHERE referral_code = $1`, code).Scan(&id)
	return id, err
}

func (r *Repository) CreateReferral(referrerId, referredId string) error {
	_, err := r.db.Exec(context.Background(),
		`INSERT INTO referrals (referrer_id, referred_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (referred_id) DO NOTHING`,
		referrerId, referredId)
	return err
}

func (r *Repository) GetReferralStats(merchantId string) (map[string]interface{}, error) {
	ctx := context.Background()
	stats := map[string]interface{}{}
	var code string
	r.db.QueryRow(ctx, `SELECT COALESCE(referral_code,'') FROM merchants WHERE id = $1`, merchantId).Scan(&code)
	if code == "" {
		code, _ = r.GenerateReferralCode(merchantId)
	}
	stats["referral_code"] = code
	var total, rewarded int
	r.db.QueryRow(ctx, `SELECT COUNT(*), COUNT(CASE WHEN reward_applied THEN 1 END) FROM referrals WHERE referrer_id = $1`, merchantId).Scan(&total, &rewarded)
	stats["total_referrals"] = total
	stats["rewarded"] = rewarded
	stats["pending"] = total - rewarded
	stats["discount_pct"] = 20

	// Check if this merchant was referred by someone
	applied, _ := r.GetAppliedReferral(merchantId)
	stats["applied_referral"] = applied

	// Referral list
	list, _ := r.GetReferralList(merchantId)
	if list == nil {
		list = []map[string]interface{}{}
	}
	stats["referrals"] = list

	return stats, nil
}

func (r *Repository) GetAppliedReferral(merchantId string) (map[string]interface{}, error) {
	ctx := context.Background()
	var referrerName, status string
	err := r.db.QueryRow(ctx, `
		SELECT m.name, r.status
		FROM referrals r
		JOIN merchants m ON m.id = r.referrer_id
		WHERE r.referred_id = $1
	`, merchantId).Scan(&referrerName, &status)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"referrer_name": referrerName,
		"status":        status,
	}, nil
}

func (r *Repository) GetReferralList(merchantId string) ([]map[string]interface{}, error) {
	ctx := context.Background()
	rows, err := r.db.Query(ctx, `
		SELECT m.name, m.email, r.created_at, r.status, r.reward_applied
		FROM referrals r
		JOIN merchants m ON m.id = r.referred_id
		WHERE r.referrer_id = $1
		ORDER BY r.created_at DESC
		LIMIT 50
	`, merchantId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []map[string]interface{}
	for rows.Next() {
		var name, email, status string
		var createdAt time.Time
		var rewarded bool
		if err := rows.Scan(&name, &email, &createdAt, &status, &rewarded); err != nil {
			continue
		}
		list = append(list, map[string]interface{}{
			"name":     name,
			"email":    email,
			"joined":   createdAt.Format("02 Jan 2006"),
			"status":   status,
			"rewarded": rewarded,
		})
	}
	return list, nil
}

func (r *Repository) ApplyReferralCode(merchantId, code string) error {
	ctx := context.Background()
	code = strings.ToUpper(strings.TrimSpace(code))

	var referrerId string
	err := r.db.QueryRow(ctx, `SELECT id FROM merchants WHERE referral_code = $1`, code).Scan(&referrerId)
	if err != nil {
		return fmt.Errorf("invalid referral code")
	}
	if referrerId == merchantId {
		return fmt.Errorf("you cannot use your own referral code")
	}

	var exists bool
	r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_id = $1)`, merchantId).Scan(&exists)
	if exists {
		return fmt.Errorf("you have already applied a referral code")
	}

	_, err = r.db.Exec(ctx,
		`INSERT INTO referrals (referrer_id, referred_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (referred_id) DO NOTHING`,
		referrerId, merchantId)
	if err != nil {
		return err
	}

	// Give referrer 20% discount
	r.db.Exec(ctx, `UPDATE merchants SET referral_discount_pct = 20 WHERE id = $1`, referrerId)
	return nil
}

func (r *Repository) ApplyReferralReward(referrerId string) error {
	_, err := r.db.Exec(context.Background(), `UPDATE merchants SET referral_discount_pct = 20 WHERE id = $1`, referrerId)
	return err
}

func (r *Repository) MarkReferralRewarded(referrerId string) error {
	_, err := r.db.Exec(context.Background(),
		`UPDATE referrals SET status='rewarded', reward_applied=true WHERE referrer_id=$1 AND reward_applied=false`,
		referrerId)
	return err
}

func (r *Repository) AddEmailSubscriber(email, source string) error {
	_, err := r.db.Exec(context.Background(),
		`INSERT INTO email_subscribers (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`, email, source)
	return err
}

func (r *Repository) GetSubscriptionsExpiringInDays(ctx context.Context, days int) ([]MerchantSubscription, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, plan_id, status, started_at, expires_at
		FROM merchant_subscriptions
		WHERE status = 'active'
		AND expires_at::date = (CURRENT_DATE + $1 * INTERVAL '1 day')::date
	`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subs []MerchantSubscription
	for rows.Next() {
		var s MerchantSubscription
		if err := rows.Scan(&s.ID, &s.MerchantID, &s.PlanID, &s.Status, &s.StartedAt, &s.ExpiresAt); err != nil {
			continue
		}
		subs = append(subs, s)
	}
	return subs, nil
}
