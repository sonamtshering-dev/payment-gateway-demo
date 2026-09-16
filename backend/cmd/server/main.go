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
	// SECURITY STARTUP CHECKS
	// ========================================================================
	if cfg.Database.SSLMode == "disable" {
		log.Warn().Msg("SECURITY: DB_SSL_MODE=disable — database connection is unencrypted. Set DB_SSL_MODE=require in .env")
	}
	if cfg.JWT.AccessExpiry > 60*time.Minute {
		log.Warn().Dur("expiry", cfg.JWT.AccessExpiry).Msg("SECURITY: JWT access token lifetime exceeds 60 minutes. Reduce JWT_ACCESS_EXPIRY_MINUTES to 15")
	}
	if len(cfg.Security.AdminAllowedIPs) == 0 || (len(cfg.Security.AdminAllowedIPs) == 1 && cfg.Security.AdminAllowedIPs[0] == "") {
		log.Warn().Msg("SECURITY: ADMIN_ALLOWED_IPS is not set — admin panel is accessible from any IP. Set ADMIN_ALLOWED_IPS in .env")
	}
	if appBase := os.Getenv("APP_BASE_URL"); appBase == "" || appBase == "http://localhost:3000" {
		log.Warn().Msg("SECURITY: APP_BASE_URL is not set or points to localhost — password reset emails will contain broken links")
	}

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
	r.Use(middleware.CORS([]string{"http://localhost:3000", "https://nova-pay.in", "https://www.nova-pay.in"}))
	r.Use(middleware.RateLimiter(rdb, cfg.Security.RateLimitPerMinute, time.Minute))
	r.Use(middleware.RequestBodyLimit(1 << 20)) // 1MB max body
	r.Use(middleware.RequireJSON())
	r.Use(middleware.MetricsCollector())

	// ========================================================================
	// ROUTES
	// ========================================================================

	// Health (public) + Metrics (admin only)
	r.GET("/health", h.HealthCheck)
	metricsGroup := r.Group("/metrics")
	metricsGroup.Use(middleware.JWTAuth(cfg))
	metricsGroup.Use(middleware.AdminOnly())
	metricsGroup.GET("", middleware.MetricsEndpoint())

	// Public — no auth required (landing page pricing)
	r.GET("/api/v1/public/plans", h.GetPublicPlans)
	r.GET("/api/v1/public/payment/:payment_id", h.GetPaymentStatus)
	r.POST("/api/v1/public/payment/:payment_id/customer-details", h.SaveCustomerDetails)
	r.POST("/api/v1/public/payment/:payment_id/crypto/init", h.InitCryptoPayment)
	r.POST("/api/v1/public/crypto/verify", h.VerifyCryptoPayment)
	r.POST("/api/v1/public/subscribe", h.EmailSubscribe)

	v1 := r.Group("/api/v1")
	{
		// ---- AUTH (public) ----
		auth := v1.Group("/auth")
		{
			auth.POST("/register", middleware.RateLimiter(rdb, 10, time.Minute, "register"), h.Register)
			auth.POST("/login", middleware.RateLimiter(rdb, 10, time.Minute, "login"), h.Login)
			auth.POST("/refresh", h.RefreshToken)
			auth.POST("/forgot-password", middleware.RateLimiter(rdb, 5, time.Minute, "forgot-pw"), h.ForgotPassword)
			auth.POST("/reset-password", middleware.RateLimiter(rdb, 5, time.Minute, "reset-pw"), h.ResetPassword)
			auth.POST("/accept-invite", h.AcceptTeamInvite)
			auth.POST("/otp/request", middleware.RateLimiter(rdb, 5, time.Minute, "otp-req"), h.RequestLoginOTP)
			auth.POST("/otp/verify", middleware.RateLimiter(rdb, 10, time.Minute, "otp-verify"), h.VerifyLoginOTP)
			auth.POST("/telegram/login", middleware.RateLimiter(rdb, 10, time.Minute, "tg-login"), h.TelegramLoginAuth)
		}

		// ---- PAYMENT API (API-key + signature authenticated) ----
		payments := v1.Group("/payments")
		payments.Use(middleware.APISignatureVerification(repo, cfg))
		payments.Use(middleware.MerchantIPWhitelistCheck(repo))
		payments.Use(middleware.IdempotencyKey(rdb, 24*time.Hour))
		{
			payments.POST("/create", h.CreatePayment)
			payments.GET("/status/:payment_id", h.GetPaymentStatus)
			payments.POST("/verify", h.VerifyPayment)
		}

		// ---- MERCHANT DASHBOARD (JWT authenticated) ----
		dashboard := v1.Group("/dashboard")
		dashboard.Use(middleware.JWTAuth(cfg))
		// adm guards mutating settings routes: owner + admin roles only (viewers are read-only)
		adm := middleware.RequireRole("owner", "admin")
		{
			dashboard.GET("/stats", h.GetDashboardStats)
			dashboard.GET("/transactions", h.GetTransactions)
			dashboard.GET("/profile", h.GetProfile)

			// Payment link creation from dashboard (JWT auth, no HMAC required)
			dashboard.POST("/payments/create", h.CreatePayment)

			// UPI management
			dashboard.POST("/upi", adm, h.AddUPI)
			dashboard.GET("/upi", h.ListUPIs)
			dashboard.DELETE("/upi/:upi_id", adm, h.DeleteUPI)

			// Webhook settings
			dashboard.GET("/webhook", h.GetWebhook)
			dashboard.PUT("/webhook", adm, h.UpdateWebhook)
			dashboard.GET("/webhook-secret", h.GetWebhookSecret)
			dashboard.GET("/api-secret", h.GetAPISecret)

			// IP whitelist management
			dashboard.GET("/ip-whitelist", h.GetIPWhitelist)
			dashboard.POST("/ip-whitelist", adm, h.AddIPWhitelist)
			dashboard.DELETE("/ip-whitelist/:id", adm, h.DeleteIPWhitelist)

			// Security (owner only)
			dashboard.POST("/rotate-keys", middleware.RequireRole("owner"), h.RotateAPIKeys)
			dashboard.POST("/change-password", middleware.RequireRole("owner"), h.ChangePassword)

			// Team management (owner only)
			team := dashboard.Group("/team", middleware.RequireRole("owner"))
			{
				team.GET("", h.ListTeamMembers)
				team.POST("/invite", h.InviteTeamMember)
				team.PUT("/:id", h.UpdateTeamMember)
				team.DELETE("/:id", h.RemoveTeamMember)
			}

			// Provider connections
			dashboard.GET("/providers",        h.GetProviders)
			dashboard.POST("/providers", adm, h.ConnectProvider)
			dashboard.PUT("/providers/:id", adm, h.UpdateProvider)
			dashboard.DELETE("/providers/:id", adm, h.DeleteProvider)
					dashboard.GET("/subscription", h.GetSubscription)
					dashboard.POST("/subscription", h.CreateSubscription)
					dashboard.DELETE("/subscription", h.CancelSubscription)
					dashboard.GET("/subscription/detail", h.GetSubscriptionWithPlan)
					dashboard.POST("/subscription/pay", h.InitiateSubscriptionPayment)
					dashboard.POST("/logo", adm, h.UploadMerchantLogo)
					dashboard.DELETE("/logo", adm, h.DeleteMerchantLogo)
					dashboard.PUT("/business-name", adm, h.UpdateBusinessName)
					dashboard.PUT("/branding", adm, h.UpdateBranding)
					dashboard.POST("/chat", h.Chat)
					dashboard.POST("/tickets", h.CreateTicket)
					dashboard.GET("/tickets", h.ListMyTickets)
					dashboard.GET("/referral", h.GetReferralStats)
					dashboard.POST("/referral/apply", h.ApplyReferralCode)
					dashboard.POST("/paytm-mid", adm, h.SavePaytmMID)
					dashboard.POST("/phonepe-config", adm, h.SavePhonePeConfig)
				dashboard.GET("/kyc", h.GetKYC)
					dashboard.POST("/kyc", h.SubmitKYC)
					dashboard.POST("/kyc/document", h.UploadKYCDocument)

				// Telegram notifications
				// Crypto / USDT settings
			dashboard.GET("/crypto", h.GetCryptoSettings)
			dashboard.PUT("/crypto/config", adm, h.UpdateCryptoConfig)
			dashboard.POST("/crypto/wallet", adm, h.SaveCryptoWallet)
			dashboard.DELETE("/crypto/wallet/:network", adm, h.DeleteCryptoWallet)

			dashboard.GET("/telegram", h.GetTelegramStatus)
				dashboard.POST("/telegram/connect", h.GenerateTelegramCode)
				dashboard.PUT("/telegram/settings", adm, h.UpdateTelegramSettings)
				dashboard.POST("/telegram/test", h.SendTelegramTest)
				dashboard.DELETE("/telegram", adm, h.DisconnectTelegram)
				dashboard.GET("/telegram/history", h.GetTelegramHistory)
		}

		// ---- ADMIN (JWT + admin role) ----
		admin := v1.Group("/admin")
		admin.Use(middleware.JWTAuth(cfg))
		admin.Use(middleware.AdminOnly())
		admin.Use(middleware.AdminIPWhitelist(cfg.Security.AdminAllowedIPs))
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
					admin.PUT("/subscriptions/:merchant_id/status", h.AdminUpdateSubscriptionStatus)
					admin.PUT("/subscriptions/:merchant_id/plan", h.AdminChangeMerchantPlan)
			admin.GET("/stats", h.AdminGetSystemStats)

			// Plans — admin controlled (shown on landing page)
			admin.GET("/plans",        h.AdminListPlans)
			admin.POST("/plans",       h.AdminCreatePlan)
			admin.PUT("/plans/:id",    h.AdminUpdatePlan)
			admin.DELETE("/plans/:id", h.AdminDeletePlan)

			// Enhanced admin endpoints
			admin.GET("/merchants/:id",                  h.AdminGetMerchantDetail)
			admin.POST("/merchants/:id/reset-password",  h.AdminResetMerchantPassword)
			admin.POST("/merchants/:id/rotate-keys",     h.AdminRotateMerchantKeys)
			admin.PUT("/merchants/:id/limit",            h.AdminUpdateMerchantLimit)
			admin.GET("/webhook-logs",                   h.AdminGetWebhookLogs)
			admin.POST("/webhook-logs/:id/retry",        h.AdminRetryWebhook)
			admin.GET("/revenue-chart",                  h.AdminGetRevenueChart)
			admin.GET("/subscriptions",                  h.AdminGetSubscriptions)
			admin.GET("/audit-logs",                     h.AdminGetAuditLogs)
			admin.GET("/top-merchants",                  h.AdminGetTopMerchants)
			admin.GET("/payments-v2",                    h.AdminListPaymentsPaginated)
			admin.GET("/fraud-v2",                       h.AdminListFraudPaginated)
			admin.GET("/tickets",                        h.AdminListTickets)
			admin.PUT("/tickets/:id",                    h.AdminUpdateTicket)
		}
	}

	// ========================================================================
	// TELEGRAM BOT WEBHOOK (public, validated via secret-token header)
	// ========================================================================
	r.POST("/api/v1/telegram/webhook", h.TelegramBotWebhook)

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

	// Auto-register Telegram webhook on startup
	if cfg.Telegram.BotToken != "" {
		appURL := os.Getenv("APP_BASE_URL")
		if appURL == "" {
			appURL = "https://nova-pay.in"
		}
		webhookURL := appURL + "/api/v1/telegram/webhook"
		tgSvc := services.NewTelegramService(cfg.Telegram.BotToken, cfg.Telegram.BotName, nil)
		if err := tgSvc.SetWebhook(webhookURL, cfg.Telegram.WebhookSecret); err != nil {
			log.Error().Err(err).Msg("Failed to register Telegram webhook")
		} else {
			log.Info().Str("url", webhookURL).Msg("Telegram webhook registered")
		}
	} else {
		log.Warn().Msg("TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled")
	}

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