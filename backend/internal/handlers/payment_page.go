package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GET /pay/:payment_id
// Serves a hosted payment confirmation page that customers see.
// Shows QR code, UPI deep link button, and polls for payment status.
func (h *Handler) PaymentPage(c *gin.Context) {
	paymentIDStr := c.Param("payment_id")
	paymentID, err := uuid.Parse(paymentIDStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid payment link")
		return
	}

	status, err := h.service.GetPaymentStatus(c.Request.Context(), paymentID)
	if err != nil {
		c.String(http.StatusNotFound, "Payment not found")
		return
	}

	// Fetch QR code data (stored in DB)
	payment, err := h.service.GetPaymentByIDFull(c.Request.Context(), paymentID)
	if err != nil || payment == nil {
		c.String(http.StatusNotFound, "Payment not found")
		return
	}

	amountRupees := fmt.Sprintf("%.2f", float64(status.Amount)/100.0)

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Cache-Control", "no-store")

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pay ₹%s — UPay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:20px;padding:36px 32px;max-width:420px;width:100%%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:24px}
.logo-icon{width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px}
.logo-text{font-size:20px;font-weight:700;color:#111827}
.logo-badge{font-size:9px;font-weight:700;color:#6366f1;background:#eef2ff;padding:2px 6px;border-radius:4px;margin-left:4px}
.amount{font-size:36px;font-weight:700;color:#111827;margin:8px 0}
.order-id{font-size:14px;color:#6b7280;margin-bottom:24px}
.qr-container{background:#f9fafb;border-radius:16px;padding:20px;margin:20px 0;display:inline-block}
.qr-container img{width:220px;height:220px;border-radius:8px}
.upi-btn{display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:600;margin:20px 0;transition:transform 0.15s,box-shadow 0.15s}
.upi-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,0.4)}
.status{padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;margin-top:16px}
.status-pending{background:#fffbeb;color:#b45309}
.status-paid{background:#ecfdf5;color:#059669}
.status-failed{background:#fef2f2;color:#dc2626}
.status-expired{background:#f3f4f6;color:#6b7280}
.timer{font-size:13px;color:#9ca3af;margin-top:12px}
.secure{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:20px;font-size:12px;color:#9ca3af}
.secure svg{width:14px;height:14px}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">U</div>
    <span class="logo-text">UPay</span>
    <span class="logo-badge">GATEWAY</span>
  </div>

  <div class="amount">₹%s</div>
  <div class="order-id">Order: %s</div>

  <div id="payment-content">
    <div class="qr-container">
      <img src="data:image/png;base64,%s" alt="Scan to pay with UPI" />
    </div>
    <p style="font-size:13px;color:#6b7280;margin:8px 0 16px">Scan QR code with any UPI app</p>

    <a href="%s" class="upi-btn">
      Open UPI App to Pay
    </a>
  </div>

  <div id="status-bar" class="status status-pending">
    <span class="spinner"></span> Waiting for payment...
  </div>

  <div id="timer" class="timer"></div>

  <div class="secure">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
    Secured by UPay Gateway
  </div>
</div>

<script>
const paymentId = "%s";
const expiresAt = new Date("%s");
let pollInterval;

function updateTimer() {
  const now = new Date();
  const diff = expiresAt - now;
  if (diff <= 0) {
    document.getElementById('timer').textContent = 'Payment session expired';
    document.getElementById('status-bar').className = 'status status-expired';
    document.getElementById('status-bar').innerHTML = 'Session expired';
    document.getElementById('payment-content').style.opacity = '0.4';
    document.getElementById('payment-content').style.pointerEvents = 'none';
    clearInterval(pollInterval);
    return;
  }
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff %% 60000) / 1000);
  document.getElementById('timer').textContent = 'Expires in ' + mins + ':' + String(secs).padStart(2, '0');
}

async function pollStatus() {
  try {
    const resp = await fetch('/api/v1/payments/status/' + paymentId);
    const data = await resp.json();
    if (data.success && data.data) {
      const status = data.data.status;
      const bar = document.getElementById('status-bar');

      if (status === 'paid') {
        bar.className = 'status status-paid';
        bar.innerHTML = '&#10003; Payment successful!';
        document.getElementById('timer').textContent = '';
        clearInterval(pollInterval);
      } else if (status === 'failed') {
        bar.className = 'status status-failed';
        bar.innerHTML = '&#10007; Payment failed';
        clearInterval(pollInterval);
      } else if (status === 'expired') {
        bar.className = 'status status-expired';
        bar.innerHTML = 'Session expired';
        document.getElementById('payment-content').style.opacity = '0.4';
        document.getElementById('payment-content').style.pointerEvents = 'none';
        clearInterval(pollInterval);
      }
    }
  } catch (e) { /* retry on next tick */ }
}

updateTimer();
setInterval(updateTimer, 1000);
pollInterval = setInterval(pollStatus, 4000);
pollStatus();
</script>
</body>
</html>`,
		amountRupees,
		amountRupees,
		status.OrderID,
		payment.QRCodeData,
		payment.UPIIntentLink,
		paymentIDStr,
		status.ExpiresAt.Format("2006-01-02T15:04:05Z"),
	)

	c.String(http.StatusOK, html)
}
