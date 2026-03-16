package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// ─── Public ────────────────────────────────────────────────────────────────
// GET /api/v1/public/plans
// No auth required — called by the landing page to render pricing.
func (h *Handler) GetPublicPlans(c *gin.Context) {
	plans, err := h.service.GetPublicPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: plans})
}

// ─── Admin ─────────────────────────────────────────────────────────────────
// GET /api/v1/admin/plans
func (h *Handler) AdminListPlans(c *gin.Context) {
	plans, err := h.service.AdminListPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: plans})
}

// POST /api/v1/admin/plans
func (h *Handler) AdminCreatePlan(c *gin.Context) {
	var req models.CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	plan, err := h.service.AdminCreatePlan(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: plan})
}

// PUT /api/v1/admin/plans/:id
func (h *Handler) AdminUpdatePlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid plan id"})
		return
	}

	var req models.UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	plan, err := h.service.AdminUpdatePlan(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: plan})
}

// DELETE /api/v1/admin/plans/:id
func (h *Handler) AdminDeletePlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid plan id"})
		return
	}

	if err := h.service.AdminDeletePlan(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "plan deleted"})
}