package middleware

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/logger"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/utils"
)

// ============================================================================
// JWT AUTH MIDDLEWARE (for dashboard)
// ============================================================================

func JWTAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "missing authorization header"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid authorization format"})
			c.Abort()
			return
		}

		claims, err := utils.ValidateAccessToken(parts[1], cfg.JWT.AccessSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("merchant_id", claims.MerchantID)
		c.Set("merchant_email", claims.Email)
		c.Set("is_admin", claims.IsAdmin)
		c.Next()
	}
}

// ============================================================================
// ADMIN ONLY MIDDLEWARE
// ============================================================================

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("is_admin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// ============================================================================
// API SIGNATURE VERIFICATION (for payment API)
// ============================================================================

func APISignatureVerification(repo *repository.Repository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-KEY")
		signature := c.GetHeader("X-SIGNATURE")
		timestampStr := c.GetHeader("X-TIMESTAMP")

		if apiKey == "" || signature == "" || timestampStr == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "missing required headers: X-API-KEY, X-SIGNATURE, X-TIMESTAMP",
				Code:  "MISSING_HEADERS",
			})
			c.Abort()
			return
		}

		// FIX: Validate timestamp to enforce replay window
		timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "invalid timestamp format",
				Code:  "INVALID_TIMESTAMP",
			})
			c.Abort()
			return
		}

		age := time.Since(time.Unix(timestamp, 0))
		tolerance := cfg.Security.TimestampTolerance
		if age > tolerance || age < -tolerance {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "request timestamp expired or too far in the future",
				Code:  "TIMESTAMP_EXPIRED",
			})
			c.Abort()
			return
		}

		// Look up merchant by API key
		merchant, err := repo.GetMerchantByAPIKey(c.Request.Context(), apiKey)
		if err != nil || merchant == nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "invalid API key",
				Code:  "INVALID_API_KEY",
			})
			c.Abort()
			return
		}

		// Read request body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "failed to read request body"})
			c.Abort()
			return
		}
		// Restore body for downstream handlers
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		// Decrypt the API secret
		apiSecret, err := utils.Decrypt(merchant.APISecret, cfg.Security.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "internal error"})
			c.Abort()
			return
		}

		// Verify HMAC signature: HMAC_SHA256(secret, timestamp + "." + body)
		if !utils.VerifyHMAC(apiSecret, timestampStr, string(body), signature) {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "invalid signature",
				Code:  "INVALID_SIGNATURE",
			})
			c.Abort()
			return
		}

		// Check replay: store signature in Redis with TTL
		replayKey := fmt.Sprintf("replay:%s", signature)
		exists, _ := cfg_redis(c).Exists(c.Request.Context(), replayKey).Result()
		if exists > 0 {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "replay attack detected",
				Code:  "REPLAY_DETECTED",
			})
			c.Abort()
			return
		}

		// Store signature to prevent replay
		cfg_redis(c).Set(c.Request.Context(), replayKey, "1", tolerance)

		c.Set("merchant", merchant)
		c.Set("merchant_id", merchant.ID)
		c.Next()
	}
}

// Helper to get Redis client (set during server init)
var (
	redisClient   *redis.Client
	redisClientMu sync.RWMutex
)

func SetRedisClient(r *redis.Client) {
	redisClientMu.Lock()
	defer redisClientMu.Unlock()
	redisClient = r
}

func cfg_redis(c *gin.Context) *redis.Client {
	redisClientMu.RLock()
	defer redisClientMu.RUnlock()
	return redisClient
}

// ============================================================================
// RATE LIMITER (Token Bucket with Redis)
// ============================================================================

func RateLimiter(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := fmt.Sprintf("ratelimit:%s", ip)

		current, err := rdb.Incr(c.Request.Context(), key).Result()
		if err != nil {
			// If Redis is down, allow request but log
			logger.Warn().Str("ip", ip).Msg("Rate limiter Redis error — allowing request")
			c.Next()
			return
		}

		if current == 1 {
			rdb.Expire(c.Request.Context(), key, window)
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, int64(limit)-current)))

		if current > int64(limit) {
			c.JSON(http.StatusTooManyRequests, models.ErrorResponse{
				Error: "rate limit exceeded, try again later",
				Code:  "RATE_LIMIT_EXCEEDED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

// ============================================================================
// IP-BASED RATE LIMITER (in-memory fallback)
// ============================================================================

type IPRateLimiter struct {
	mu       sync.RWMutex
	visitors map[string]*visitor
	limit    int
	window   time.Duration
}

type visitor struct {
	count    int
	lastSeen time.Time
}

func NewIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	rl := &IPRateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *IPRateLimiter) cleanup() {
	for {
		time.Sleep(rl.window)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.window {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *IPRateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
		return true
	}

	if time.Since(v.lastSeen) > rl.window {
		v.count = 1
		v.lastSeen = time.Now()
		return true
	}

	v.count++
	v.lastSeen = time.Now()
	return v.count <= rl.limit
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	}
}

// ============================================================================
// CORS MIDDLEWARE
// ============================================================================

func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := false
		for _, o := range allowedOrigins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-KEY, X-SIGNATURE, X-TIMESTAMP")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ============================================================================
// REQUEST ID — uses UUID instead of UnixNano (was predictable)
// ============================================================================

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// ============================================================================
// REQUEST LOGGER (kept for reference — use StructuredLogger in production)
// ============================================================================

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)

		logger.Info().
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Int("status", c.Writer.Status()).
			Dur("latency", latency).
			Str("ip", c.ClientIP()).
			Msg("request")
	}
}
