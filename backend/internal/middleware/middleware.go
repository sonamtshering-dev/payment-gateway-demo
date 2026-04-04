package middleware

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/config"
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
// ADMIN IP WHITELIST
// ============================================================================

func AdminIPWhitelist(allowedIPs []string) gin.HandlerFunc {
	allowed := make(map[string]bool)
	for _, ip := range allowedIPs {
		allowed[strings.TrimSpace(ip)] = true
	}
	return func(c *gin.Context) {
		// CF-Connecting-IP has the real visitor IP when behind Cloudflare
		ip := c.GetHeader("CF-Connecting-IP")
		if ip == "" {
			ip = c.ClientIP()
		}
		// Strip port if present
		if idx := strings.LastIndex(ip, ":"); idx != -1 {
			if strings.Count(ip, ":") == 1 {
				ip = ip[:idx]
			}
		}
		if !allowed[ip] {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "access denied: IP not whitelisted"})
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
		timestamp := c.GetHeader("X-TIMESTAMP")

		if apiKey == "" || signature == "" || timestamp == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "missing required headers: X-API-KEY, X-SIGNATURE, X-TIMESTAMP",
				Code:  "MISSING_HEADERS",
			})
			c.Abort()
			return
		}

	// DEV MODE – skip signature verification for local testing
// WARNING: Do NOT use this in production

// DEV MODE: Skip signature verification
// Commented for local testing

// if !utils.VerifyHMAC(apiSecret, timestamp, string(body), signature) {
//     c.JSON(http.StatusUnauthorized, models.ErrorResponse{
//         Error: "invalid signature",
//         Code:  "INVALID_SIGNATURE",
//     })
//     c.Abort()
//     return
// }



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

		// Verify HMAC signature: HMAC_SHA256(secret + timestamp + body)
		if !utils.VerifyHMAC(apiSecret, timestamp, string(body), signature) {
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

		// Store signature to prevent replay (TTL = timestamp tolerance window)
		cfg_redis(c).Set(c.Request.Context(), replayKey, "1", cfg.Security.TimestampTolerance)

		c.Set("merchant", merchant)
		c.Set("merchant_id", merchant.ID)
		c.Next()
	}
}

// Helper to get Redis from context (set during server init)
var redisClient *redis.Client

func SetRedisClient(r *redis.Client) {
	redisClient = r
}

func cfg_redis(c *gin.Context) *redis.Client {
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
// REQUEST ID
// ============================================================================

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = fmt.Sprintf("%d", time.Now().UnixNano())
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// ============================================================================
// REQUEST LOGGER
// ============================================================================

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)

		fmt.Printf("[%s] %s %s %d %v %s\n",
			time.Now().Format(time.RFC3339),
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			latency,
			c.ClientIP(),
		)
	}
}