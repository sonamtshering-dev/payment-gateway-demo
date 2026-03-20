package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
	mrand "math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// ============================================================================
// PASSWORD HASHING
// ============================================================================

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// ============================================================================
// AES-256-GCM ENCRYPTION (for secrets at rest)
// ============================================================================

func Encrypt(plaintext string, keyHex string) (string, error) {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return "", fmt.Errorf("invalid encryption key: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func Decrypt(encoded string, keyHex string) (string, error) {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return "", fmt.Errorf("invalid encryption key: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// ============================================================================
// HMAC SIGNATURES
// ============================================================================

// ComputeHMAC generates HMAC-SHA256 signature
// Formula: HMAC_SHA256(secret + timestamp + body)
func ComputeHMAC(secret, timestamp, body string) string {
	message := secret + timestamp + body
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyHMAC validates the HMAC signature
func VerifyHMAC(secret, timestamp, body, signature string) bool {
	expected := ComputeHMAC(secret, timestamp, body)
	return hmac.Equal([]byte(expected), []byte(signature))
}

// ComputeWebhookSignature generates webhook HMAC-SHA256 signature
func ComputeWebhookSignature(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// ============================================================================
// KEY GENERATION
// ============================================================================

func GenerateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "upay_" + hex.EncodeToString(bytes), nil
}

func GenerateAPISecret() (string, error) {
	bytes := make([]byte, 48)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "sk_" + hex.EncodeToString(bytes), nil
}

func GenerateWebhookSecret() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "whsec_" + hex.EncodeToString(bytes), nil
}

func GenerateRefreshToken() (string, error) {
	bytes := make([]byte, 64)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// ============================================================================
// TIMESTAMP VALIDATION
// ============================================================================

func ValidateTimestamp(ts string, tolerance time.Duration) bool {
	// Parse as Unix timestamp (seconds)
	var tsTime time.Time
	var unixTs int64
	_, err := fmt.Sscanf(ts, "%d", &unixTs)
	if err != nil {
		return false
	}
	tsTime = time.Unix(unixTs, 0)

	diff := time.Since(tsTime)
	if diff < 0 {
		diff = -diff
	}
	return diff <= tolerance
}

// ============================================================================
// UPI VALIDATION
// ============================================================================

func ValidateUPIID(upiID string) bool {
	// Basic format: name@provider
	parts := strings.Split(upiID, "@")
	if len(parts) != 2 {
		return false
	}
	if len(parts[0]) < 1 || len(parts[1]) < 2 {
		return false
	}
	return true
}

// GenerateUPILink creates a UPI intent URI
func GenerateUPILink(upiID, merchantName string, amount int64, orderID string) string {
	amountStr := fmt.Sprintf("%.2f", float64(amount)/100.0)
	return fmt.Sprintf(
		"upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s",
		upiID, merchantName, amountStr, orderID,
	)
}
// GenPaytmTxnRef generates a Paytm-compatible transaction reference
func GenPaytmTxnRef(orderID string) string {
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	prefix := make([]byte, 8)
	for i := range prefix {
		prefix[i] = chars[mrand.Intn(len(chars))]
	}
	return fmt.Sprintf("%s%d", string(prefix), time.Now().Unix())
}

// GenerateUPILinkWithRef generates UPI link with explicit transaction reference (tr param)
// Paytm uses tr to match the payment in their system
func GenerateUPILinkWithRef(upiID, merchantName string, amount int64, orderID, txnRef string) string {
	amountStr := fmt.Sprintf("%.2f", float64(amount)/100.0)
	return fmt.Sprintf(
		"upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s&tr=%s",
		upiID, merchantName, amountStr, orderID, txnRef,
	)
}

