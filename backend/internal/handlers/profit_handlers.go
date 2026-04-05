package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/repository"
)

func (h *Handler) GetSupplierConfigs(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	configs, err := h.service.GetSupplierConfigs(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if configs == nil {
		configs = []repository.SupplierConfig{}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": configs})
}

func (h *Handler) UpsertSupplierConfig(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req struct {
		SupplierName      string  `json:"supplier_name" binding:"required"`
		BaseValue         float64 `json:"base_value"`
		DefaultMultiplier float64 `json:"default_multiplier"`
		DefaultNumber     float64 `json:"default_number"`
		IsActive          bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := h.service.UpsertSupplierConfig(c.Request.Context(), merchantID, req.SupplierName, req.BaseValue, req.DefaultMultiplier, req.DefaultNumber, req.IsActive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Supplier config saved"})
}

func (h *Handler) CreateProfitTransaction(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	txn, err := h.service.CreateProfitTransaction(c.Request.Context(), merchantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": txn})
}

func (h *Handler) GetProfitTransactions(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	txns, total, err := h.service.GetProfitTransactions(c.Request.Context(), merchantID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if txns == nil {
		txns = []repository.ProfitTransaction{}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": txns, "total": total})
}

func (h *Handler) GetProfitSummary(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	period := c.DefaultQuery("period", "month")
	summary, err := h.service.GetProfitSummary(c.Request.Context(), merchantID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": summary})
}

func (h *Handler) GetMonthlyStatements(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	stmts, err := h.service.GetMonthlyStatements(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if stmts == nil {
		stmts = []repository.MonthlyStatement{}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": stmts})
}

func (h *Handler) GenerateMonthlyStatement(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)
	monthStr := c.DefaultQuery("month", time.Now().Format("2006-01"))
	month, err := time.Parse("2006-01", monthStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid month format, use YYYY-MM"})
		return
	}
	if err := h.service.GenerateMonthlyStatement(c.Request.Context(), merchantID, month); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Statement generated and emailed"})
}
