package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// CRYPTO CONFIG
// ============================================================================

func (r *Repository) GetCryptoConfig(ctx context.Context, merchantID uuid.UUID) (*models.MerchantCryptoConfig, error) {
	q := `SELECT merchant_id, usdt_enabled, pricing_mode, fixed_rate, adjustment_pct,
	             required_confirmations, payment_timeout_min, auto_verify, created_at, updated_at
	      FROM merchant_crypto_config WHERE merchant_id = $1`
	c := &models.MerchantCryptoConfig{}
	err := r.db.QueryRow(ctx, q, merchantID).Scan(
		&c.MerchantID, &c.USDTEnabled, &c.PricingMode, &c.FixedRate, &c.AdjustmentPct,
		&c.RequiredConfirmations, &c.PaymentTimeoutMin, &c.AutoVerify, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *Repository) UpsertCryptoConfig(ctx context.Context, c *models.MerchantCryptoConfig) error {
	q := `INSERT INTO merchant_crypto_config
	        (merchant_id, usdt_enabled, pricing_mode, fixed_rate, adjustment_pct,
	         required_confirmations, payment_timeout_min, auto_verify, created_at, updated_at)
	      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
	      ON CONFLICT (merchant_id) DO UPDATE SET
	        usdt_enabled=$2, pricing_mode=$3, fixed_rate=$4, adjustment_pct=$5,
	        required_confirmations=$6, payment_timeout_min=$7, auto_verify=$8, updated_at=NOW()`
	_, err := r.db.Exec(ctx, q,
		c.MerchantID, c.USDTEnabled, c.PricingMode, c.FixedRate, c.AdjustmentPct,
		c.RequiredConfirmations, c.PaymentTimeoutMin, c.AutoVerify,
	)
	return err
}

// ============================================================================
// CRYPTO WALLETS
// ============================================================================

func (r *Repository) ListCryptoWallets(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantCryptoWallet, error) {
	q := `SELECT id, merchant_id, network, address, is_active, created_at, updated_at
	      FROM merchant_crypto_wallets WHERE merchant_id = $1 ORDER BY network`
	rows, err := r.db.Query(ctx, q, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.MerchantCryptoWallet
	for rows.Next() {
		var w models.MerchantCryptoWallet
		if err := rows.Scan(&w.ID, &w.MerchantID, &w.Network, &w.Address, &w.IsActive, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (r *Repository) GetCryptoWallet(ctx context.Context, merchantID uuid.UUID, network string) (*models.MerchantCryptoWallet, error) {
	q := `SELECT id, merchant_id, network, address, is_active, created_at, updated_at
	      FROM merchant_crypto_wallets WHERE merchant_id = $1 AND network = $2`
	w := &models.MerchantCryptoWallet{}
	err := r.db.QueryRow(ctx, q, merchantID, network).Scan(
		&w.ID, &w.MerchantID, &w.Network, &w.Address, &w.IsActive, &w.CreatedAt, &w.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return w, err
}

func (r *Repository) UpsertCryptoWallet(ctx context.Context, w *models.MerchantCryptoWallet) error {
	q := `INSERT INTO merchant_crypto_wallets (id, merchant_id, network, address, is_active, created_at, updated_at)
	      VALUES ($1,$2,$3,$4,TRUE,NOW(),NOW())
	      ON CONFLICT (merchant_id, network) DO UPDATE SET address=$4, is_active=TRUE, updated_at=NOW()`
	_, err := r.db.Exec(ctx, q, w.ID, w.MerchantID, w.Network, w.Address)
	return err
}

func (r *Repository) DeleteCryptoWallet(ctx context.Context, merchantID uuid.UUID, network string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM merchant_crypto_wallets WHERE merchant_id=$1 AND network=$2`, merchantID, network)
	return err
}

// ============================================================================
// CRYPTO PAYMENTS
// ============================================================================

// CreateCryptoPayment inserts a pending crypto payment. The partial unique index
// on (merchant_id, network, merchant_wallet, expected_usdt) WHERE status='pending'
// enforces amount uniqueness; a collision surfaces as a unique-violation error.
func (r *Repository) CreateCryptoPayment(ctx context.Context, cp *models.CryptoPayment) error {
	q := `INSERT INTO crypto_payments
	        (id, payment_id, merchant_id, network, token_contract, merchant_wallet,
	         inr_amount, exchange_rate, pricing_mode, base_usdt, expected_usdt, status, expires_at, created_at, updated_at)
	      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,NOW(),NOW())`
	_, err := r.db.Exec(ctx, q,
		cp.ID, cp.PaymentID, cp.MerchantID, cp.Network, cp.TokenContract, cp.MerchantWallet,
		cp.INRAmount, cp.ExchangeRate, cp.PricingMode, cp.BaseUSDT, cp.ExpectedUSDT, cp.ExpiresAt,
	)
	return err
}

func (r *Repository) GetCryptoPaymentByID(ctx context.Context, id uuid.UUID) (*models.CryptoPayment, error) {
	q := `SELECT id, payment_id, merchant_id, network, token_contract, merchant_wallet,
	             inr_amount, exchange_rate, pricing_mode, base_usdt, expected_usdt, status,
	             tx_hash, sender_address, recipient_address, amount_received, block_number,
	             confirmations, tx_timestamp, verified_at, explorer_url, provider,
	             expires_at, created_at, updated_at
	      FROM crypto_payments WHERE id = $1`
	return scanCryptoPayment(r.db.QueryRow(ctx, q, id))
}

// GetActiveCryptoPaymentForOrder returns an existing pending crypto payment for
// an order+network, so re-selecting USDT reuses the locked rate instead of
// creating a duplicate.
func (r *Repository) GetActiveCryptoPaymentForOrder(ctx context.Context, paymentID uuid.UUID, network string) (*models.CryptoPayment, error) {
	q := `SELECT id, payment_id, merchant_id, network, token_contract, merchant_wallet,
	             inr_amount, exchange_rate, pricing_mode, base_usdt, expected_usdt, status,
	             tx_hash, sender_address, recipient_address, amount_received, block_number,
	             confirmations, tx_timestamp, verified_at, explorer_url, provider,
	             expires_at, created_at, updated_at
	      FROM crypto_payments
	      WHERE payment_id = $1 AND network = $2 AND status = 'pending' AND expires_at > NOW()
	      ORDER BY created_at DESC LIMIT 1`
	cp, err := scanCryptoPayment(r.db.QueryRow(ctx, q, paymentID, network))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return cp, err
}

// MarkCryptoPaymentPaid atomically transitions a crypto payment to paid ONLY if
// it is still pending. Returns true if this call performed the transition.
func (r *Repository) MarkCryptoPaymentPaid(ctx context.Context, id uuid.UUID, t *models.OnChainTransfer, txHash, explorerURL string, txTime time.Time) (bool, error) {
	q := `UPDATE crypto_payments SET
	        status='paid', tx_hash=$2, sender_address=$3, recipient_address=$4,
	        amount_received=$5, block_number=$6, confirmations=$7, tx_timestamp=$8,
	        verified_at=NOW(), explorer_url=$9, provider=$10, updated_at=NOW()
	      WHERE id=$1 AND status='pending'`
	tag, err := r.db.Exec(ctx, q, id, txHash, t.Sender, t.Recipient, t.AmountHuman,
		t.BlockNumber, t.Confirmations, txTime, explorerURL, t.Provider)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *Repository) ExpireCryptoPayments(ctx context.Context) (int64, error) {
	tag, err := r.db.Exec(ctx, `UPDATE crypto_payments SET status='expired', updated_at=NOW()
	                            WHERE status='pending' AND expires_at < NOW()`)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// CountPendingCryptoForAmount checks whether an exact expected amount is already
// reserved for a wallet+network (used to pick a non-colliding nonce up-front).
func (r *Repository) CountPendingCryptoForAmount(ctx context.Context, merchantID uuid.UUID, network, wallet, expected string) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM crypto_payments
	    WHERE merchant_id=$1 AND network=$2 AND merchant_wallet=$3 AND expected_usdt=$4 AND status='pending'`,
		merchantID, network, wallet, expected).Scan(&n)
	return n, err
}

func (r *Repository) LogCryptoVerification(ctx context.Context, l *models.CryptoVerificationLog) {
	_, _ = r.db.Exec(ctx, `INSERT INTO crypto_verification_log
	    (id, crypto_payment_id, payment_id, merchant_id, network, tx_hash, result, reason, provider, ip, created_at)
	    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
		l.ID, l.CryptoPaymentID, l.PaymentID, l.MerchantID, l.Network, l.TxHash, l.Result, l.Reason, l.Provider, l.IP)
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanCryptoPayment(row rowScanner) (*models.CryptoPayment, error) {
	cp := &models.CryptoPayment{}
	err := row.Scan(
		&cp.ID, &cp.PaymentID, &cp.MerchantID, &cp.Network, &cp.TokenContract, &cp.MerchantWallet,
		&cp.INRAmount, &cp.ExchangeRate, &cp.PricingMode, &cp.BaseUSDT, &cp.ExpectedUSDT, &cp.Status,
		&cp.TxHash, &cp.SenderAddress, &cp.RecipientAddr, &cp.AmountReceived, &cp.BlockNumber,
		&cp.Confirmations, &cp.TxTimestamp, &cp.VerifiedAt, &cp.ExplorerURL, &cp.Provider,
		&cp.ExpiresAt, &cp.CreatedAt, &cp.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return cp, nil
}
