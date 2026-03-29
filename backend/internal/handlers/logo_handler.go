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

func (h *Handler) UploadMerchantLogo(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	file, header, err := c.Request.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "logo file is required"})
		return
	}
	defer file.Close()
	if header.Size > 2*1024*1024 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "logo must be under 2MB"})
		return
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	mimes := map[string]string{".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
	mime, ok := mimes[ext]
	if !ok {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "only PNG, JPG or WebP allowed"})
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, 2*1024*1024))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to read file"})
		return
	}
	// Validate magic bytes to prevent disguised executables
	magic := map[string][]byte{
		"image/png":  {0x89, 0x50, 0x4E, 0x47},
		"image/jpeg": {0xFF, 0xD8, 0xFF},
		"image/webp": {0x52, 0x49, 0x46, 0x46},
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
	logoDataURL := fmt.Sprintf("data:%s;base64,%s", mime, base64.StdEncoding.EncodeToString(data))
	if err := h.service.UpdateMerchantLogo(c.Request.Context(), merchantID, logoDataURL); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "logo updated"})
}

func (h *Handler) DeleteMerchantLogo(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	if err := h.service.UpdateMerchantLogo(c.Request.Context(), merchantID, ""); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "logo removed"})
}

func (h *Handler) UpdateBusinessName(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		BusinessName string `json:"business_name" binding:"required,min=2,max=80"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.UpdateBusinessName(c.Request.Context(), merchantID, req.BusinessName); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "business name updated"})
}
