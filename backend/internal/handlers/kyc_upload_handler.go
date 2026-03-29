package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

func (h *Handler) UploadKYCDocument(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	file, header, err := c.Request.FormFile("document")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "document file is required"})
		return
	}
	defer file.Close()
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "file must be under 5MB"})
		return
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	mimes := map[string]string{
		".png":  "image/png",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".pdf":  "application/pdf",
	}
	mime, ok := mimes[ext]
	if !ok {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "only JPG, PNG or PDF allowed"})
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, 5*1024*1024))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to read file"})
		return
	}
	// Validate magic bytes to prevent disguised executables
	magic := map[string][]byte{
		"image/png":      {0x89, 0x50, 0x4E, 0x47},
		"image/jpeg":     {0xFF, 0xD8, 0xFF},
		"application/pdf": {0x25, 0x50, 0x44, 0x46},
	}
	expected, ok := magic[mime]
	if !ok || len(data) < len(expected) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid file format"})
		return
	}
	for i, b := range expected {
		if data[i] != b {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "file content does not match extension"})
			return
		}
	}
	docDataURL := fmt.Sprintf("data:%s;base64,%s", mime, base64.StdEncoding.EncodeToString(data))
	if err := h.service.UpdateKYCDocument(c.Request.Context(), merchantID, docDataURL); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "document uploaded successfully"})
}
