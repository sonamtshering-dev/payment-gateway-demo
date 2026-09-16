package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// ─── merchant-facing ─────────────────────────────────────────────────────────

type createTicketReq struct {
	Subject string `json:"subject" binding:"required,max=200"`
	Message string `json:"message" binding:"required,max=2000"`
	Context string `json:"context"`
}

func (h *Handler) CreateTicket(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	var req createTicketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.service.CreateSupportTicket(c.Request.Context(), merchantID, req.Subject, req.Message, req.Context); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create ticket"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Ticket submitted successfully"})
}

func (h *Handler) ListMyTickets(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	tickets, err := h.service.ListMerchantTickets(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch tickets"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: tickets})
}

// ─── admin-facing ─────────────────────────────────────────────────────────────

type SupportTicket struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	MerchantID   uuid.UUID  `json:"merchant_id" db:"merchant_id"`
	MerchantName string     `json:"merchant_name" db:"merchant_name"`
	Subject      string     `json:"subject" db:"subject"`
	Message      string     `json:"message" db:"message"`
	Context      string     `json:"context" db:"context"`
	Status       string     `json:"status" db:"status"`
	AdminNote    string     `json:"admin_note" db:"admin_note"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

func (h *Handler) AdminListTickets(c *gin.Context) {
	status := c.Query("status") // "", "open", "in_progress", "resolved"
	tickets, err := h.service.ListSupportTickets(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch tickets"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: tickets})
}

type updateTicketReq struct {
	Status    string `json:"status"`
	AdminNote string `json:"admin_note"`
}

func (h *Handler) AdminUpdateTicket(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid ticket id"})
		return
	}

	var req updateTicketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.service.UpdateSupportTicket(c.Request.Context(), id, req.Status, req.AdminNote); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update ticket"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Ticket updated"})
}
