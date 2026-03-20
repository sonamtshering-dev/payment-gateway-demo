package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// GetMerchantPaytmMID returns the Paytm MID for a merchant's active UPI entry
func (r *Repository) GetMerchantPaytmMID(ctx context.Context, merchantID uuid.UUID) (string, error) {
	var mid string
	// Match by the encrypted upi_id stored in the payment
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(paytm_mid, '') FROM merchant_upis 
		 WHERE merchant_id = $1 AND paytm_enabled = TRUE AND is_active = TRUE 
		 ORDER BY priority ASC LIMIT 1`,
		merchantID,
	).Scan(&mid)
	if err != nil {
		return "", nil
	}
	return mid, nil
}

func (r *Repository) GetPaytmMIDByUPIID(ctx context.Context, encryptedUPIID string) (string, error) {
	var mid string
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(paytm_mid, '') FROM merchant_upis 
		 WHERE upi_id = $1 AND paytm_enabled = TRUE`,
		encryptedUPIID,
	).Scan(&mid)
	if err != nil {
		return "", nil
	}
	return mid, nil
}

// SavePaytmMID saves or updates the Paytm MID for a merchant's UPI entry
func (r *Repository) SavePaytmMID(ctx context.Context, merchantID uuid.UUID, upiID, mid string) error {
	// upiID here is the UUID of the merchant_upis row
	_, err := r.db.Exec(ctx,
		`UPDATE merchant_upis 
		 SET paytm_mid = $1, paytm_enabled = TRUE
		 WHERE merchant_id = $2 AND id = $3`,
		mid, merchantID, upiID,
	)
	return err
}

// GetPendingPaytmPayments returns all pending payments that have a paytm_txn_ref
// and were created within the last 30 minutes (to avoid polling old expired ones)
func (r *Repository) GetPendingPaytmPayments(ctx context.Context) ([]models.Payment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, merchant_id, order_id, amount, currency, status, 
		        upi_id, upi_intent_link, qr_code_data, 
		        COALESCE(paytm_txn_ref, ''), expires_at, created_at
		 FROM payments
		 WHERE status = 'pending' 
		   AND paytm_txn_ref IS NOT NULL 
		   AND paytm_txn_ref != ''
		   AND created_at > NOW() - INTERVAL '30 minutes'
		   AND expires_at > NOW()
		 ORDER BY created_at ASC
		 LIMIT 50`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		var p models.Payment
		err := rows.Scan(
			&p.ID, &p.MerchantID, &p.OrderID, &p.Amount, &p.Currency, &p.Status,
			&p.UPIID, &p.UPIIntentLink, &p.QRCodeData,
			&p.PaytmTxnRef, &p.ExpiresAt, &p.CreatedAt,
		)
		if err != nil {
			continue
		}
		payments = append(payments, p)
	}
	return payments, nil
}

// MarkPaymentPaid updates payment status to paid and stores the UTR
func (r *Repository) MarkPaymentPaid(ctx context.Context, paymentID uuid.UUID, utr string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE payments 
		 SET status = 'paid', utr = $1, paid_at = NOW(), updated_at = NOW(), paytm_verified = TRUE
		 WHERE id = $2 AND status = 'pending'`,
		utr, paymentID,
	)
	return err
}

// GetPaymentByIDSimple returns a payment by ID (lightweight, no QR data)
func (r *Repository) GetPaymentByIDSimple(ctx context.Context, id uuid.UUID) (*models.Payment, error) {
	var p models.Payment
	err := r.db.QueryRow(ctx,
		`SELECT id, merchant_id, order_id, amount, currency, status,
		        COALESCE(utr, ''), COALESCE(paytm_txn_ref, ''), expires_at, created_at
		 FROM payments WHERE id = $1`,
		id,
	).Scan(
		&p.ID, &p.MerchantID, &p.OrderID, &p.Amount, &p.Currency, &p.Status,
		&p.UTR, &p.PaytmTxnRef, &p.ExpiresAt, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}