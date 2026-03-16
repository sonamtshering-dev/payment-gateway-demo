package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// ─── Public (unauthenticated) ───────────────────────────────────────────────

// GetPublicPlans returns active plans for the landing page.
func (s *Service) GetPublicPlans(ctx context.Context) ([]models.PlanPublic, error) {
	plans, err := s.repo.GetActivePlans(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]models.PlanPublic, 0, len(plans))
	for _, p := range plans {
		pub := models.PlanPublic{
			ID:           p.ID,
			Name:         p.Name,
			Price:        p.Price,
			BillingCycle: p.BillingCycle,
			Badge:        p.Badge,
			IsFeatured:   p.IsFeatured,
			CTALabel:     p.CTALabel,
			Features:     p.Features,
		}
		out = append(out, pub)
	}
	return out, nil
}

// ─── Admin ───────────────────────────────────────────────────────────────────

// AdminListPlans returns all plans (for admin panel).
func (s *Service) AdminListPlans(ctx context.Context) ([]models.Plan, error) {
	return s.repo.ListAllPlans(ctx)
}

// AdminCreatePlan creates a new plan.
func (s *Service) AdminCreatePlan(ctx context.Context, req models.CreatePlanRequest) (*models.Plan, error) {
	if len(req.Features) == 0 {
		return nil, fmt.Errorf("at least one feature is required")
	}
	return s.repo.CreatePlan(ctx, req)
}

// AdminUpdatePlan partially updates a plan.
func (s *Service) AdminUpdatePlan(ctx context.Context, id uuid.UUID, req models.UpdatePlanRequest) (*models.Plan, error) {
	return s.repo.UpdatePlan(ctx, id, req)
}

// AdminDeletePlan removes a plan permanently.
func (s *Service) AdminDeletePlan(ctx context.Context, id uuid.UUID) error {
	plan, err := s.repo.GetPlanByID(ctx, id)
	if err != nil || plan == nil {
		return fmt.Errorf("plan not found")
	}
	return s.repo.DeletePlan(ctx, id)
}