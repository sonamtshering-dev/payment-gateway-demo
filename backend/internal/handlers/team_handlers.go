package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// TEAM MANAGEMENT (JWT, owner only — enforced by RequireRole middleware)
// ============================================================================

func (h *Handler) ListTeamMembers(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	members, err := h.service.ListTeamMembers(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to load team"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: members})
}

func (h *Handler) InviteTeamMember(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req models.InviteTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "enter a valid email and role"})
		return
	}
	tgLink, err := h.service.InviteTeamMember(c.Request.Context(), merchantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Invitation sent", Data: map[string]string{"tg_link": tgLink}})
}

func (h *Handler) TelegramLoginAuth(c *gin.Context) {
	var data models.TelegramAuthData
	if err := c.ShouldBindJSON(&data); err != nil || data.ID == 0 || data.Hash == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid Telegram auth data"})
		return
	}
	resp, err := h.service.TelegramLoginAuth(c.Request.Context(), data)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: resp})
}

func (h *Handler) UpdateTeamMember(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	memberID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid member id"})
		return
	}
	var req models.UpdateTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}
	if err := h.service.UpdateTeamMember(c.Request.Context(), merchantID, memberID, req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Member updated"})
}

func (h *Handler) RemoveTeamMember(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	memberID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid member id"})
		return
	}
	if err := h.service.RemoveTeamMember(c.Request.Context(), merchantID, memberID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to remove member"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Member removed"})
}

// ============================================================================
// PUBLIC: ACCEPT INVITE + OTP LOGIN
// ============================================================================

func (h *Handler) AcceptTeamInvite(c *gin.Context) {
	var req models.AcceptInviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "name (2+ chars) and password (8+ chars) are required"})
		return
	}
	if err := h.service.AcceptTeamInvite(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Account activated — you can log in now"})
}

func (h *Handler) RequestLoginOTP(c *gin.Context) {
	var req models.RequestOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "enter a valid email"})
		return
	}
	channel, err := h.service.RequestLoginOTP(c.Request.Context(), req.Email, c.ClientIP())
	if err != nil {
		c.JSON(http.StatusTooManyRequests, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: map[string]string{"channel": channel}})
}

func (h *Handler) VerifyLoginOTP(c *gin.Context) {
	var req models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "email and 6-digit code required"})
		return
	}
	resp, err := h.service.VerifyLoginOTP(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: resp})
}
