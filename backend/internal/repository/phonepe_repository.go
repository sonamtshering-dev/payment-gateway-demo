package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

type PhonePeConfig struct {
	MerchantID string
	SaltKey    string // encrypted
	SaltIndex  string
}

// SavePhonePeConfig stores PhonePe PG credentials against the merchant's active UPI entry.
func (r *Repository) SavePhonePeConfig(ctx context.Context, merchantID uuid.UUID, phonePeMerchantID, encryptedSaltKey, saltIndex string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchant_upis
		 SET phonepe_merchant_id = $1,
		     phonepe_salt_key    = $2,
		     phonepe_salt_index  = $3,
		     phonepe_enabled     = TRUE
		 WHERE merchant_id = $4 AND is_active = TRUE`,
		phonePeMerchantID, encryptedSaltKey, saltIndex, merchantID,
	)
	return err
}

// GetPhonePeConfig returns the PhonePe credentials for a merchant's active UPI.
func (r *Repository) GetPhonePeConfig(ctx context.Context, merchantID uuid.UUID) (*PhonePeConfig, error) {
	var cfg PhonePeConfig
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(phonepe_merchant_id,''), COALESCE(phonepe_salt_key,''), COALESCE(phonepe_salt_index,'1')
		 FROM merchant_upis
		 WHERE merchant_id = $1 AND phonepe_enabled = TRUE AND is_active = TRUE
		 ORDER BY priority ASC LIMIT 1`,
		merchantID,
	).Scan(&cfg.MerchantID, &cfg.SaltKey, &cfg.SaltIndex)
	if err != nil {
		return nil, err
	}
	if cfg.MerchantID == "" {
		return nil, nil
	}
	return &cfg, nil
}

// GetPendingPhonePePayments returns pending payments whose merchants have PhonePe configured.
// It reuses the paytm_txn_ref column as the merchantTransactionId (same tr= param, both providers honour it).
func (r *Repository) GetPendingPhonePePayments(ctx context.Context) ([]models.Payment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT p.id, p.merchant_id, p.order_id, p.amount, p.currency, p.status,
		        p.upi_id, p.upi_intent_link, p.qr_code_data,
		        COALESCE(p.paytm_txn_ref, ''), p.expires_at, p.created_at
		 FROM payments p
		 INNER JOIN merchant_upis mu
		         ON mu.merchant_id = p.merchant_id
		        AND mu.phonepe_enabled = TRUE
		        AND mu.is_active = TRUE
		 WHERE p.status = 'pending'
		   AND p.paytm_txn_ref IS NOT NULL
		   AND p.paytm_txn_ref != ''
		   AND p.created_at > NOW() - INTERVAL '30 minutes'
		   AND p.expires_at > NOW()
		 ORDER BY p.created_at ASC
		 LIMIT 50`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		var p models.Payment
		if err := rows.Scan(
			&p.ID, &p.MerchantID, &p.OrderID, &p.Amount, &p.Currency, &p.Status,
			&p.UPIID, &p.UPIIntentLink, &p.QRCodeData,
			&p.PaytmTxnRef, &p.ExpiresAt, &p.CreatedAt,
		); err != nil {
			continue
		}
		payments = append(payments, p)
	}
	return payments, nil
}
