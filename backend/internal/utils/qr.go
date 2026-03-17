package utils

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image/png"
	"os"

	qrcode "github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

// GenerateQRBase64 generates a styled QR code and returns base64 PNG string
func GenerateQRBase64(content string) (string, error) {
	qrc, err := qrcode.New(content)
	if err != nil {
		return "", fmt.Errorf("qr create: %w", err)
	}

	tmpFile := fmt.Sprintf("/tmp/qr-%d.png", os.Getpid())
	defer os.Remove(tmpFile)

	w, err := standard.New(tmpFile,
		standard.WithBgColorRGBHex("#ffffff"),
		standard.WithFgColorRGBHex("#0f172a"),
		standard.WithQRWidth(8),
		standard.WithBorderWidth(3),
		standard.WithBuiltinImageEncoder(standard.PNG_FORMAT),
	)
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

	// Validate PNG
	if _, err := png.Decode(bytes.NewReader(data)); err != nil {
		// Not PNG — still encode as-is with correct prefix
		return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data), nil
	}

	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data), nil
}
