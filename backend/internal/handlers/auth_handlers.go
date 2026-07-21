package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/upay/gateway/internal/models"
)

func (h *Handler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Valid email required"})
		return
	}

	// Always return success to prevent email enumeration
	merchant, err := h.service.GetMerchantByEmail(c.Request.Context(), req.Email)
	if err != nil || merchant == nil {
		// Return success even if email not found
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "If that email is registered, a reset link has been sent."})
		return
	}

	// Generate secure token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to generate reset token"})
		return
	}
	token := hex.EncodeToString(b)
	expiry := time.Now().Add(30 * time.Minute)

	if err := h.service.SavePasswordResetToken(c.Request.Context(), merchant.ID.String(), token, expiry); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to save reset token"})
		return
	}

	baseURL := os.Getenv("APP_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	resetURL := fmt.Sprintf("%s/auth/reset-password?token=%s", baseURL, token)

	html := fmt.Sprintf(`<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F1F5F9;padding:40px 20px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1D4ED8,#2563EB);padding:28px 32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">NovaPay</h1>
    <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px">Payment Gateway</p>
  </div>
  <div style="padding:32px">
    <h2 style="font-size:20px;font-weight:700;color:#0F172A;margin:0 0 8px">Reset Your Password</h2>
    <p style="font-size:14px;color:#64748B;line-height:1.6;margin:0 0 24px">We received a request to reset the password for your NovaPay account. Click the button below to set a new password.</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700">Reset Password →</a>
    </div>
    <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px;font-size:12px;color:#64748B;line-height:1.6">
      This link expires in <strong>30 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
    </div>
  </div>
  <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#94A3B8">
    © 2026 NovaPay Technologies Pvt. Ltd. · Secure · Encrypted · Trusted
  </div>
</div></body></html>`, resetURL)

	go h.email.Send(req.Email, "Reset Your NovaPay Password", html)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "If that email is registered, a reset link has been sent."})
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Token and password (min 8 chars) required"})
		return
	}

	merchantID, err := h.service.ValidatePasswordResetToken(c.Request.Context(), req.Token)
	if err != nil || merchantID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid or expired reset link. Please request a new one."})
		return
	}

	if err := h.service.ResetPassword(c.Request.Context(), merchantID, req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Password updated successfully. You can now sign in."})
}
