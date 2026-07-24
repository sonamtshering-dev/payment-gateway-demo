package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/logger"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func appURL() string {
	u := os.Getenv("APP_URL")
	if u == "" || !strings.HasPrefix(u, "https://") {
		return "https://nova-pay.in"
	}
	return strings.TrimRight(u, "/")
}

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

func (s *Service) ListTeamMembers(ctx context.Context, merchantID uuid.UUID) ([]models.TeamMember, error) {
	members, err := s.repo.ListTeamMembers(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	if members == nil {
		members = []models.TeamMember{}
	}
	return members, nil
}

// botDeepLink returns a Telegram bot deep link embedding the invite token.
// The recipient taps it → the bot receives /start inv_TOKEN → sends the accept URL.
func botDeepLink(botName, token string) string {
	if botName == "" {
		return ""
	}
	return "https://t.me/" + botName + "?start=inv_" + token
}

func (s *Service) InviteTeamMember(ctx context.Context, merchantID uuid.UUID, req models.InviteTeamMemberRequest) (tgLink string, err error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	// The owner's own email can't be a team member anywhere.
	if m, _ := s.repo.GetMerchantByEmail(ctx, email); m != nil {
		return "", fmt.Errorf("this email already has a merchant account")
	}
	if existing, _ := s.repo.GetTeamMemberByEmail(ctx, email); existing != nil {
		if existing.MerchantID != merchantID {
			return "", fmt.Errorf("this email is already on another team")
		}
		if existing.Status != "invited" {
			return "", fmt.Errorf("this email is already on your team")
		}
		// Re-invite: refresh token and resend.
		token, hash, err := newInviteToken()
		if err != nil {
			return "", err
		}
		if err := s.repo.RefreshTeamInvite(ctx, existing.ID, hash, time.Now().Add(72*time.Hour)); err != nil {
			return "", err
		}
		link := botDeepLink(s.config.Telegram.BotName, token)
		s.sendInviteEmail(ctx, merchantID, email, req.Role, token)
		return link, nil
	}

	token, hash, err := newInviteToken()
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(72 * time.Hour)
	member := &models.TeamMember{
		ID: utils.NewID(), MerchantID: merchantID, Email: email, Role: req.Role,
		Status: "invited", InviteTokenHash: &hash, InviteExpiresAt: &expires,
	}
	if err := s.repo.CreateTeamMember(ctx, member); err != nil {
		return "", fmt.Errorf("could not create invite")
	}
	link := botDeepLink(s.config.Telegram.BotName, token)
	s.sendInviteEmail(ctx, merchantID, email, req.Role, token)
	return link, nil
}

func (s *Service) sendInviteEmail(ctx context.Context, merchantID uuid.UUID, email, role, token string) {
	merchant, _ := s.repo.GetMerchantByID(ctx, merchantID)
	businessName := "a NovaPay merchant"
	if merchant != nil {
		if merchant.BusinessName != nil && *merchant.BusinessName != "" {
			businessName = *merchant.BusinessName
		} else {
			businessName = merchant.Name
		}
	}
	link := appURL() + "/auth/accept-invite?token=" + token
	go func() {
		if err := s.email.SendTeamInvite(email, businessName, role, link); err != nil {
			logger.Error().Err(err).Str("email", email).Msg("Failed to send team invite email")
		}
	}()
}

func (s *Service) UpdateTeamMember(ctx context.Context, merchantID, memberID uuid.UUID, req models.UpdateTeamMemberRequest) error {
	member, err := s.repo.GetTeamMemberByID(ctx, merchantID, memberID)
	if err != nil || member == nil {
		return fmt.Errorf("team member not found")
	}
	return s.repo.UpdateTeamMemberRoleStatus(ctx, merchantID, memberID, req.Role, req.Status)
}

func (s *Service) RemoveTeamMember(ctx context.Context, merchantID, memberID uuid.UUID) error {
	return s.repo.DeleteTeamMember(ctx, merchantID, memberID)
}

// ResolveInviteToken looks up an invite token and returns the accept URL if valid.
// Returns empty string when the token is invalid or expired.
func (s *Service) ResolveInviteToken(ctx context.Context, token string) string {
	hash := sha256Hex(token)
	member, err := s.repo.GetTeamMemberByInviteToken(ctx, hash)
	if err != nil || member == nil {
		return ""
	}
	return appURL() + "/auth/accept-invite?token=" + token
}

// AcceptTeamInvite finishes onboarding: sets name + password and activates.
func (s *Service) AcceptTeamInvite(ctx context.Context, req models.AcceptInviteRequest) error {
	hash := sha256Hex(req.Token)
	member, err := s.repo.GetTeamMemberByInviteToken(ctx, hash)
	if err != nil || member == nil {
		return fmt.Errorf("this invite link is invalid or has expired — ask for a new invite")
	}
	pwHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return fmt.Errorf("could not set password")
	}
	return s.repo.ActivateTeamMember(ctx, member.ID, strings.TrimSpace(req.Name), pwHash)
}

// teamMemberLogin authenticates a team member and issues owner-scoped tokens
// carrying the member's role. Shares the caller's brute-force counters.
func (s *Service) teamMemberLogin(ctx context.Context, req models.LoginRequest, lockKey, attemptsKey string) (*models.AuthResponse, error) {
	member, err := s.repo.GetTeamMemberByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("service unavailable")
	}
	if member == nil || member.Status != "active" || member.PasswordHash == "" {
		return nil, fmt.Errorf("invalid credentials")
	}
	if !utils.CheckPassword(req.Password, member.PasswordHash) {
		attempts, _ := s.redis.Incr(ctx, attemptsKey).Result()
		s.redis.Expire(ctx, attemptsKey, 15*time.Minute)
		if attempts >= 5 {
			s.redis.Set(ctx, lockKey, "1", 15*time.Minute)
			s.redis.Del(ctx, attemptsKey)
			return nil, fmt.Errorf("account temporarily locked due to too many failed attempts. Try again in 15 minutes")
		}
		return nil, fmt.Errorf("invalid credentials")
	}
	s.redis.Del(ctx, attemptsKey, lockKey)

	merchant, err := s.repo.GetMerchantByID(ctx, member.MerchantID)
	if err != nil || merchant == nil || !merchant.IsActive {
		return nil, fmt.Errorf("this team's merchant account is not active")
	}
	return s.generateAuthResponseWithRole(ctx, merchant, "", member.Role, member.Email)
}

// ============================================================================
// OTP LOGIN (Telegram when connected, email fallback)
// ============================================================================

// RequestLoginOTP generates a 6-digit code and delivers it via the merchant's
// connected Telegram (preferred) or email. Returns the delivery channel.
// Always responds identically for unknown emails to avoid account enumeration.
func (s *Service) RequestLoginOTP(ctx context.Context, email, clientIP string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	// Rate limits: 3/5min per email, 10/hour per IP.
	emailKey := "otp:req:email:" + email
	ipKey := "otp:req:ip:" + clientIP
	if n, _ := s.redis.Incr(ctx, emailKey).Result(); n == 1 {
		s.redis.Expire(ctx, emailKey, 5*time.Minute)
	} else if n > 3 {
		return "", fmt.Errorf("too many codes requested — wait a few minutes")
	}
	if n, _ := s.redis.Incr(ctx, ipKey).Result(); n == 1 {
		s.redis.Expire(ctx, ipKey, time.Hour)
	} else if n > 10 {
		return "", fmt.Errorf("too many attempts, try again later")
	}

	merchant, err := s.repo.GetMerchantByEmail(ctx, email)
	if err != nil {
		return "", fmt.Errorf("service unavailable")
	}
	if merchant == nil || !merchant.IsActive {
		// Pretend success — do not reveal whether the account exists.
		return "email", nil
	}

	code, err := sixDigitCode()
	if err != nil {
		return "", fmt.Errorf("could not generate code")
	}
	s.redis.Set(ctx, "otp:login:"+email, utils.HashToken(code), 5*time.Minute)
	s.redis.Del(ctx, "otp:verify:attempts:"+email)

	// Prefer Telegram when connected and enabled.
	if settings, _ := s.repo.GetTelegramSettings(ctx, merchant.ID); settings != nil && settings.IsEnabled {
		if chatID, derr := utils.Decrypt(settings.ChatIDEncrypted, s.config.Security.EncryptionKey); derr == nil {
			text := fmt.Sprintf("<b>NovaPay Login Code</b>\n\nYour one-time login code is:\n\n<code>%s</code>\n\nValid for 5 minutes. If you didn't request this, ignore this message and consider rotating your password.", code)
			if terr := s.telegram.Send(ctx, chatID, text); terr == nil {
				return "telegram", nil
			}
			logger.Warn().Str("merchant_id", merchant.ID.String()).Msg("Telegram OTP delivery failed, falling back to email")
		}
	}

	go func() {
		if eerr := s.email.SendLoginOTP(email, merchant.Name, code); eerr != nil {
			logger.Error().Err(eerr).Str("email", email).Msg("Failed to send OTP email")
		}
	}()
	return "email", nil
}

// VerifyLoginOTP checks the code and, on success, issues normal auth tokens.
func (s *Service) VerifyLoginOTP(ctx context.Context, email, code string) (*models.AuthResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	attemptsKey := "otp:verify:attempts:" + email
	if n, _ := s.redis.Incr(ctx, attemptsKey).Result(); n == 1 {
		s.redis.Expire(ctx, attemptsKey, 10*time.Minute)
	} else if n > 5 {
		s.redis.Del(ctx, "otp:login:"+email)
		return nil, fmt.Errorf("too many wrong codes — request a new one")
	}

	stored, err := s.redis.Get(ctx, "otp:login:"+email).Result()
	if err != nil || stored == "" {
		return nil, fmt.Errorf("code expired or not requested — request a new code")
	}
	if utils.HashToken(strings.TrimSpace(code)) != stored {
		return nil, fmt.Errorf("incorrect code")
	}

	// Single use.
	s.redis.Del(ctx, "otp:login:"+email, attemptsKey)

	merchant, err := s.repo.GetMerchantByEmail(ctx, email)
	if err != nil || merchant == nil || !merchant.IsActive {
		return nil, fmt.Errorf("invalid credentials")
	}
	return s.generateAuthResponse(ctx, merchant, "")
}

// ============================================================================
// HELPERS
// ============================================================================

func newInviteToken() (token, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	token = hex.EncodeToString(b)
	return token, sha256Hex(token), nil
}

func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func sixDigitCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
