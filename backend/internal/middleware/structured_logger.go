package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/upay/gateway/internal/logger"
)

// StructuredLogger replaces the old RequestLogger with JSON-structured output.
// Each request logs: method, path, status, latency, IP, request_id, merchant_id (if authenticated).
func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		event := logger.Info()
		if status >= 500 {
			event = logger.Error()
		} else if status >= 400 {
			event = logger.Warn()
		}

		event.
			Str("method", c.Request.Method).
			Str("path", path).
			Str("query", query).
			Int("status", status).
			Dur("latency", latency).
			Str("ip", c.ClientIP()).
			Str("user_agent", c.Request.UserAgent()).
			Int("body_size", c.Writer.Size())

		// Add request ID if present
		if reqID, exists := c.Get("request_id"); exists {
			event.Str("request_id", reqID.(string))
		}

		// Add merchant ID if authenticated
		if merchantID, exists := c.Get("merchant_id"); exists {
			event.Str("merchant_id", merchantID.(uuid.UUID).String())
		}

		// Add errors if any
		if len(c.Errors) > 0 {
			event.Str("errors", c.Errors.String())
		}

		event.Msg("request")
	}
}
