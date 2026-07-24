package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

// TelegramLoginAuth verifies a Telegram Login Widget callback and returns auth
// tokens for the merchant whose connected bot chat_id matches the telegram user ID.
//
// The merchant must have connected the NovaPay bot first (via dashboard).
// We look them up via the Redis secondary index: "telegram:chat:<id>" → merchantID.
func (s *Service) TelegramLoginAuth(ctx context.Context, data models.TelegramAuthData) (*models.AuthResponse, error) {
	// 1. Verify hash.
	if !s.verifyTelegramWidgetHash(data) {
		return nil, fmt.Errorf("invalid Telegram authentication data")
	}
	// 2. Reject stale data (> 24 h).
	if time.Now().Unix()-data.AuthDate > 86400 {
		return nil, fmt.Errorf("authentication data has expired, please try again")
	}

	// 3. Look up merchant via existing Redis secondary index (set during bot connect).
	chatID := strconv.FormatInt(data.ID, 10)
	merchantIDStr, err := s.redis.Get(ctx, "telegram:chat:"+chatID).Result()
	if err != nil {
		return nil, fmt.Errorf("no NovaPay account linked to this Telegram — open your dashboard, go to Telegram Alerts and connect the bot first")
	}

	// 4. Load merchant and issue tokens.
	mid, err := uuid.Parse(merchantIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid merchant reference")
	}
	merchant, err := s.repo.GetMerchantByID(ctx, mid)
	if err != nil || merchant == nil || !merchant.IsActive {
		return nil, fmt.Errorf("merchant account not found or inactive")
	}
	return s.generateAuthResponse(ctx, merchant, "")
}

// verifyTelegramWidgetHash validates the HMAC-SHA256 hash sent by the Telegram
// Login Widget. See https://core.telegram.org/widgets/login#checking-authorization
func (s *Service) verifyTelegramWidgetHash(data models.TelegramAuthData) bool {
	botToken := s.config.Telegram.BotToken
	if botToken == "" {
		return false
	}
	// Build the data-check string: key=value pairs sorted alphabetically, joined by \n.
	fields := map[string]string{
		"id":         strconv.FormatInt(data.ID, 10),
		"first_name": data.FirstName,
		"auth_date":  strconv.FormatInt(data.AuthDate, 10),
	}
	if data.LastName != "" {
		fields["last_name"] = data.LastName
	}
	if data.Username != "" {
		fields["username"] = data.Username
	}
	if data.PhotoURL != "" {
		fields["photo_url"] = data.PhotoURL
	}
	keys := make([]string, 0, len(fields))
	for k := range fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, k+"="+fields[k])
	}
	dataCheckString := strings.Join(parts, "\n")

	// secret = SHA256(bot_token) — NOT HMAC, plain hash
	secretBytes := sha256.Sum256([]byte(botToken))
	mac := hmac.New(sha256.New, secretBytes[:])
	mac.Write([]byte(dataCheckString))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(data.Hash))
}
