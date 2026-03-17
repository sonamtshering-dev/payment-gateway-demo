package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func hydratePlan(p *models.Plan) {
	if p.FeaturesRaw != nil {
		_ = json.Unmarshal(p.FeaturesRaw, &p.Features)
	}
	if p.Features == nil {
		p.Features = []string{}
	}
}

func scanPlan(rows interface{ Scan(...any) error }, p *models.Plan) error {
	return rows.Scan(
		&p.ID, &p.Name, &p.Price, &p.BillingCycle, &p.Badge,
		&p.IsFeatured, &p.IsActive, &p.CTALabel, &p.SortOrder,
		&p.QRLimit, &p.LinkLimit, &p.APILimit, &p.FeaturesRaw,
		&p.Discount6Month, &p.Discount1Year, &p.CreatedAt, &p.UpdatedAt,
	)
}

const planSelect = `SELECT id, name, price, billing_cycle, badge, is_featured, is_active,
	cta_label, sort_order, qr_limit, link_limit, api_limit, features,
	COALESCE(discount_6month,15), COALESCE(discount_1year,25), created_at, updated_at FROM plans`

func (r *Repository) GetActivePlans(ctx context.Context) ([]models.Plan, error) {
	rows, err := r.db.Query(ctx, planSelect+` WHERE is_active = TRUE ORDER BY sort_order ASC, created_at ASC`)
	if err != nil {
		return nil, fmt.Errorf("GetActivePlans: %w", err)
	}
	defer rows.Close()
	var plans []models.Plan
	for rows.Next() {
		var p models.Plan
		if err := scanPlan(rows, &p); err != nil {
			return nil, fmt.Errorf("GetActivePlans scan: %w", err)
		}
		hydratePlan(&p)
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *Repository) ListAllPlans(ctx context.Context) ([]models.Plan, error) {
	rows, err := r.db.Query(ctx, planSelect+` ORDER BY sort_order ASC, created_at ASC`)
	if err != nil {
		return nil, fmt.Errorf("ListAllPlans: %w", err)
	}
	defer rows.Close()
	var plans []models.Plan
	for rows.Next() {
		var p models.Plan
		if err := scanPlan(rows, &p); err != nil {
			return nil, fmt.Errorf("ListAllPlans scan: %w", err)
		}
		hydratePlan(&p)
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *Repository) GetPlanByID(ctx context.Context, id uuid.UUID) (*models.Plan, error) {
	var p models.Plan
	row := r.db.QueryRow(ctx, planSelect+` WHERE id = $1`, id)
	if err := scanPlan(row, &p); err != nil {
		return nil, nil
	}
	hydratePlan(&p)
	return &p, nil
}

func (r *Repository) CreatePlan(ctx context.Context, req models.CreatePlanRequest) (*models.Plan, error) {
	featBytes, err := json.Marshal(req.Features)
	if err != nil {
		return nil, fmt.Errorf("marshal features: %w", err)
	}
	var badge *string
	if req.Badge != "" {
		badge = &req.Badge
	}
	d6 := req.Discount6Month
	if d6 == 0 { d6 = 15 }
	d1 := req.Discount1Year
	if d1 == 0 { d1 = 25 }
	id := utils.NewID()
	now := time.Now()
	_, err = r.db.Exec(ctx, `
		INSERT INTO plans (id, name, price, billing_cycle, badge, is_featured, is_active,
		  cta_label, sort_order, qr_limit, link_limit, api_limit, features,
		  discount_6month, discount_1year, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
	`, id, req.Name, req.Price, req.BillingCycle, badge, req.IsFeatured,
		req.CTALabel, req.SortOrder, req.QRLimit, req.LinkLimit, req.APILimit,
		string(featBytes), d6, d1, now,
	)
	if err != nil {
		return nil, fmt.Errorf("CreatePlan: %w", err)
	}
	return r.GetPlanByID(ctx, id)
}

func (r *Repository) UpdatePlan(ctx context.Context, id uuid.UUID, req models.UpdatePlanRequest) (*models.Plan, error) {
	existing, err := r.GetPlanByID(ctx, id)
	if err != nil || existing == nil {
		return nil, fmt.Errorf("plan not found")
	}
	if req.Name != nil          { existing.Name = *req.Name }
	if req.Price != nil         { existing.Price = *req.Price }
	if req.BillingCycle != nil  { existing.BillingCycle = *req.BillingCycle }
	if req.Badge != nil         { existing.Badge = req.Badge }
	if req.IsFeatured != nil    { existing.IsFeatured = *req.IsFeatured }
	if req.IsActive != nil      { existing.IsActive = *req.IsActive }
	if req.CTALabel != nil      { existing.CTALabel = *req.CTALabel }
	if req.SortOrder != nil     { existing.SortOrder = *req.SortOrder }
	if req.QRLimit != nil       { existing.QRLimit = *req.QRLimit }
	if req.LinkLimit != nil     { existing.LinkLimit = *req.LinkLimit }
	if req.APILimit != nil      { existing.APILimit = *req.APILimit }
	if req.Features != nil      { existing.Features = req.Features }
	if req.Discount6Month != nil { existing.Discount6Month = *req.Discount6Month }
	if req.Discount1Year != nil  { existing.Discount1Year = *req.Discount1Year }

	featBytes, _ := json.Marshal(existing.Features)
	_, err = r.db.Exec(ctx, `
		UPDATE plans SET
		  name=$2, price=$3, billing_cycle=$4, badge=$5, is_featured=$6,
		  is_active=$7, cta_label=$8, sort_order=$9, qr_limit=$10,
		  link_limit=$11, api_limit=$12, features=$13,
		  discount_6month=$14, discount_1year=$15, updated_at=NOW()
		WHERE id=$1
	`, id, existing.Name, existing.Price, existing.BillingCycle, existing.Badge,
		existing.IsFeatured, existing.IsActive, existing.CTALabel, existing.SortOrder,
		existing.QRLimit, existing.LinkLimit, existing.APILimit, string(featBytes),
		existing.Discount6Month, existing.Discount1Year,
	)
	if err != nil {
		return nil, fmt.Errorf("UpdatePlan: %w", err)
	}
	return r.GetPlanByID(ctx, id)
}

func (r *Repository) DeletePlan(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM plans WHERE id=$1`, id)
	return err
}
