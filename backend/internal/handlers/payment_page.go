package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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
<title>Pay ₹%s — NovaPay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --brand:#0f172a;
  --accent:#6366f1;
  --accent-light:#eef2ff;
  --success:#059669;
  --success-bg:#ecfdf5;
  --error:#dc2626;
  --error-bg:#fef2f2;
  --warning:#b45309;
  --warning-bg:#fffbeb;
  --gray:#6b7280;
  --gray-light:#f9fafb;
  --border:#e5e7eb;
}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:linear-gradient(135deg,#0f172a 0%%,#1e293b 50%%,#0f172a 100%%);
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}
.card{
  background:#fff;
  border-radius:24px;
  padding:0;
  max-width:400px;
  width:100%%;
  text-align:center;
  box-shadow:0 24px 64px rgba(0,0,0,0.3);
  overflow:hidden;
}
.card-header{
  background:linear-gradient(135deg,#0f172a,#1e293b);
  padding:24px 28px 20px;
  color:#fff;
}
.logo{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  margin-bottom:20px;
}
.logo-icon{
  width:36px;height:36px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:16px;color:#fff;
  letter-spacing:-1px;
}
.logo-name{font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px}
.logo-tag{
  font-size:9px;font-weight:700;
  color:#818cf8;
  background:rgba(99,102,241,0.2);
  padding:2px 7px;border-radius:4px;
  letter-spacing:1px;
}
.merchant-name{font-size:13px;color:#94a3b8;margin-bottom:4px}
.amount-display{font-size:42px;font-weight:800;color:#fff;letter-spacing:-1px;line-height:1}
.amount-display span{font-size:24px;font-weight:500;vertical-align:super;margin-right:2px}
.order-ref{font-size:12px;color:#64748b;margin-top:6px}

.card-body{padding:24px 28px}

.qr-wrap{
  position:relative;
  display:inline-block;
  margin-bottom:20px;
}
.qr-frame{
  background:#fff;
  border:3px solid var(--border);
  border-radius:16px;
  padding:12px;
  display:inline-block;
  position:relative;
}
.qr-frame img{
  width:200px;height:200px;
  border-radius:8px;
  display:block;
}
.qr-overlay{
  position:absolute;inset:0;
  background:rgba(255,255,255,0.95);
  border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:8px;
  opacity:0;
  transition:opacity 0.3s;
}
.qr-overlay.show{opacity:1}
.qr-hint{font-size:12px;color:var(--gray);margin-top:4px}

.divider{
  display:flex;align-items:center;gap:12px;
  margin:16px 0;color:var(--gray);font-size:12px;
}
.divider::before,.divider::after{
  content:'';flex:1;height:1px;background:var(--border);
}

.upi-apps{
  display:grid;grid-template-columns:repeat(3,1fr);gap:10px;
  margin-bottom:16px;
}
.upi-app{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  padding:12px 8px;
  border:1.5px solid var(--border);
  border-radius:12px;
  text-decoration:none;
  font-size:11px;font-weight:600;color:var(--brand);
  transition:all 0.15s;
  cursor:pointer;
}
.upi-app:hover{border-color:var(--accent);background:var(--accent-light);color:var(--accent)}
.upi-app .app-icon{
  width:36px;height:36px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:800;
}
.gpay{background:#fff;border:1px solid #e5e7eb}
.gpay-text{background:linear-gradient(90deg,#4285f4,#34a853,#fbbc04,#ea4335);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  font-size:14px;font-weight:800;}
.phonepe .app-icon{background:#5f259f;color:#fff}
.paytm .app-icon{background:#00baf2;color:#fff}

.pay-btn{
  display:block;width:100%%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;text-decoration:none;
  padding:15px;border-radius:12px;
  font-size:16px;font-weight:700;
  transition:all 0.15s;
  border:none;cursor:pointer;
  margin-bottom:16px;
}
.pay-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(99,102,241,0.4)}

.status-bar{
  padding:12px 16px;
  border-radius:12px;
  font-size:13px;font-weight:600;
  display:flex;align-items:center;justify-content:center;gap:8px;
  margin-bottom:12px;
}
.pending{background:var(--warning-bg);color:var(--warning)}
.paid{background:var(--success-bg);color:var(--success)}
.failed{background:var(--error-bg);color:var(--error)}
.expired{background:#f3f4f6;color:var(--gray)}

.timer-bar{
  background:var(--gray-light);
  border-radius:8px;
  height:4px;
  overflow:hidden;
  margin-bottom:8px;
}
.timer-fill{
  height:100%%;
  background:linear-gradient(90deg,#6366f1,#8b5cf6);
  transition:width 1s linear;
  border-radius:8px;
}
.timer-text{font-size:12px;color:var(--gray);margin-bottom:16px}

.secure{
  display:flex;align-items:center;justify-content:center;
  gap:5px;font-size:11px;color:#9ca3af;
  padding-top:12px;
  border-top:1px solid var(--border);
}

@keyframes spin{to{transform:rotate(360deg)}}
.spinner{
  width:16px;height:16px;
  border:2px solid rgba(180,83,9,0.2);
  border-top-color:var(--warning);
  border-radius:50%%;
  animation:spin 0.8s linear infinite;
  flex-shrink:0;
}
.spinner-paid{border-color:rgba(5,150,105,0.2);border-top-color:var(--success)}

@keyframes qr-pulse{
  0%%,100%%{opacity:1;transform:scale(1)}
  50%%{opacity:0.85;transform:scale(0.99)}
}
.qr-frame{animation:qr-pulse 2s ease-in-out infinite}
.qr-frame.loaded{animation:none}

@keyframes success-pop{
  0%%{transform:scale(0.8);opacity:0}
  60%%{transform:scale(1.1)}
  100%%{transform:scale(1);opacity:1}
}
.success-icon{
  font-size:48px;
  animation:success-pop 0.5s ease forwards;
  display:none;
}
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <div class="logo">
      <div class="logo-icon">N</div>
      <span class="logo-name">NovaPay</span>
      <span class="logo-tag">GATEWAY</span>
    </div>
    <div class="merchant-name">Payment Request</div>
    <div class="amount-display"><span>₹</span>%s</div>
    <div class="order-ref">Order #%s</div>
  </div>

  <div class="card-body">

    <div id="payment-content">
      <div class="qr-wrap">
        <div class="qr-frame" id="qr-frame">
          <img src="%s" alt="Scan to pay" id="qr-img" onload="document.getElementById('qr-frame').classList.add('loaded')" />
        </div>
      </div>
      <div class="qr-hint">Scan with any UPI app to pay</div>

      <div class="divider">or pay directly</div>

      <div class="upi-apps">
        <a href="%s&amp;app=gpay" class="upi-app">
          <div class="app-icon gpay"><span class="gpay-text">G</span></div>
          GPay
        </a>
        <a href="%s&amp;app=phonepe" class="upi-app phonepe">
          <div class="app-icon"><span style="color:#fff;font-size:13px;font-weight:800">Pe</span></div>
          PhonePe
        </a>
        <a href="%s&amp;app=paytm" class="upi-app paytm">
          <div class="app-icon"><span style="color:#fff;font-size:11px;font-weight:800">Pay</span></div>
          Paytm
        </a>
      </div>

      <a href="%s" class="pay-btn">Open UPI App</a>
    </div>

    <div class="success-icon" id="success-icon">✅</div>

    <div class="timer-bar" id="timer-bar">
      <div class="timer-fill" id="timer-fill" style="width:100%%"></div>
    </div>
    <div class="timer-text" id="timer-text">Calculating...</div>

    <div class="status-bar pending" id="status-bar">
      <div class="spinner" id="spinner"></div>
      <span id="status-text">Waiting for payment...</span>
    </div>

    <div class="secure">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
      256-bit encrypted · Secured by NovaPay
    </div>
  </div>
</div>

<script>
const paymentId = "%s";
const expiresAt = new Date("%s");
const totalDuration = expiresAt - new Date("%s");
let pollInterval;
let paid = false;

function updateTimer() {
  const now = new Date();
  const diff = expiresAt - now;
  if (diff <= 0) {
    document.getElementById('timer-text').textContent = 'Session expired';
    document.getElementById('timer-fill').style.width = '0%%';
    if (!paid) {
      document.getElementById('status-bar').className = 'status-bar expired';
      document.getElementById('status-text').textContent = 'Payment session expired';
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('payment-content').style.opacity = '0.4';
      document.getElementById('payment-content').style.pointerEvents = 'none';
      clearInterval(pollInterval);
    }
    return;
  }
  const pct = Math.max(0, (diff / totalDuration) * 100);
  document.getElementById('timer-fill').style.width = pct + '%%';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff %% 60000) / 1000);
  document.getElementById('timer-text').textContent = 'Expires in ' + mins + ':' + String(secs).padStart(2,'0');
  if (pct < 20) {
    document.getElementById('timer-fill').style.background = '#ef4444';
  }
}

async function pollStatus() {
  try {
    const resp = await fetch('/api/v1/public/payment/' + paymentId);
    const data = await resp.json();
    if (data.success && data.data) {
      const s = data.data.status;
      const bar = document.getElementById('status-bar');
      const txt = document.getElementById('status-text');
      const spin = document.getElementById('spinner');
      if (s === 'paid') {
        paid = true;
        clearInterval(pollInterval);
        bar.className = 'status-bar paid';
        spin.className = 'spinner spinner-paid';
        txt.textContent = 'Payment successful!';
        document.getElementById('timer-text').textContent = '';
        document.getElementById('timer-bar').style.display = 'none';
        document.getElementById('payment-content').style.display = 'none';
        document.getElementById('success-icon').style.display = 'block';
        setTimeout(() => {
          txt.textContent = 'Redirecting...';
          if (data.data.redirect_url) { window.location.href = data.data.redirect_url + "?order_id=" + data.data.order_id + "&status=paid"; }
        }, 2000);
      } else if (s === 'failed') {
        clearInterval(pollInterval);
        bar.className = 'status-bar failed';
        spin.style.display = 'none';
        txt.textContent = 'Payment failed. Please try again.';
      }
    }
  } catch(e) {}
}

updateTimer();
setInterval(updateTimer, 1000);
pollInterval = setInterval(pollStatus, 3000);
pollStatus();
</script>
</body>
</html>`,
		amountRupees,
		amountRupees,
		status.OrderID,
		payment.QRCodeData,
		payment.UPIIntentLink,
		payment.UPIIntentLink,
		payment.UPIIntentLink,
		payment.UPIIntentLink,
		paymentIDStr,
		status.ExpiresAt.Format("2006-01-02T15:04:05Z"),
		status.CreatedAt.Format("2006-01-02T15:04:05Z"),
	)

	c.String(http.StatusOK, html)
}
