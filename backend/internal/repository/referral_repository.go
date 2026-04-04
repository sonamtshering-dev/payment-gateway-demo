package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"strings"
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
	return stats, nil
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
