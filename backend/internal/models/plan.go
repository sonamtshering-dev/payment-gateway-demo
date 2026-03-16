package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Plan is the DB model for a pricing plan (managed by master admin).
type Plan struct {
	ID           uuid.UUID       `json:"id"            db:"id"`
	Name         string          `json:"name"          db:"name"`
	Price        int64           `json:"price"         db:"price"`         // paise; 0 = free
	BillingCycle string          `json:"billing_cycle" db:"billing_cycle"`
	Badge        *string         `json:"badge"         db:"badge"`
	IsFeatured   bool            `json:"is_featured"   db:"is_featured"`
	IsActive     bool            `json:"is_active"     db:"is_active"`
	CTALabel     string          `json:"cta_label"     db:"cta_label"`
	SortOrder    int             `json:"sort_order"    db:"sort_order"`
	QRLimit      int             `json:"qr_limit"      db:"qr_limit"`
	LinkLimit    int             `json:"link_limit"    db:"link_limit"`
	APILimit     int             `json:"api_limit"     db:"api_limit"`
	FeaturesRaw  json.RawMessage `json:"-"             db:"features"`
	Features     []string        `json:"features"      db:"-"`
	CreatedAt    time.Time       `json:"created_at"    db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"    db:"updated_at"`
}

// PlanPublic is the shape returned to unauthenticated visitors (landing page).
type PlanPublic struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Price        int64     `json:"price"`
	BillingCycle string    `json:"billing_cycle"`
	Badge        *string   `json:"badge,omitempty"`
	IsFeatured   bool      `json:"is_featured"`
	CTALabel     string    `json:"cta_label"`
	Features     []string  `json:"features"`
}

// CreatePlanRequest is used by admin to create a plan.
type CreatePlanRequest struct {
	Name         string   `json:"name"          binding:"required,min=2,max=80"`
	Price        int64    `json:"price"         binding:"min=0"`            // paise
	BillingCycle string   `json:"billing_cycle" binding:"required"`
	Badge        string   `json:"badge"`
	IsFeatured   bool     `json:"is_featured"`
	CTALabel     string   `json:"cta_label"     binding:"required"`
	SortOrder    int      `json:"sort_order"`
	QRLimit      int      `json:"qr_limit"`
	LinkLimit    int      `json:"link_limit"`
	APILimit     int      `json:"api_limit"`
	Features     []string `json:"features"      binding:"required"`
}

// UpdatePlanRequest allows partial update; all fields optional.
type UpdatePlanRequest struct {
	Name         *string  `json:"name"`
	Price        *int64   `json:"price"`
	BillingCycle *string  `json:"billing_cycle"`
	Badge        *string  `json:"badge"`
	IsFeatured   *bool    `json:"is_featured"`
	IsActive     *bool    `json:"is_active"`
	CTALabel     *string  `json:"cta_label"`
	SortOrder    *int     `json:"sort_order"`
	QRLimit      *int     `json:"qr_limit"`
	LinkLimit    *int     `json:"link_limit"`
	APILimit     *int     `json:"api_limit"`
	Features     []string `json:"features"`
}