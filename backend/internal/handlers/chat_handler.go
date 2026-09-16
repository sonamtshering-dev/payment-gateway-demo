package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
)

type chatMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatReq struct {
	Message string    `json:"message" binding:"required,max=1000"`
	History []chatMsg `json:"history"`
}

func (h *Handler) Chat(c *gin.Context) {
	merchantID := c.MustGet("merchant_id").(uuid.UUID)

	var req chatReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "message required"})
		return
	}

	// Sanitize history: only allow user/assistant roles, cap at last 10 turns
	var history []chatMsg
	for _, m := range req.History {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		history = append(history, m)
	}
	if len(history) > 10 {
		history = history[len(history)-10:]
	}

	merchant, err := h.service.GetMerchantByID(c.Request.Context(), merchantID)
	if err != nil || merchant == nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "context unavailable"})
		return
	}

	stats, _ := h.service.GetMerchantStats(c.Request.Context(), merchantID)

	filter := models.TransactionFilter{Page: 1, Limit: 8}
	recentTxs, _, _ := h.service.GetMerchantPayments(c.Request.Context(), merchantID, filter)

	system := buildSystemPrompt(merchant, stats, recentTxs)

	messages := []chatMsg{{Role: "system", Content: system}}
	messages = append(messages, history...)
	messages = append(messages, chatMsg{Role: "user", Content: req.Message})

	reply, err := groqChat(messages)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, models.ErrorResponse{Error: "AI service unavailable, try again"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: map[string]string{"reply": reply}})
}

func buildSystemPrompt(merchant *models.Merchant, stats *models.DashboardStats, txs []models.Payment) string {
	biz := merchant.Name
	if merchant.BusinessName != nil && *merchant.BusinessName != "" {
		biz = *merchant.BusinessName
	}

	statsBlock := "Stats: not available"
	if stats != nil {
		statsBlock = fmt.Sprintf(
			"Dashboard stats:\n• Total transactions: %d  |  Successful: %d  |  Failed: %d  |  Pending: %d\n• Total volume: ₹%.2f  |  Success rate: %.1f%%\n• Today: %d transactions, ₹%.2f volume",
			stats.TotalTransactions, stats.SuccessfulPayments, stats.FailedPayments, stats.PendingPayments,
			float64(stats.TotalVolume)/100, stats.SuccessRate,
			stats.TodayTransactions, float64(stats.TodayVolume)/100,
		)
	}

	txBlock := ""
	if len(txs) > 0 {
		txBlock = "\nRecent transactions:\n"
		for _, tx := range txs {
			oid := tx.OrderID
			if oid == "" {
				oid = tx.ID.String()[:8]
			}
			utr := ""
			if tx.UTR != nil && *tx.UTR != "" {
				utr = " UTR:" + *tx.UTR
			}
			txBlock += fmt.Sprintf("• %s | ₹%.2f | %s%s | %s\n",
				oid, float64(tx.Amount)/100, tx.Status, utr,
				tx.CreatedAt.Format("02 Jan 15:04"),
			)
		}
	}

	return fmt.Sprintf(`You are the NovaPay Assistant — a helpful AI inside the NovaPay payment gateway dashboard.

Merchant: %s  |  Business: %s
%s
%s
Rules:
- Only answer using the data provided above. Never fabricate numbers.
- Keep replies short and conversational. No headers, no markdown, no asterisks.
- Use plain bullet points with • character for lists, not - or *.
- Convert paise to ₹ (divide by 100) when showing amounts.
- If asked about a specific payment not shown above, ask for the Order ID or Payment ID.
- Never reveal or guess API keys, secrets, UPI IDs, or credentials.
- You can explain gateway concepts, help debug issues, and summarise stats.
- Write in plain text only. No bold, no italic, no markdown formatting.
- Today is %s IST.`, biz, biz, statsBlock, txBlock, time.Now().In(time.FixedZone("IST", 5*3600+30*60)).Format("02 Jan 2006 15:04"))
}

func groqChat(messages []chatMsg) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY not set")
	}

	body, _ := json.Marshal(map[string]interface{}{
		"model":       "llama-3.1-8b-instant",
		"messages":    messages,
		"max_tokens":  600,
		"temperature": 0.5,
	})

	req, _ := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)

	var result struct {
		Choices []struct {
			Message struct{ Content string `json:"content"` } `json:"message"`
		} `json:"choices"`
		Error struct{ Message string `json:"message"` } `json:"error"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return "", err
	}
	if len(result.Choices) == 0 {
		if result.Error.Message != "" {
			return "", fmt.Errorf("groq: %s", result.Error.Message)
		}
		return "", fmt.Errorf("empty response")
	}
	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}
