package utils

import (
	"encoding/hex"
	"fmt"
	"testing"
	"time"
)

func TestHashPassword(t *testing.T) {
	password := "SecureP@ss123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if !CheckPassword(password, hash) {
		t.Error("CheckPassword should return true for correct password")
	}

	if CheckPassword("wrong-password", hash) {
		t.Error("CheckPassword should return false for wrong password")
	}
}

func TestEncryptDecrypt(t *testing.T) {
	// Generate a 32-byte key (AES-256)
	key := hex.EncodeToString([]byte("0123456789abcdef0123456789abcdef"))

	tests := []struct {
		name      string
		plaintext string
	}{
		{"simple text", "hello@upi"},
		{"upi id", "merchant@paytm"},
		{"api secret", "sk_live_abc123def456ghi789"},
		{"empty string", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encrypted, err := Encrypt(tt.plaintext, key)
			if err != nil {
				t.Fatalf("Encrypt failed: %v", err)
			}

			decrypted, err := Decrypt(encrypted, key)
			if err != nil {
				t.Fatalf("Decrypt failed: %v", err)
			}

			if decrypted != tt.plaintext {
				t.Errorf("Expected %q, got %q", tt.plaintext, decrypted)
			}
		})
	}
}

func TestEncryptProducesDifferentCiphertext(t *testing.T) {
	key := hex.EncodeToString([]byte("0123456789abcdef0123456789abcdef"))
	plaintext := "same-text"

	enc1, _ := Encrypt(plaintext, key)
	enc2, _ := Encrypt(plaintext, key)

	if enc1 == enc2 {
		t.Error("Encrypt should produce different ciphertext each time (random nonce)")
	}
}

func TestHMAC(t *testing.T) {
	secret := "sk_test_secret"
	timestamp := "1700000000"
	body := `{"merchant_id":"abc","amount":10000}`

	sig := ComputeHMAC(secret, timestamp, body)
	if sig == "" {
		t.Error("ComputeHMAC should not return empty string")
	}

	// Verify should pass with same inputs
	if !VerifyHMAC(secret, timestamp, body, sig) {
		t.Error("VerifyHMAC should return true for valid signature")
	}

	// Should fail with different body
	if VerifyHMAC(secret, timestamp, `{"different":"body"}`, sig) {
		t.Error("VerifyHMAC should return false for different body")
	}

	// Should fail with different timestamp
	if VerifyHMAC(secret, "9999999999", body, sig) {
		t.Error("VerifyHMAC should return false for different timestamp")
	}

	// Should fail with different secret
	if VerifyHMAC("different_secret", timestamp, body, sig) {
		t.Error("VerifyHMAC should return false for different secret")
	}
}

func TestWebhookSignature(t *testing.T) {
	secret := "whsec_test123"
	payload := []byte(`{"payment_id":"123","status":"paid"}`)

	sig := ComputeWebhookSignature(secret, payload)
	if sig == "" {
		t.Error("ComputeWebhookSignature should not return empty")
	}

	// Same inputs should produce same output
	sig2 := ComputeWebhookSignature(secret, payload)
	if sig != sig2 {
		t.Error("Same inputs should produce same signature")
	}
}

func TestGenerateAPIKey(t *testing.T) {
	key, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey failed: %v", err)
	}

	if len(key) < 10 {
		t.Error("API key too short")
	}

	if key[:5] != "upay_" {
		t.Errorf("API key should start with 'upay_', got %s", key[:5])
	}

	// Generate another - should be different
	key2, _ := GenerateAPIKey()
	if key == key2 {
		t.Error("Two generated keys should not be equal")
	}
}

func TestGenerateAPISecret(t *testing.T) {
	secret, err := GenerateAPISecret()
	if err != nil {
		t.Fatalf("GenerateAPISecret failed: %v", err)
	}

	if secret[:3] != "sk_" {
		t.Errorf("API secret should start with 'sk_', got %s", secret[:3])
	}
}

func TestValidateTimestamp(t *testing.T) {
	tolerance := 5 * time.Minute

	// Current timestamp should be valid
	now := fmt.Sprintf("%d", time.Now().Unix())
	if !ValidateTimestamp(now, tolerance) {
		t.Error("Current timestamp should be valid")
	}

	// Timestamp 1 minute ago should be valid
	recent := fmt.Sprintf("%d", time.Now().Add(-1*time.Minute).Unix())
	if !ValidateTimestamp(recent, tolerance) {
		t.Error("1-minute-old timestamp should be valid")
	}

	// Timestamp 10 minutes ago should be invalid
	old := fmt.Sprintf("%d", time.Now().Add(-10*time.Minute).Unix())
	if ValidateTimestamp(old, tolerance) {
		t.Error("10-minute-old timestamp should be invalid")
	}

	// Invalid format
	if ValidateTimestamp("not-a-number", tolerance) {
		t.Error("Non-numeric timestamp should be invalid")
	}
}

func TestValidateUPIID(t *testing.T) {
	tests := []struct {
		upiID string
		valid bool
	}{
		{"merchant@paytm", true},
		{"user@upi", true},
		{"test.name@okaxis", true},
		{"invalid", false},
		{"@upi", false},
		{"user@", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.upiID, func(t *testing.T) {
			if ValidateUPIID(tt.upiID) != tt.valid {
				t.Errorf("ValidateUPIID(%q) = %v, want %v", tt.upiID, !tt.valid, tt.valid)
			}
		})
	}
}

func TestGenerateUPILink(t *testing.T) {
	link := GenerateUPILink("shop@paytm", "TestShop", 10050, "ORDER-001")
	expected := "upi://pay?pa=shop@paytm&pn=TestShop&am=100.50&cu=INR&tn=ORDER-001"
	if link != expected {
		t.Errorf("Expected %q, got %q", expected, link)
	}
}

func TestHashToken(t *testing.T) {
	token := "some-refresh-token-value"
	hash := HashToken(token)

	if hash == "" {
		t.Error("HashToken should not return empty")
	}

	// Same input should produce same hash
	hash2 := HashToken(token)
	if hash != hash2 {
		t.Error("Same token should produce same hash")
	}

	// Different input should produce different hash
	hash3 := HashToken("different-token")
	if hash == hash3 {
		t.Error("Different tokens should produce different hashes")
	}
}
