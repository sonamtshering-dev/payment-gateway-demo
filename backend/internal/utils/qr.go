package utils

import (
	"encoding/base64"
	"fmt"
	"os"

	qrcode "github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

// QRConfig holds optional QR customization per payment
type QRConfig struct {
	FgColor string // hex e.g. "#0f172a"
	BgColor string // hex e.g. "#ffffff"
	LogoURL string // optional merchant logo path
}

// DefaultQRConfig returns NovaPay branded defaults
func DefaultQRConfig() QRConfig {
	return QRConfig{
		FgColor: "#0f172a",
		BgColor: "#ffffff",
	}
}

// GenerateQRBase64 generates a styled QR code and returns base64 string
func GenerateQRBase64(content string) (string, error) {
	return GenerateQRBase64WithConfig(content, DefaultQRConfig())
}

// GenerateQRBase64WithConfig generates QR with custom branding
func GenerateQRBase64WithConfig(content string, cfg QRConfig) (string, error) {
	qrc, err := qrcode.New(content)
	if err != nil {
		return "", fmt.Errorf("qr create: %w", err)
	}

	fgColor := cfg.FgColor
	bgColor := cfg.BgColor
	if fgColor == "" {
		fgColor = "#0f172a"
	}
	if bgColor == "" {
		bgColor = "#ffffff"
	}

	opts := []standard.ImageOption{
		standard.WithBgColorRGBHex(bgColor),
		standard.WithFgColorRGBHex(fgColor),
		standard.WithQRWidth(10),
		standard.WithBorderWidth(3),
	}

	// Add logo — merchant logo takes priority, fallback to NovaPay brand logo
	logoPath := cfg.LogoURL
	if logoPath == "" {
		// Try default NovaPay brand logo
		if _, err := os.Stat("/app/assets/logo.jpeg"); err == nil {
			logoPath = "/app/assets/logo.jpeg"
		}
	}
	if logoPath != "" {
		opts = append(opts, standard.WithLogoImageFileJPEG(logoPath))
	}

	tmpFile := fmt.Sprintf("/tmp/qr-%d.jpeg", os.Getpid())
	defer os.Remove(tmpFile)

	w, err := standard.New(tmpFile, opts...)
	if err != nil {
		return "", fmt.Errorf("qr writer: %w", err)
	}

	if err := qrc.Save(w); err != nil {
		return "", fmt.Errorf("qr save: %w", err)
	}

	data, err := os.ReadFile(tmpFile)
	if err != nil {
		return "", fmt.Errorf("qr read: %w", err)
	}

	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(data), nil
}
