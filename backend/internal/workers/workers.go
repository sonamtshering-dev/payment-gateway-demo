package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/services"
	"github.com/upay/gateway/internal/utils"
	"github.com/rs/zerolog/log"
)

type Worker struct {
	repo   *repository.Repository
	redis  *redis.Client
	config *config.Config
	client *http.Client
	email  *services.EmailService
}

func New(repo *repository.Repository, rdb *redis.Client, cfg *config.Config) *Worker {
	return &Worker{
		repo:  repo,
		redis: rdb,
		config: cfg,
		client: &http.Client{Timeout: cfg.Security.WebhookTimeout},
		email: services.NewEmailService(),
	}
}

func (w *Worker) Start(ctx context.Context) {
	log.Info().Msg("Starting background workers")
	go w.paymentExpiryWorker(ctx)
	go w.webhookDispatchWorker(ctx)
	go w.webhookRetryWorker(ctx)
}

func (w *Worker) StartWithWaitGroup(ctx context.Context, wg *sync.WaitGroup) {
	log.Info().Msg("Starting background workers with graceful shutdown")
	wg.Add(3)
	go func() { defer wg.Done(); w.paymentExpiryWorker(ctx) }()
	go func() { defer wg.Done(); w.webhookDispatchWorker(ctx) }()
	go func() { defer wg.Done(); w.webhookRetryWorker(ctx) }()
	wg.Add(1)
	go func() { defer wg.Done(); w.subscriptionExpiryWorker(ctx) }()
	wg.Add(1)
	go func() { defer wg.Done(); w.paytmVerificationWorker(ctx) }()
	wg.Add(1)
	go func() { defer wg.Done(); w.subscriptionReminderWorker(ctx) }()
}

func (w *Worker) paymentExpiryWorker(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Payment expiry worker stopped")
			return
		case <-ticker.C:
			expired, err := w.repo.ExpirePendingPayments(ctx)
			if err != nil {
				log.Error().Err(err).Msg("Error expiring payments")
				continue
			}
			if expired > 0 {
				log.Info().Int64("count", expired).Msg("Expired pending payments")
			}
		}
	}
}

func (w *Worker) webhookDispatchWorker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Webhook dispatch worker stopped")
			return
		default:
			result, err := w.redis.BRPop(ctx, 5*time.Second, "webhook:queue").Result()
			if err != nil {
				if err != redis.Nil && ctx.Err() == nil {
					log.Error().Err(err).Msg("Webhook queue pop error")
				}
				continue
			}
			if len(result) < 2 {
				continue
			}
			var payload models.WebhookPayload
			if err := json.Unmarshal([]byte(result[1]), &payload); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal webhook payload")
				continue
			}
			w.deliverWebhook(ctx, payload)
		}
	}
}

func (w *Worker) deliverWebhook(ctx context.Context, payload models.WebhookPayload) {
	paymentID, err := uuid.Parse(payload.PaymentID)
	if err != nil {
		return
	}
	payment, err := w.repo.GetPaymentByID(ctx, paymentID)
	if err != nil || payment == nil {
		return
	}
	merchant, err := w.repo.GetMerchantByID(ctx, payment.MerchantID)
	if err != nil || merchant == nil || merchant.WebhookURL == "" {
		return
	}

	payloadBytes, _ := json.Marshal(payload)
	signature := utils.ComputeWebhookSignature(merchant.WebhookSecret, payloadBytes)

	req, err := http.NewRequestWithContext(ctx, "POST", merchant.WebhookURL, bytes.NewReader(payloadBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Signature", signature)
	req.Header.Set("X-Webhook-Timestamp", fmt.Sprintf("%d", payload.Timestamp))
	req.Header.Set("User-Agent", "UPay-Gateway/1.0")

	resp, err := w.client.Do(req)
	success := false
	responseCode := 0
	responseBody := ""

	if err != nil {
		responseBody = err.Error()
	} else {
		responseCode = resp.StatusCode
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		resp.Body.Close()
		responseBody = string(body)
		success = resp.StatusCode >= 200 && resp.StatusCode < 300
	}

	if !success {
		nextRetry := time.Now().Add(2 * time.Minute)
		w.repo.CreateWebhookDelivery(ctx, &models.WebhookDelivery{
			ID: utils.NewID(), PaymentID: payment.ID, MerchantID: merchant.ID,
			URL: merchant.WebhookURL, Payload: string(payloadBytes),
			ResponseCode: responseCode, ResponseBody: responseBody,
			Attempt: 1, Success: false, NextRetryAt: &nextRetry, CreatedAt: time.Now(),
		})
		log.Warn().Str("payment_id", payload.PaymentID).Int("status", responseCode).Msg("Webhook delivery failed")
	} else {
		w.repo.CreateWebhookDelivery(ctx, &models.WebhookDelivery{
			ID: utils.NewID(), PaymentID: payment.ID, MerchantID: merchant.ID,
			URL: merchant.WebhookURL, Payload: string(payloadBytes),
			ResponseCode: responseCode, ResponseBody: responseBody,
			Attempt: 1, Success: true, CreatedAt: time.Now(),
		})
		log.Info().Str("payment_id", payload.PaymentID).Msg("Webhook delivered")
	}
}

func (w *Worker) webhookRetryWorker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Webhook retry worker stopped")
			return
		case <-ticker.C:
			deliveries, err := w.repo.GetPendingWebhookRetries(ctx)
			if err != nil {
				log.Error().Err(err).Msg("Error fetching webhook retries")
				continue
			}
			for _, d := range deliveries {
				nextAttempt := d.Attempt + 1
				if nextAttempt > 5 {
					log.Warn().Str("delivery_id", d.ID.String()).Msg("Webhook max retries reached, giving up")
					continue
				}
				backoff := time.Duration(1<<uint(nextAttempt)) * time.Minute
				nextRetry := time.Now().Add(backoff)
				w.repo.UpdateWebhookDelivery(ctx, d.ID, d.ResponseCode, d.ResponseBody, false, &nextRetry)
				w.redis.LPush(ctx, "webhook:queue", d.Payload)
			}
			if len(deliveries) > 0 {
				log.Info().Int("count", len(deliveries)).Msg("Re-queued webhook retries")
			}
		}
	}
}

func (w *Worker) subscriptionExpiryWorker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Subscription expiry worker stopped")
			return
		case <-ticker.C:
			expired, err := w.repo.ExpireSubscriptions(ctx)
			if err != nil {
				log.Error().Err(err).Msg("Error expiring subscriptions")
				continue
			}
			if expired > 0 {
				log.Info().Int64("count", expired).Msg("Expired subscriptions")
			}
		}
	}
}

func (w *Worker) subscriptionReminderWorker(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Subscription reminder worker stopped")
			return
		case <-ticker.C:
			for _, days := range []int{3, 7, 14} {
				subs, err := w.repo.GetSubscriptionsExpiringInDays(ctx, days)
				if err != nil {
					log.Error().Err(err).Msg("Error fetching expiring subscriptions")
					continue
				}
				for _, sub := range subs {
					merchant, err := w.repo.GetMerchantByID(ctx, sub.MerchantID)
					if err != nil || merchant == nil {
						continue
					}
					planName := "Pro"
					if sub.PlanID != (uuid.UUID{}) {
						planName = "Subscribed Plan"
					}
					go w.email.SendExpiryReminder(merchant.Email, planName, days)
					log.Info().Str("merchant", merchant.Email).Int("days", days).Msg("Sent expiry reminder")
				}
			}
		}
	}
}
