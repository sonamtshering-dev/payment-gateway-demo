package middleware

import (
	"sync"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// METRICS COLLECTOR (lightweight, no Prometheus dependency)
// Can be swapped for prometheus/client_golang when ready
// ============================================================================

// Metrics holds application-level counters and histograms.
// Thread-safe via atomic operations. Export to Prometheus, Datadog, etc.
type Metrics struct {
	mu                   sync.Mutex
	httpRequestsTotal    map[string]int64
	httpRequestDuration  map[string][]float64
	paymentCreated       int64
	paymentVerified      int64
	paymentExpired       int64
	webhookSent          int64
	webhookFailed        int64
	fraudAlertsCreated   int64
}

var AppMetrics = &Metrics{
	httpRequestsTotal:   make(map[string]int64),
	httpRequestDuration: make(map[string][]float64),
}

// MetricsCollector middleware records request count and latency per endpoint.
func MetricsCollector() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())
		method := c.Request.Method
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		key := method + " " + path + " " + status
		AppMetrics.mu.Lock()
		AppMetrics.httpRequestsTotal[key]++
		durations := AppMetrics.httpRequestDuration[path]
		if len(durations) > 1000 {
			durations = durations[len(durations)-1000:]
		}
		AppMetrics.httpRequestDuration[path] = append(durations, duration)
		AppMetrics.mu.Unlock()
	}
}

// MetricsEndpoint exposes /metrics in a simple JSON format.
// Replace with promhttp.Handler() when using the Prometheus client library.
func MetricsEndpoint() gin.HandlerFunc {
	return func(c *gin.Context) {
		AppMetrics.mu.Lock()
		defer AppMetrics.mu.Unlock()
		c.JSON(200, gin.H{
			"http_requests_total":  AppMetrics.httpRequestsTotal,
			"payments_created":     AppMetrics.paymentCreated,
			"payments_verified":    AppMetrics.paymentVerified,
			"payments_expired":     AppMetrics.paymentExpired,
			"webhooks_sent":        AppMetrics.webhookSent,
			"webhooks_failed":      AppMetrics.webhookFailed,
			"fraud_alerts_created": AppMetrics.fraudAlertsCreated,
		})
	}
}

// Counter helpers (call from service layer)
func IncrPaymentCreated()    { AppMetrics.mu.Lock(); AppMetrics.paymentCreated++; AppMetrics.mu.Unlock() }
func IncrPaymentVerified()   { AppMetrics.mu.Lock(); AppMetrics.paymentVerified++; AppMetrics.mu.Unlock() }
func IncrPaymentExpired()    { AppMetrics.mu.Lock(); AppMetrics.paymentExpired++; AppMetrics.mu.Unlock() }
func IncrWebhookSent()       { AppMetrics.mu.Lock(); AppMetrics.webhookSent++; AppMetrics.mu.Unlock() }
func IncrWebhookFailed()     { AppMetrics.mu.Lock(); AppMetrics.webhookFailed++; AppMetrics.mu.Unlock() }
func IncrFraudAlertCreated() { AppMetrics.mu.Lock(); AppMetrics.fraudAlertsCreated++; AppMetrics.mu.Unlock() }
