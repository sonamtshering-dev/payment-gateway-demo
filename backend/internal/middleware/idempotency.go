package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/models"
)

// IdempotencyKey middleware caches POST responses by Idempotency-Key header.
// If the same key is sent within the TTL, the cached response is returned
// without executing the handler again.
func IdempotencyKey(rdb *redis.Client, ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != "POST" {
			c.Next()
			return
		}

		idempotencyKey := c.GetHeader("Idempotency-Key")
		if idempotencyKey == "" {
			c.Next()
			return
		}

		// Namespace by API key to prevent cross-merchant collisions
		apiKey := c.GetHeader("X-API-KEY")
		keyHash := sha256.Sum256([]byte(apiKey + ":" + idempotencyKey))
		cacheKey := "idempotent:" + hex.EncodeToString(keyHash[:])

		// Check if we already have a cached response
		cached, err := rdb.Get(c.Request.Context(), cacheKey).Bytes()
		if err == nil && len(cached) > 0 {
			c.Header("X-Idempotent-Replay", "true")
			c.Data(http.StatusOK, "application/json", cached)
			c.Abort()
			return
		}

		// Use a custom response writer to capture the response body
		writer := &idempotentWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = writer

		c.Next()

		// Cache successful responses (2xx)
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			rdb.Set(c.Request.Context(), cacheKey, writer.body.Bytes(), ttl)
		}
	}
}

type idempotentWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *idempotentWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// RequestBodyLimit limits the maximum request body size to prevent
// memory exhaustion from oversized payloads.
func RequestBodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()

		// Check if the body was too large
		if c.Errors.Last() != nil {
			if _, err := io.ReadAll(c.Request.Body); err != nil {
				c.JSON(http.StatusRequestEntityTooLarge, models.ErrorResponse{
					Error: "request body too large",
					Code:  "BODY_TOO_LARGE",
				})
				c.Abort()
				return
			}
		}
	}
}
