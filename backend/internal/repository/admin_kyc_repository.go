package repository

import (
	"fmt"
	"context"
	"time"

	"github.com/google/uuid"
)

func (r *Repository) AdminListKYC(ctx context.Context) ([]*MerchantKYC, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, aadhaar_number, pan_number, business_name,
		       bank_account, bank_ifsc, bank_name, status, rejection_reason,
		       submitted_at, reviewed_at, COALESCE(document_url,'')
		FROM merchant_kyc ORDER BY submitted_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var kycs []*MerchantKYC
	for rows.Next() {
		var k MerchantKYC
		if err := rows.Scan(&k.ID, &k.MerchantID, &k.AadhaarNumber, &k.PANNumber,
			&k.BusinessName, &k.BankAccount, &k.BankIFSC, &k.BankName,
			&k.Status, &k.RejectionReason, &k.SubmittedAt, &k.ReviewedAt, &k.DocumentURL); err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		kycs = append(kycs, &k)
	}
	return kycs, nil
}

func (r *Repository) AdminUpdateKYC(ctx context.Context, merchantID uuid.UUID, status, reason string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_kyc SET status=$2, rejection_reason=$3, reviewed_at=$4, updated_at=NOW()
		WHERE merchant_id=$1
	`, merchantID, status, reason, now)
	return err
}

func (r *Repository) AdminExtendSubscription(ctx context.Context, merchantID uuid.UUID, days int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_subscriptions
		SET expires_at = COALESCE(expires_at, NOW()) + ($2 || ' days')::interval,
		    updated_at = NOW()
		WHERE merchant_id=$1 AND status='active'
	`, merchantID, days)
	return err
}
