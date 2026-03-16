package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (r *Repository) GetMerchantProviders(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantProvider, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, provider, merchant_name, merchant_mid,
		       upi_id, is_active, is_default, created_at, updated_at
		FROM merchant_providers
		WHERE merchant_id = $1
		ORDER BY is_default DESC, created_at ASC
	`, merchantID)
	if err != nil {
		return nil, fmt.Errorf("GetMerchantProviders: %w", err)
	}
	defer rows.Close()
	var providers []models.MerchantProvider
	for rows.Next() {
		var p models.MerchantProvider
		if err := rows.Scan(&p.ID, &p.MerchantID, &p.Provider, &p.MerchantName,
			&p.MerchantMID, &p.UPIID, &p.IsActive, &p.IsDefault,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, nil
}

func (r *Repository) CreateMerchantProvider(ctx context.Context, p *models.MerchantProvider) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO merchant_providers
		  (id, merchant_id, provider, merchant_name, merchant_mid, upi_id, is_active, is_default, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
	`, p.ID, p.MerchantID, p.Provider, p.MerchantName, p.MerchantMID,
		p.UPIID, p.IsActive, p.IsDefault, time.Now())
	return err
}

func (r *Repository) GetProviderByID(ctx context.Context, id, merchantID uuid.UUID) (*models.MerchantProvider, error) {
	var p models.MerchantProvider
	err := r.db.QueryRow(ctx, `
		SELECT id, merchant_id, provider, merchant_name, merchant_mid,
		       upi_id, is_active, is_default, created_at, updated_at
		FROM merchant_providers
		WHERE id = $1 AND merchant_id = $2
	`, id, merchantID).Scan(&p.ID, &p.MerchantID, &p.Provider, &p.MerchantName,
		&p.MerchantMID, &p.UPIID, &p.IsActive, &p.IsDefault,
		&p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, nil
	}
	return &p, nil
}

func (r *Repository) UpdateMerchantProvider(ctx context.Context, id, merchantID uuid.UUID, req models.UpdateProviderRequest) error {
	p, err := r.GetProviderByID(ctx, id, merchantID)
	if err != nil || p == nil {
		return fmt.Errorf("provider not found")
	}
	if req.MerchantName != nil { p.MerchantName = *req.MerchantName }
	if req.MerchantMID  != nil { p.MerchantMID  = *req.MerchantMID  }
	if req.UPIID        != nil { p.UPIID        = *req.UPIID        }
	if req.IsActive     != nil { p.IsActive     = *req.IsActive     }
	if req.IsDefault    != nil { p.IsDefault    = *req.IsDefault    }
	_, err = r.db.Exec(ctx, `
		UPDATE merchant_providers
		SET merchant_name=$3, merchant_mid=$4, upi_id=$5,
		    is_active=$6, is_default=$7, updated_at=NOW()
		WHERE id=$1 AND merchant_id=$2
	`, id, merchantID, p.MerchantName, p.MerchantMID, p.UPIID, p.IsActive, p.IsDefault)
	return err
}

func (r *Repository) DeleteMerchantProvider(ctx context.Context, id, merchantID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM merchant_providers WHERE id=$1 AND merchant_id=$2`, id, merchantID)
	return err
}
