package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/handlers"
	"github.com/upay/gateway/internal/logger"
	"github.com/upay/gateway/internal/middleware"
	"github.com/upay/gateway/internal/providers"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/services"
	"github.com/upay/gateway/internal/workers"
)

func main() {
	// Load .env file (optional, for development)
	godotenv.Load()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize structured logger
	logger.Init(cfg.Server.Mode)
	log := logger.Log

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ========================================================================
	// DATABASE CONNECTION
	// ========================================================================
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to parse database config")
	}
	poolConfig.MaxConns = int32(cfg.Database.MaxConns)
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = 30 * time.Minute
	poolConfig.MaxConnIdleTime = 5 * time.Minute

	db, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping database")
	}
	log.Info().Msg("Database connected")

	// ========================================================================
	// REDIS CONNECTION
	// ========================================================================
	rdb := redis.NewClient(&redis.Options{
		Addr:         cfg.Redis.Addr(),
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.DB,
		PoolSize:     50,
		MinIdleConns: 10,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	log.Info().Msg("Redis connected")

	// Set Redis client for middleware
	middleware.SetRedisClient(rdb)

	// ========================================================================
	// INITIALIZE PROVIDERS
	// ========================================================================
	providerRegistry := providers.InitProviders(ctx)
	log.Info().Str("default_provider", providerRegistry.Default().Name()).Msg("Payment providers initialized")

	// ========================================================================
	// INITIALIZE LAYERS
	// ========================================================================
	repo := repository.New(db)
	svc := services.New(repo, rdb, cfg)
	h := handlers.New(svc)

	// ========================================================================
	// START BACKGROUND WORKERS (with graceful shutdown support)
	// ========================================================================
	var wg sync.WaitGroup
	w := workers.New(repo, rdb, cfg)
	w.StartWithWaitGroup(ctx, &wg)

	// ========================================================================
	// ROUTER SETUP
	// ========================================================================
	r := gin.New()

	// Global middleware stack (order matters)
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.StructuredLogger())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS([]string{"http://localhost:3000", "https://dashboard.novapay.in", "https://nova-pay.in"}))
	r.Use(middleware.RateLimiter(rdb, cfg.Security.RateLimitPerMinute, time.Minute))
	r.Use(middleware.RequestBodyLimit(1 << 20)) // 1MB max body
	r.Use(middleware.MetricsCollector())

	// ========================================================================
	// ROUTES
	// ========================================================================

	// Health + Metrics (internal)
	r.GET("/health", h.HealthCheck)
	r.GET("/metrics", middleware.JWTAuth(cfg), middleware.AdminOnly(), middleware.MetricsEndpoint())

	// Public — no auth required (landing page pricing)
	r.GET("/api/v1/public/plans", h.GetPublicPlans)
	r.GET("/api/v1/public/payment/:payment_id", h.GetPaymentStatus)
	r.POST("/api/v1/public/subscribe", h.EmailSubscribe)

	v1 := r.Group("/api/v1")
	{
		// ---- AUTH (public) ----
		auth := v1.Group("/auth")
		{
			auth.POST("/register", h.Register)
			auth.POST("/login", h.Login)
			auth.POST("/refresh", h.RefreshToken)
		}

		// ---- PAYMENT API (API-key + signature authenticated) ----
		payments := v1.Group("/payments")
		payments.Use(middleware.APISignatureVerification(repo, cfg))
		payments.Use(middleware.IdempotencyKey(rdb, 24*time.Hour))
		{
			payments.POST("/create", h.CreatePayment)
			payments.GET("/status/:payment_id", h.GetPaymentStatus)
			payments.POST("/verify", h.VerifyPayment)
		}

		// ---- MERCHANT DASHBOARD (JWT authenticated) ----
		dashboard := v1.Group("/dashboard")
		dashboard.Use(middleware.JWTAuth(cfg))
		{
			dashboard.GET("/stats", h.GetDashboardStats)
			dashboard.GET("/transactions", h.GetTransactions)
			dashboard.GET("/profile", h.GetProfile)

			// UPI management
			dashboard.POST("/upi", h.AddUPI)
			dashboard.GET("/upi", h.ListUPIs)
			dashboard.DELETE("/upi/:upi_id", h.DeleteUPI)

			// Webhook settings
			dashboard.PUT("/webhook", h.UpdateWebhook)

			// Security
			dashboard.POST("/rotate-keys", h.RotateAPIKeys)
			dashboard.POST("/change-password", h.ChangePassword)

			// Provider connections
			dashboard.GET("/providers",        h.GetProviders)
			dashboard.POST("/providers",       h.ConnectProvider)
			dashboard.PUT("/providers/:id",    h.UpdateProvider)
			dashboard.DELETE("/providers/:id", h.DeleteProvider)
					dashboard.GET("/subscription", h.GetSubscription)
					dashboard.POST("/subscription", h.CreateSubscription)
					dashboard.DELETE("/subscription", h.CancelSubscription)
					dashboard.GET("/subscription/detail", h.GetSubscriptionWithPlan)
					dashboard.POST("/subscription/pay", h.InitiateSubscriptionPayment)
					dashboard.POST("/logo", h.UploadMerchantLogo)
					dashboard.DELETE("/logo", h.DeleteMerchantLogo)
					dashboard.PUT("/business-name", h.UpdateBusinessName)
					dashboard.GET("/referral", h.GetReferralStats)
					dashboard.POST("/paytm-mid", h.SavePaytmMID)
				dashboard.GET("/kyc", h.GetKYC)
					dashboard.POST("/kyc/document", h.UploadKYCDocument)
					dashboard.POST("/kyc", h.SubmitKYC)
					dashboard.POST("/payments/create", h.CreatePayment)
					dashboard.GET("/payments/status/:payment_id", h.GetPaymentStatus)
		}

		// ---- ADMIN (JWT + admin role) ----
		admin := v1.Group("/admin")
		admin.Use(middleware.JWTAuth(cfg))
		admin.Use(middleware.AdminOnly())
		{
			admin.GET("/merchants", h.AdminListMerchants)
			admin.PUT("/merchants/:id/toggle", h.AdminToggleMerchant)
			admin.GET("/fraud-alerts", h.AdminGetFraudAlerts)
			admin.PUT("/fraud-alerts/:id/resolve", h.AdminResolveFraudAlert)
			admin.PUT("/payments/:id/status", h.AdminUpdatePaymentStatus)
					admin.GET("/payments", h.AdminListPayments)
					admin.GET("/kyc", h.AdminListKYC)
					admin.PUT("/kyc/:merchant_id", h.AdminReviewKYC)
					admin.POST("/subscriptions/:merchant_id/extend", h.AdminExtendSubscription)
			admin.GET("/stats", h.AdminGetSystemStats)

			// Plans — admin controlled (shown on landing page)
			admin.GET("/plans",        h.AdminListPlans)
			admin.POST("/plans",       h.AdminCreatePlan)
			admin.PUT("/plans/:id",    h.AdminUpdatePlan)
			admin.DELETE("/plans/:id", h.AdminDeletePlan)
		}
	}

	// ========================================================================
	// PAYMENT CONFIRMATION PAGE (hosted by gateway)
	// ========================================================================
	r.GET("/pay/:payment_id", h.PaymentPage)

	// ========================================================================
	// SERVER START
	// ========================================================================
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("NovaPay Gateway starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// ========================================================================
	// GRACEFUL SHUTDOWN
	// ========================================================================
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	log.Info().Str("signal", sig.String()).Msg("Shutdown signal received")

	// Phase 1: Stop accepting new requests
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("Server forced shutdown")
	}
	log.Info().Msg("HTTP server stopped")

	// Phase 2: Stop background workers and drain queues
	cancel()

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Info().Msg("All workers stopped gracefully")
	case <-time.After(10 * time.Second):
		log.Warn().Msg("Workers did not stop within timeout")
	}

	// Phase 3: Close connections
	rdb.Close()
	db.Close()

	log.Info().Msg("NovaPay Gateway shutdown complete")
}