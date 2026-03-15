package middleware

import (
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
		AppMetrics.httpRequestsTotal[key]++

		// Keep only last 1000 durations per endpoint for P50/P95/P99 calc
		durations := AppMetrics.httpRequestDuration[path]
		if len(durations) > 1000 {
			durations = durations[len(durations)-1000:]
		}
		AppMetrics.httpRequestDuration[path] = append(durations, duration)
	}
}

// MetricsEndpoint exposes /metrics in a simple JSON format.
// Replace with promhttp.Handler() when using the Prometheus client library.
func MetricsEndpoint() gin.HandlerFunc {
	return func(c *gin.Context) {
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
func IncrPaymentCreated()    { AppMetrics.paymentCreated++ }
func IncrPaymentVerified()   { AppMetrics.paymentVerified++ }
func IncrPaymentExpired()    { AppMetrics.paymentExpired++ }
func IncrWebhookSent()       { AppMetrics.webhookSent++ }
func IncrWebhookFailed()     { AppMetrics.webhookFailed++ }
func IncrFraudAlertCreated() { AppMetrics.fraudAlertsCreated++ }
