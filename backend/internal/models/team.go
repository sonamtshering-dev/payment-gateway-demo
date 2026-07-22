package models

import (
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// TEAM MEMBERS
// ============================================================================

type TeamMember struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	MerchantID      uuid.UUID  `json:"merchant_id" db:"merchant_id"`
	Email           string     `json:"email" db:"email"`
	Name            string     `json:"name" db:"name"`
	Role            string     `json:"role" db:"role"` // admin | viewer
	PasswordHash    string     `json:"-" db:"password_hash"`
	Status          string     `json:"status" db:"status"` // invited | active | disabled
	InviteTokenHash *string    `json:"-" db:"invite_token_hash"`
	InviteExpiresAt *time.Time `json:"-" db:"invite_expires_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

type InviteTeamMemberRequest struct {
	Email string `json:"email" binding:"required,email,max=255"`
	Role  string `json:"role" binding:"required,oneof=admin viewer"`
}

type UpdateTeamMemberRequest struct {
	Role   string `json:"role" binding:"omitempty,oneof=admin viewer"`
	Status string `json:"status" binding:"omitempty,oneof=active disabled"`
}

type AcceptInviteRequest struct {
	Token    string `json:"token" binding:"required,min=32,max=128"`
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Password string `json:"password" binding:"required,min=8,max=128"`
}

// ============================================================================
// OTP LOGIN
// ============================================================================

type RequestOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}
