package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type MerchantKYC struct {
	ID              uuid.UUID  `json:"id"`
	MerchantID      uuid.UUID  `json:"merchant_id"`
	AadhaarNumber   string     `json:"aadhaar_number"`
	PANNumber       string     `json:"pan_number"`
	BusinessName    string     `json:"business_name"`
	BankAccount     string     `json:"bank_account"`
	BankIFSC        string     `json:"bank_ifsc"`
	BankName        string     `json:"bank_name"`
	Status          string     `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SubmittedAt     *time.Time `json:"submitted_at,omitempty"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	DocumentURL     string     `json:"document_url,omitempty"`
}

func (r *Repository) GetMerchantKYC(ctx context.Context, merchantID uuid.UUID) (*MerchantKYC, error) {
	var k MerchantKYC
	err := r.db.QueryRow(ctx, `
		SELECT id, merchant_id, aadhaar_number, pan_number, business_name,
		       bank_account, bank_ifsc, bank_name, status, rejection_reason,
		       submitted_at, reviewed_at
		FROM merchant_kyc WHERE merchant_id=$1
	`, merchantID).Scan(&k.ID, &k.MerchantID, &k.AadhaarNumber, &k.PANNumber,
		&k.BusinessName, &k.BankAccount, &k.BankIFSC, &k.BankName,
		&k.Status, &k.RejectionReason, &k.SubmittedAt, &k.ReviewedAt, &k.DocumentURL)
	if err != nil {
		return nil, nil
	}
	return &k, nil
}

func (r *Repository) UpsertMerchantKYC(ctx context.Context, k *MerchantKYC) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO merchant_kyc
		  (id, merchant_id, aadhaar_number, pan_number, business_name,
		   bank_account, bank_ifsc, bank_name, status, submitted_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
		ON CONFLICT (merchant_id) DO UPDATE SET
		  aadhaar_number=$3, pan_number=$4, business_name=$5,
		  bank_account=$6, bank_ifsc=$7, bank_name=$8,
		  status=$9, submitted_at=$10, updated_at=NOW()
	`, k.ID, k.MerchantID, k.AadhaarNumber, k.PANNumber, k.BusinessName,
		k.BankAccount, k.BankIFSC, k.BankName, k.Status, k.SubmittedAt)
	return err
}

func (r *Repository) UpdateKYCDocumentURL(ctx context.Context, merchantID uuid.UUID, docURL string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchant_kyc SET document_url = $1, updated_at = NOW() WHERE merchant_id = $2`,
		docURL, merchantID,
	)
	return err
}
