package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// SYSTEM STATS
// ============================================================================

type SystemStats struct {
	TotalMerchants     int64   `json:"total_merchants"`
	ActiveMerchants    int64   `json:"active_merchants"`
	InactiveMerchants  int64   `json:"inactive_merchants"`
	TotalPayments      int64   `json:"total_payments"`
	TodayPayments      int64   `json:"today_payments"`
	TodayVolume        int64   `json:"today_volume"`
	WeekVolume         int64   `json:"week_volume"`
	MonthVolume        int64   `json:"month_volume"`
	TotalVolume        int64   `json:"total_volume"`
	SuccessfulPayments int64   `json:"successful_payments"`
	FailedPayments     int64   `json:"failed_payments"`
	PendingPayments    int64   `json:"pending_payments"`
	PendingAlerts      int64   `json:"pending_alerts"`
	FailedWebhooks     int64   `json:"failed_webhooks"`
	TotalWebhooks      int64   `json:"total_webhooks"`
	OverallSuccessRate float64 `json:"overall_success_rate"`
	PendingKYC         int64   `json:"pending_kyc"`
	ActiveSubscriptions int64  `json:"active_subscriptions"`
	NewMerchantsToday  int64   `json:"new_merchants_today"`
	NewMerchantsWeek   int64   `json:"new_merchants_week"`
}

type DailyRevenue struct {
	Date    string `json:"date"`
	Revenue int64  `json:"revenue"`
	Count   int64  `json:"count"`
	Success int64  `json:"success"`
	Failed  int64  `json:"failed"`
}

type AdminMerchantDetail struct {
	ID           uuid.UUID  `json:"id"`
	Name         string     `json:"name"`
	Email        string     `json:"email"`
	APIKey       string     `json:"api_key"`
	WebhookURL   string     `json:"webhook_url"`
	IsActive     bool       `json:"is_active"`
	IsAdmin      bool       `json:"is_admin"`
	BusinessName *string    `json:"business_name"`
	LogoURL      *string    `json:"logo_url"`
	DailyLimit   int64      `json:"daily_limit"`
	ReferralCode *string    `json:"referral_code"`
	CreatedAt    time.Time  `json:"created_at"`

	// Stats
	TotalPayments int64   `json:"total_payments"`
	TotalVolume   int64   `json:"total_volume"`
	SuccessRate   float64 `json:"success_rate"`
	LastPaymentAt *time.Time `json:"last_payment_at"`

	// Subscription
	SubscriptionStatus string     `json:"subscription_status"`
	SubscriptionPlan   string     `json:"subscription_plan"`
	SubscriptionExpiry *time.Time `json:"subscription_expiry"`

	// KYC
	KYCStatus string `json:"kyc_status"`
}

type AdminWebhookLog struct {
	ID           uuid.UUID  `json:"id"`
	PaymentID    uuid.UUID  `json:"payment_id"`
	MerchantID   uuid.UUID  `json:"merchant_id"`
	MerchantName string     `json:"merchant_name"`
	URL          string     `json:"url"`
	ResponseCode int        `json:"response_code"`
	Success      bool       `json:"success"`
	Attempt      int        `json:"attempt"`
	NextRetryAt  *time.Time `json:"next_retry_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

type AdminSubscription struct {
	ID           *uuid.UUID `json:"id"`
	MerchantID   uuid.UUID  `json:"merchant_id"`
	MerchantName string     `json:"merchant_name"`
	MerchantEmail string    `json:"merchant_email"`
	PlanID       *uuid.UUID `json:"plan_id"`
	PlanName     string     `json:"plan_name"`
	Status       string     `json:"status"`
	StartedAt    *time.Time `json:"started_at"`
	ExpiresAt    *time.Time `json:"expires_at"`
}

// ============================================================================
// BASIC CRUD OPS
// ============================================================================

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

// ============================================================================
// SYSTEM STATS
// ============================================================================

func (r *Repository) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	stats := &SystemStats{}

	r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE is_active = true),
			COUNT(*) FILTER (WHERE is_active = false),
			COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')
		FROM merchants WHERE is_admin = false
	`).Scan(&stats.TotalMerchants, &stats.ActiveMerchants, &stats.InactiveMerchants,
		&stats.NewMerchantsToday, &stats.NewMerchantsWeek)

	r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'paid'),
			COUNT(*) FILTER (WHERE status = 'failed'),
			COUNT(*) FILTER (WHERE status = 'pending'),
			COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= CURRENT_DATE), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '7 days'), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND date_trunc('month', created_at) = date_trunc('month', NOW())), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
			CASE WHEN COUNT(*) > 0
				THEN ROUND(COUNT(*) FILTER (WHERE status = 'paid')::numeric / COUNT(*)::numeric * 100, 1)
				ELSE 0 END
		FROM payments
	`).Scan(&stats.TotalPayments, &stats.SuccessfulPayments, &stats.FailedPayments,
		&stats.PendingPayments, &stats.TodayPayments, &stats.TodayVolume, &stats.WeekVolume,
		&stats.MonthVolume, &stats.TotalVolume, &stats.OverallSuccessRate)

	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM fraud_alerts WHERE resolved = false`).Scan(&stats.PendingAlerts)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM webhook_deliveries WHERE success = false AND created_at >= NOW() - INTERVAL '24 hours'`).Scan(&stats.FailedWebhooks)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM webhook_deliveries WHERE created_at >= NOW() - INTERVAL '24 hours'`).Scan(&stats.TotalWebhooks)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM merchant_kyc WHERE status = 'pending'`).Scan(&stats.PendingKYC)
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM merchant_subscriptions WHERE status = 'active'`).Scan(&stats.ActiveSubscriptions)

	return stats, nil
}

// ============================================================================
// REVENUE CHART
// ============================================================================

func (r *Repository) GetRevenueChart(ctx context.Context, days int) ([]DailyRevenue, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			TO_CHAR(gs.day, 'YYYY-MM-DD') AS date,
			COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS revenue,
			COUNT(p.id) AS total,
			COUNT(p.id) FILTER (WHERE p.status = 'paid') AS success,
			COUNT(p.id) FILTER (WHERE p.status = 'failed') AS failed
		FROM generate_series(
			(NOW() - ($1 - 1) * INTERVAL '1 day')::date,
			NOW()::date,
			'1 day'::interval
		) AS gs(day)
		LEFT JOIN payments p ON DATE(p.created_at) = gs.day
		GROUP BY gs.day
		ORDER BY gs.day ASC
	`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []DailyRevenue
	for rows.Next() {
		var d DailyRevenue
		rows.Scan(&d.Date, &d.Revenue, &d.Count, &d.Success, &d.Failed)
		result = append(result, d)
	}
	return result, nil
}

// ============================================================================
// MERCHANT DETAIL
// ============================================================================

func (r *Repository) GetAdminMerchantDetail(ctx context.Context, merchantID uuid.UUID) (*AdminMerchantDetail, error) {
	d := &AdminMerchantDetail{}

	err := r.db.QueryRow(ctx, `
		SELECT
			m.id, m.name, m.email, m.api_key, m.webhook_url,
			m.is_active, m.is_admin, m.business_name, COALESCE(m.logo_url,''), m.daily_limit,
			m.referral_code, m.created_at
		FROM merchants m WHERE m.id = $1
	`, merchantID).Scan(
		&d.ID, &d.Name, &d.Email, &d.APIKey, &d.WebhookURL,
		&d.IsActive, &d.IsAdmin, &d.BusinessName, &d.LogoURL, &d.DailyLimit,
		&d.ReferralCode, &d.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Payment stats
	r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(amount) FILTER (WHERE status='paid'), 0),
			CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status='paid')::numeric / COUNT(*)::numeric * 100, 1) ELSE 0 END,
			MAX(created_at) FILTER (WHERE status='paid')
		FROM payments WHERE merchant_id = $1
	`, merchantID).Scan(&d.TotalPayments, &d.TotalVolume, &d.SuccessRate, &d.LastPaymentAt)

	// Subscription
	r.db.QueryRow(ctx, `
		SELECT s.status, COALESCE(p.name,''), s.expires_at
		FROM merchant_subscriptions s
		LEFT JOIN plans p ON s.plan_id = p.id
		WHERE s.merchant_id = $1 AND s.status IN ('active','expired')
		ORDER BY s.created_at DESC LIMIT 1
	`, merchantID).Scan(&d.SubscriptionStatus, &d.SubscriptionPlan, &d.SubscriptionExpiry)

	// KYC
	r.db.QueryRow(ctx, `SELECT status FROM merchant_kyc WHERE merchant_id=$1 ORDER BY created_at DESC LIMIT 1`, merchantID).Scan(&d.KYCStatus)

	return d, nil
}

// ============================================================================
// WEBHOOK LOGS
// ============================================================================

func (r *Repository) GetAdminWebhookLogs(ctx context.Context, page, limit int, merchantIDStr string) ([]AdminWebhookLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64

	if merchantIDStr != "" {
		mid, err := uuid.Parse(merchantIDStr)
		if err != nil {
			return nil, 0, fmt.Errorf("invalid merchant_id")
		}
		r.db.QueryRow(ctx, `SELECT COUNT(*) FROM webhook_deliveries w WHERE w.merchant_id = $1`, mid).Scan(&total)
		r2, err := r.db.Query(ctx, `
			SELECT w.id, w.payment_id, w.merchant_id, COALESCE(m.name,''), w.url,
				w.response_code, w.success, w.attempt, w.next_retry_at, w.created_at
			FROM webhook_deliveries w
			LEFT JOIN merchants m ON w.merchant_id = m.id
			WHERE w.merchant_id = $1
			ORDER BY w.created_at DESC LIMIT $2 OFFSET $3
		`, mid, limit, offset)
		if err != nil {
			return nil, 0, err
		}
		defer r2.Close()
		var logs []AdminWebhookLog
		for r2.Next() {
			var l AdminWebhookLog
			r2.Scan(&l.ID, &l.PaymentID, &l.MerchantID, &l.MerchantName,
				&l.URL, &l.ResponseCode, &l.Success, &l.Attempt, &l.NextRetryAt, &l.CreatedAt)
			logs = append(logs, l)
		}
		return logs, total, nil
	}

	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM webhook_deliveries`).Scan(&total)
	r2, err := r.db.Query(ctx, `
		SELECT w.id, w.payment_id, w.merchant_id, COALESCE(m.name,''), w.url,
			w.response_code, w.success, w.attempt, w.next_retry_at, w.created_at
		FROM webhook_deliveries w
		LEFT JOIN merchants m ON w.merchant_id = m.id
		ORDER BY w.created_at DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer r2.Close()

	var logs []AdminWebhookLog
	for r2.Next() {
		var l AdminWebhookLog
		r2.Scan(&l.ID, &l.PaymentID, &l.MerchantID, &l.MerchantName,
			&l.URL, &l.ResponseCode, &l.Success, &l.Attempt, &l.NextRetryAt, &l.CreatedAt)
		logs = append(logs, l)
	}
	return logs, total, nil
}

func (r *Repository) MarkWebhookForRetry(ctx context.Context, deliveryID uuid.UUID) error {
	retryAt := time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE webhook_deliveries
		SET next_retry_at = $1, success = false
		WHERE id = $2
	`, retryAt, deliveryID)
	return err
}

// ============================================================================
// SUBSCRIPTIONS LIST
// ============================================================================

func (r *Repository) GetAdminSubscriptions(ctx context.Context, page, limit int) ([]AdminSubscription, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM merchants`).Scan(&total)

	rows, err := r.db.Query(ctx, `
		SELECT
			s.id, m.id, m.name, m.email,
			s.plan_id, COALESCE(p.name, '—'),
			COALESCE(s.status, 'none'), s.started_at, s.expires_at
		FROM merchants m
		LEFT JOIN LATERAL (
			SELECT id, plan_id, status, started_at, expires_at
			FROM merchant_subscriptions
			WHERE merchant_id = m.id
			ORDER BY created_at DESC
			LIMIT 1
		) s ON true
		LEFT JOIN plans p ON s.plan_id = p.id
		ORDER BY m.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var subs []AdminSubscription
	for rows.Next() {
		var s AdminSubscription
		rows.Scan(&s.ID, &s.MerchantID, &s.MerchantName, &s.MerchantEmail,
			&s.PlanID, &s.PlanName, &s.Status, &s.StartedAt, &s.ExpiresAt) //nolint:errcheck
		subs = append(subs, s)
	}
	return subs, total, nil
}

// ============================================================================
// MERCHANT PASSWORD RESET (admin-initiated)
// ============================================================================

func (r *Repository) AdminSetMerchantPassword(ctx context.Context, merchantID uuid.UUID, passwordHash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchants SET password_hash = $1, updated_at = $2 WHERE id = $3`,
		passwordHash, time.Now(), merchantID,
	)
	return err
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

type AdminAuditLog struct {
	ID         uuid.UUID  `json:"id"`
	MerchantID *uuid.UUID `json:"merchant_id"`
	Name       string     `json:"name"`
	Action     string     `json:"action"`
	Resource   string     `json:"resource"`
	IP         string     `json:"ip"`
	Details    string     `json:"details"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (r *Repository) GetAdminAuditLogs(ctx context.Context, page, limit int) ([]AdminAuditLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs`).Scan(&total)

	rows, err := r.db.Query(ctx, `
		SELECT a.id, a.merchant_id, COALESCE(m.name,'System'),
			a.action, a.resource, a.ip, a.details, a.created_at
		FROM audit_logs a
		LEFT JOIN merchants m ON a.merchant_id = m.id
		ORDER BY a.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []AdminAuditLog
	for rows.Next() {
		var l AdminAuditLog
		rows.Scan(&l.ID, &l.MerchantID, &l.Name, &l.Action, &l.Resource, &l.IP, &l.Details, &l.CreatedAt)
		logs = append(logs, l)
	}
	return logs, total, nil
}

// ============================================================================
// TOP MERCHANTS
// ============================================================================

type TopMerchant struct {
	MerchantID   uuid.UUID `json:"merchant_id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	TotalVolume  int64     `json:"total_volume"`
	TotalPayments int64    `json:"total_payments"`
	SuccessRate  float64   `json:"success_rate"`
}

func (r *Repository) GetTopMerchants(ctx context.Context, limit int) ([]TopMerchant, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			m.id, m.name, m.email,
			COALESCE(SUM(p.amount) FILTER (WHERE p.status='paid'), 0) AS vol,
			COUNT(p.id) AS total,
			CASE WHEN COUNT(p.id) > 0
				THEN ROUND(COUNT(p.id) FILTER (WHERE p.status='paid')::numeric / COUNT(p.id)::numeric * 100, 1)
				ELSE 0 END AS rate
		FROM merchants m
		LEFT JOIN payments p ON p.merchant_id = m.id
		WHERE m.is_admin = false
		GROUP BY m.id, m.name, m.email
		ORDER BY vol DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []TopMerchant
	for rows.Next() {
		var t TopMerchant
		rows.Scan(&t.MerchantID, &t.Name, &t.Email, &t.TotalVolume, &t.TotalPayments, &t.SuccessRate)
		result = append(result, t)
	}
	return result, nil
}

// ============================================================================
// ADMIN PAYMENTS (paginated + search)
// ============================================================================

type AdminPaymentRow struct {
	ID                uuid.UUID  `json:"id"`
	MerchantID        uuid.UUID  `json:"merchant_id"`
	MerchantName      string     `json:"merchant_name"`
	OrderID           string     `json:"order_id"`
	Amount            int64      `json:"amount"`
	Currency          string     `json:"currency"`
	Status            string     `json:"status"`
	CustomerReference string     `json:"customer_reference"`
	CustomerName      string     `json:"customer_name"`
	UTR               *string    `json:"utr"`
	PaidAt            *time.Time `json:"paid_at"`
	CreatedAt         time.Time  `json:"created_at"`
}

func (r *Repository) GetAdminPaymentsPaginated(ctx context.Context, page, limit int, status, search string) ([]AdminPaymentRow, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	where := ""
	argIdx := 1

	if status != "" {
		args = append(args, status)
		where += ` AND p.status = $` + itoa(argIdx)
		argIdx++
	}
	if search != "" {
		args = append(args, "%"+search+"%")
		where += ` AND (p.order_id ILIKE $` + itoa(argIdx) + ` OR m.name ILIKE $` + itoa(argIdx) + ` OR p.customer_reference ILIKE $` + itoa(argIdx) + `)`
		argIdx++
	}

	var total int64
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payments p LEFT JOIN merchants m ON p.merchant_id = m.id WHERE 1=1`+where, args...).Scan(&total)

	args = append(args, limit, offset)
	rows, err := r.db.Query(ctx, `
		SELECT
			p.id, p.merchant_id, COALESCE(m.name,''), p.order_id, p.amount,
			p.currency, p.status, p.customer_reference, COALESCE(p.customer_name,''),
			p.utr, p.paid_at, p.created_at
		FROM payments p
		LEFT JOIN merchants m ON p.merchant_id = m.id
		WHERE 1=1`+where+`
		ORDER BY p.created_at DESC
		LIMIT $`+itoa(argIdx)+` OFFSET $`+itoa(argIdx+1),
		args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var payments []AdminPaymentRow
	for rows.Next() {
		var p AdminPaymentRow
		rows.Scan(&p.ID, &p.MerchantID, &p.MerchantName, &p.OrderID, &p.Amount,
			&p.Currency, &p.Status, &p.CustomerReference, &p.CustomerName,
			&p.UTR, &p.PaidAt, &p.CreatedAt)
		payments = append(payments, p)
	}
	return payments, total, nil
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}

// ============================================================================
// MERCHANT DAILY LIMIT UPDATE
// ============================================================================

func (r *Repository) UpdateMerchantDailyLimit(ctx context.Context, merchantID uuid.UUID, limitPaise int64) error {
	_, err := r.db.Exec(ctx,
		`UPDATE merchants SET daily_limit = $1, updated_at = $2 WHERE id = $3`,
		limitPaise, time.Now(), merchantID,
	)
	return err
}

// GetAllFraudAlerts returns paginated fraud alerts with merchant name
type AdminFraudRow struct {
	models.FraudAlert
	MerchantName string `json:"merchant_name"`
	OrderID      string `json:"order_id"`
}

func (r *Repository) GetAdminFraudAlerts(ctx context.Context, page, limit int, resolved *bool, severity string) ([]AdminFraudRow, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	where := ""
	argIdx := 1

	if resolved != nil {
		args = append(args, *resolved)
		where += ` AND f.resolved = $` + itoa(argIdx)
		argIdx++
	}
	if severity != "" {
		args = append(args, severity)
		where += ` AND f.severity = $` + itoa(argIdx)
		argIdx++
	}

	var total int64
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM fraud_alerts f WHERE 1=1`+where, args...).Scan(&total)

	args = append(args, limit, offset)
	rows, err := r.db.Query(ctx, `
		SELECT f.id, f.payment_id, f.merchant_id, f.alert_type, f.details,
			f.severity, f.resolved, f.created_at,
			COALESCE(m.name,''), COALESCE(p.order_id,'')
		FROM fraud_alerts f
		LEFT JOIN merchants m ON f.merchant_id = m.id
		LEFT JOIN payments p ON f.payment_id = p.id
		WHERE 1=1`+where+`
		ORDER BY f.created_at DESC
		LIMIT $`+itoa(argIdx)+` OFFSET $`+itoa(argIdx+1),
		args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var alerts []AdminFraudRow
	for rows.Next() {
		var a AdminFraudRow
		rows.Scan(&a.ID, &a.PaymentID, &a.MerchantID, &a.AlertType, &a.Details,
			&a.Severity, &a.Resolved, &a.CreatedAt, &a.MerchantName, &a.OrderID)
		alerts = append(alerts, a)
	}
	return alerts, total, nil
}
