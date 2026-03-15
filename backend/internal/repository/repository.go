package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/upay/gateway/internal/models"
)

type Repository struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// ============================================================================
// MERCHANT OPERATIONS
// ============================================================================

func (r *Repository) CreateMerchant(ctx context.Context, m *models.Merchant) error {
	query := `
		INSERT INTO merchants (id, name, email, password_hash, api_key, api_secret, webhook_secret, is_active, is_admin, daily_limit, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := r.db.Exec(ctx, query,
		m.ID, m.Name, m.Email, m.PasswordHash, m.APIKey, m.APISecret,
		m.WebhookSecret, m.IsActive, m.IsAdmin, m.DailyLimit, m.CreatedAt, m.UpdatedAt,
	)
	return err
}

func (r *Repository) GetMerchantByEmail(ctx context.Context, email string) (*models.Merchant, error) {
	query := `SELECT id, name, email, password_hash, api_key, api_secret, webhook_url, webhook_secret, is_active, is_admin, daily_limit, created_at, updated_at FROM merchants WHERE email = $1`

	m := &models.Merchant{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&m.ID, &m.Name, &m.Email, &m.PasswordHash, &m.APIKey, &m.APISecret,
		&m.WebhookURL, &m.WebhookSecret, &m.IsActive, &m.IsAdmin, &m.DailyLimit, &m.CreatedAt, &m.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) GetMerchantByID(ctx context.Context, id uuid.UUID) (*models.Merchant, error) {
	query := `SELECT id, name, email, password_hash, api_key, api_secret, webhook_url, webhook_secret, is_active, is_admin, daily_limit, created_at, updated_at FROM merchants WHERE id = $1`

	m := &models.Merchant{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.Name, &m.Email, &m.PasswordHash, &m.APIKey, &m.APISecret,
		&m.WebhookURL, &m.WebhookSecret, &m.IsActive, &m.IsAdmin, &m.DailyLimit, &m.CreatedAt, &m.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) GetMerchantByAPIKey(ctx context.Context, apiKey string) (*models.Merchant, error) {
	query := `SELECT id, name, email, password_hash, api_key, api_secret, webhook_url, webhook_secret, is_active, is_admin, daily_limit, created_at, updated_at FROM merchants WHERE api_key = $1 AND is_active = true`

	m := &models.Merchant{}
	err := r.db.QueryRow(ctx, query, apiKey).Scan(
		&m.ID, &m.Name, &m.Email, &m.PasswordHash, &m.APIKey, &m.APISecret,
		&m.WebhookURL, &m.WebhookSecret, &m.IsActive, &m.IsAdmin, &m.DailyLimit, &m.CreatedAt, &m.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) UpdateMerchantWebhook(ctx context.Context, merchantID uuid.UUID, webhookURL string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchants SET webhook_url = $1, updated_at = $2 WHERE id = $3`,
		webhookURL, time.Now(), merchantID,
	)
	return err
}

func (r *Repository) ListMerchants(ctx context.Context, filter models.AdminMerchantFilter) ([]models.Merchant, int64, error) {
	countQuery := `SELECT COUNT(*) FROM merchants WHERE 1=1`
	dataQuery := `SELECT id, name, email, api_key, webhook_url, is_active, is_admin, daily_limit, created_at, updated_at FROM merchants WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if filter.IsActive != nil {
		clause := fmt.Sprintf(` AND is_active = $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.IsActive)
		argIdx++
	}
	if filter.Search != "" {
		clause := fmt.Sprintf(` AND (name ILIKE $%d OR email ILIKE $%d)`, argIdx, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit
	dataQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var merchants []models.Merchant
	for rows.Next() {
		var m models.Merchant
		if err := rows.Scan(&m.ID, &m.Name, &m.Email, &m.APIKey, &m.WebhookURL, &m.IsActive, &m.IsAdmin, &m.DailyLimit, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, 0, err
		}
		merchants = append(merchants, m)
	}
	return merchants, total, nil
}

// ============================================================================
// UPI OPERATIONS
// ============================================================================

func (r *Repository) AddMerchantUPI(ctx context.Context, upi *models.MerchantUPI) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO merchant_upis (id, merchant_id, upi_id, label, is_active, priority, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		upi.ID, upi.MerchantID, upi.UPIID, upi.Label, upi.IsActive, upi.Priority, upi.CreatedAt,
	)
	return err
}

func (r *Repository) GetMerchantUPIs(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantUPI, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, merchant_id, upi_id, label, is_active, priority, created_at FROM merchant_upis WHERE merchant_id = $1 AND is_active = true ORDER BY priority ASC`,
		merchantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var upis []models.MerchantUPI
	for rows.Next() {
		var u models.MerchantUPI
		if err := rows.Scan(&u.ID, &u.MerchantID, &u.UPIID, &u.Label, &u.IsActive, &u.Priority, &u.CreatedAt); err != nil {
			return nil, err
		}
		upis = append(upis, u)
	}
	return upis, nil
}

func (r *Repository) DeleteMerchantUPI(ctx context.Context, upiID, merchantID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchant_upis SET is_active = false WHERE id = $1 AND merchant_id = $2`,
		upiID, merchantID,
	)
	return err
}

// GetNextUPIForRotation returns the next active UPI ID using round-robin priority
func (r *Repository) GetNextUPIForRotation(ctx context.Context, merchantID uuid.UUID) (*models.MerchantUPI, error) {
	// Get the UPI with lowest usage count in current hour for load distribution
	query := `
		SELECT u.id, u.merchant_id, u.upi_id, u.label, u.is_active, u.priority, u.created_at 
		FROM merchant_upis u
		LEFT JOIN (
			SELECT upi_id, COUNT(*) as usage_count 
			FROM payments 
			WHERE merchant_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
			GROUP BY upi_id
		) p ON u.upi_id = p.upi_id
		WHERE u.merchant_id = $1 AND u.is_active = true
		ORDER BY COALESCE(p.usage_count, 0) ASC, u.priority ASC
		LIMIT 1`

	var upi models.MerchantUPI
	err := r.db.QueryRow(ctx, query, merchantID).Scan(
		&upi.ID, &upi.MerchantID, &upi.UPIID, &upi.Label, &upi.IsActive, &upi.Priority, &upi.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &upi, err
}

// ============================================================================
// CASHIER OPERATIONS
// ============================================================================

func (r *Repository) AddCashierPhone(ctx context.Context, c *models.CashierPhone) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO cashier_phones (id, merchant_id, phone, name, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
		c.ID, c.MerchantID, c.Phone, c.Name, c.IsActive, c.CreatedAt,
	)
	return err
}

func (r *Repository) GetCashierPhones(ctx context.Context, merchantID uuid.UUID) ([]models.CashierPhone, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, merchant_id, phone, name, is_active, created_at FROM cashier_phones WHERE merchant_id = $1 AND is_active = true`,
		merchantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var phones []models.CashierPhone
	for rows.Next() {
		var c models.CashierPhone
		if err := rows.Scan(&c.ID, &c.MerchantID, &c.Phone, &c.Name, &c.IsActive, &c.CreatedAt); err != nil {
			return nil, err
		}
		phones = append(phones, c)
	}
	return phones, nil
}

// ============================================================================
// PAYMENT OPERATIONS
// ============================================================================

func (r *Repository) CreatePayment(ctx context.Context, p *models.Payment) error {
	query := `
		INSERT INTO payments (id, merchant_id, order_id, amount, currency, status, customer_reference, upi_id, upi_intent_link, qr_code_data, expires_at, client_ip, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`

	_, err := r.db.Exec(ctx, query,
		p.ID, p.MerchantID, p.OrderID, p.Amount, p.Currency, p.Status,
		p.CustomerReference, p.UPIID, p.UPIIntentLink, p.QRCodeData,
		p.ExpiresAt, p.ClientIP, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *Repository) GetPaymentByID(ctx context.Context, id uuid.UUID) (*models.Payment, error) {
	query := `SELECT id, merchant_id, order_id, amount, currency, status, customer_reference, upi_id, upi_intent_link, utr, qr_code_data, expires_at, paid_at, client_ip, created_at, updated_at FROM payments WHERE id = $1`

	p := &models.Payment{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.MerchantID, &p.OrderID, &p.Amount, &p.Currency, &p.Status,
		&p.CustomerReference, &p.UPIID, &p.UPIIntentLink, &p.UTR, &p.QRCodeData,
		&p.ExpiresAt, &p.PaidAt, &p.ClientIP, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *Repository) UpdatePaymentStatus(ctx context.Context, paymentID uuid.UUID, status models.PaymentStatus, utr *string) error {
	query := `UPDATE payments SET status = $1, utr = $2, updated_at = $3, paid_at = CASE WHEN $1 = 'paid' THEN $3 ELSE paid_at END WHERE id = $4`
	_, err := r.db.Exec(ctx, query, status, utr, time.Now(), paymentID)
	return err
}

func (r *Repository) GetPaymentsByMerchant(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) ([]models.Payment, int64, error) {
	countQuery := `SELECT COUNT(*) FROM payments WHERE merchant_id = $1`
	dataQuery := `SELECT id, merchant_id, order_id, amount, currency, status, customer_reference, upi_id, utr, expires_at, paid_at, created_at, updated_at FROM payments WHERE merchant_id = $1`

	args := []interface{}{merchantID}
	argIdx := 2

	if filter.Status != "" {
		clause := fmt.Sprintf(` AND status = $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.OrderID != "" {
		clause := fmt.Sprintf(` AND order_id = $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.OrderID)
		argIdx++
	}
	if filter.StartDate != "" {
		clause := fmt.Sprintf(` AND created_at >= $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.StartDate)
		argIdx++
	}
	if filter.EndDate != "" {
		clause := fmt.Sprintf(` AND created_at <= $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.EndDate)
		argIdx++
	}

	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit
	dataQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		var p models.Payment
		if err := rows.Scan(&p.ID, &p.MerchantID, &p.OrderID, &p.Amount, &p.Currency, &p.Status, &p.CustomerReference, &p.UPIID, &p.UTR, &p.ExpiresAt, &p.PaidAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, 0, err
		}
		payments = append(payments, p)
	}
	return payments, total, nil
}

func (r *Repository) CheckDuplicateUTR(ctx context.Context, utr string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE utr = $1 AND status = 'paid'`, utr).Scan(&count)
	return count > 0, err
}

func (r *Repository) CheckDuplicateOrderID(ctx context.Context, merchantID uuid.UUID, orderID string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM payments WHERE merchant_id = $1 AND order_id = $2 AND status IN ('pending', 'paid')`,
		merchantID, orderID,
	).Scan(&count)
	return count > 0, err
}

func (r *Repository) GetMerchantDailyVolume(ctx context.Context, merchantID uuid.UUID) (int64, error) {
	var volume int64
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE merchant_id = $1 AND status = 'paid' AND created_at >= CURRENT_DATE`,
		merchantID,
	).Scan(&volume)
	return volume, err
}

func (r *Repository) ExpirePendingPayments(ctx context.Context) (int64, error) {
	result, err := r.db.Exec(ctx,
		`UPDATE payments SET status = 'expired', updated_at = NOW() WHERE status = 'pending' AND expires_at < NOW()`,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// ============================================================================
// DASHBOARD ANALYTICS
// ============================================================================

func (r *Repository) GetMerchantStats(ctx context.Context, merchantID uuid.UUID) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	err := r.db.QueryRow(ctx, `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'paid'),
			COUNT(*) FILTER (WHERE status = 'failed'),
			COUNT(*) FILTER (WHERE status = 'pending'),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
			COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= CURRENT_DATE), 0)
		FROM payments WHERE merchant_id = $1
	`, merchantID).Scan(
		&stats.TotalTransactions, &stats.SuccessfulPayments, &stats.FailedPayments,
		&stats.PendingPayments, &stats.TotalVolume, &stats.TodayTransactions, &stats.TodayVolume,
	)
	if err != nil {
		return nil, err
	}

	if stats.TotalTransactions > 0 {
		stats.SuccessRate = float64(stats.SuccessfulPayments) / float64(stats.TotalTransactions) * 100
	}
	return stats, nil
}

// ============================================================================
// TRANSACTION LOG
// ============================================================================

func (r *Repository) CreateTransactionLog(ctx context.Context, log *models.TransactionLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO transaction_logs (id, payment_id, status, raw_response, source, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
		log.ID, log.PaymentID, log.Status, log.RawResponse, log.Source, log.CreatedAt,
	)
	return err
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

func (r *Repository) CreateWebhookDelivery(ctx context.Context, d *models.WebhookDelivery) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO webhook_deliveries (id, payment_id, merchant_id, url, payload, response_code, response_body, attempt, success, next_retry_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		d.ID, d.PaymentID, d.MerchantID, d.URL, d.Payload, d.ResponseCode, d.ResponseBody, d.Attempt, d.Success, d.NextRetryAt, d.CreatedAt,
	)
	return err
}

func (r *Repository) GetPendingWebhookRetries(ctx context.Context) ([]models.WebhookDelivery, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, payment_id, merchant_id, url, payload, attempt FROM webhook_deliveries WHERE success = false AND attempt < 5 AND next_retry_at <= NOW() ORDER BY next_retry_at ASC LIMIT 100`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deliveries []models.WebhookDelivery
	for rows.Next() {
		var d models.WebhookDelivery
		if err := rows.Scan(&d.ID, &d.PaymentID, &d.MerchantID, &d.URL, &d.Payload, &d.Attempt); err != nil {
			return nil, err
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}

func (r *Repository) UpdateWebhookDelivery(ctx context.Context, id uuid.UUID, responseCode int, responseBody string, success bool, nextRetry *time.Time) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhook_deliveries SET response_code = $1, response_body = $2, success = $3, attempt = attempt + 1, next_retry_at = $4 WHERE id = $5`,
		responseCode, responseBody, success, nextRetry, id,
	)
	return err
}

// ============================================================================
// FRAUD ALERTS
// ============================================================================

func (r *Repository) CreateFraudAlert(ctx context.Context, alert *models.FraudAlert) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO fraud_alerts (id, payment_id, merchant_id, alert_type, details, severity, resolved, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		alert.ID, alert.PaymentID, alert.MerchantID, alert.AlertType, alert.Details, alert.Severity, alert.Resolved, alert.CreatedAt,
	)
	return err
}

func (r *Repository) GetFraudAlerts(ctx context.Context, filter models.AdminFraudFilter) ([]models.FraudAlert, int64, error) {
	countQuery := `SELECT COUNT(*) FROM fraud_alerts WHERE 1=1`
	dataQuery := `SELECT id, payment_id, merchant_id, alert_type, details, severity, resolved, created_at FROM fraud_alerts WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if filter.Severity != "" {
		clause := fmt.Sprintf(` AND severity = $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.Severity)
		argIdx++
	}
	if filter.Resolved != nil {
		clause := fmt.Sprintf(` AND resolved = $%d`, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.Resolved)
		argIdx++
	}

	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit
	dataQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var alerts []models.FraudAlert
	for rows.Next() {
		var a models.FraudAlert
		if err := rows.Scan(&a.ID, &a.PaymentID, &a.MerchantID, &a.AlertType, &a.Details, &a.Severity, &a.Resolved, &a.CreatedAt); err != nil {
			return nil, 0, err
		}
		alerts = append(alerts, a)
	}
	return alerts, total, nil
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

func (r *Repository) SaveRefreshToken(ctx context.Context, rt *models.RefreshToken) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO refresh_tokens (id, merchant_id, token_hash, expires_at, revoked, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
		rt.ID, rt.MerchantID, rt.TokenHash, rt.ExpiresAt, rt.Revoked, rt.CreatedAt,
	)
	return err
}

func (r *Repository) GetRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	rt := &models.RefreshToken{}
	err := r.db.QueryRow(ctx,
		`SELECT id, merchant_id, token_hash, expires_at, revoked, created_at FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
		tokenHash,
	).Scan(&rt.ID, &rt.MerchantID, &rt.TokenHash, &rt.ExpiresAt, &rt.Revoked, &rt.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return rt, err
}

func (r *Repository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.db.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, tokenHash)
	return err
}

func (r *Repository) RevokeAllMerchantTokens(ctx context.Context, merchantID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE merchant_id = $1`, merchantID)
	return err
}

// ============================================================================
// AUDIT LOG
// ============================================================================

func (r *Repository) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO audit_logs (id, merchant_id, action, resource, ip, user_agent, details, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		log.ID, log.MerchantID, log.Action, log.Resource, log.IP, log.UserAgent, log.Details, log.CreatedAt,
	)
	return err
}
