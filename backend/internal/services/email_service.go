package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type EmailService struct {
	apiKey string
	from   string
}

func NewEmailService() *EmailService {
	return &EmailService{
		apiKey: os.Getenv("RESEND_API_KEY"),
		from:   os.Getenv("RESEND_FROM_EMAIL"),
	}
}

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
}

func (e *EmailService) Send(to, subject, html string) error {
	if e.apiKey == "" || e.from == "" {
		fmt.Printf("[EMAIL SKIPPED] To: %s | Subject: %s\n", to, subject)
		return nil
	}
	payload := resendPayload{From: e.from, To: []string{to}, Subject: subject, Html: html}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+e.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil { return err }
	defer resp.Body.Close()
	if resp.StatusCode >= 400 { return fmt.Errorf("resend error: %d", resp.StatusCode) }
	return nil
}

func (e *EmailService) SendWelcome(name, email, referralCode string) error {
	html := fmt.Sprintf(`
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#020817;color:#dbeafe;padding:40px;border-radius:16px">
  <h1 style="font-size:28px;font-weight:800;margin-bottom:8px">Welcome to NovaPay, %s! 🎉</h1>
  <p style="color:rgba(255,255,255,0.5);margin-bottom:24px">Your merchant account is ready. Accept UPI payments at 0%% transaction fee.</p>
  <a href="%s/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;text-decoration:none">Go to Dashboard →</a>
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:32px 0">
  <p style="color:rgba(255,255,255,0.4);font-size:13px">Your referral code: <strong style="color:#60a5fa">%s</strong> — Share it to earn 20%% discount rewards!</p>
</div>`, name, os.Getenv("APP_URL"), referralCode)
	return e.Send(email, "Welcome to NovaPay — Your account is ready!", html)
}

func (e *EmailService) SendPaymentConfirmation(email, orderId string, amount int64) error {
	html := fmt.Sprintf(`
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#020817;color:#dbeafe;padding:40px;border-radius:16px">
  <h1 style="font-size:24px;font-weight:800;color:#3b82f6;margin-bottom:8px">Payment Received ✅</h1>
  <p style="color:rgba(255,255,255,0.5);margin-bottom:24px">A payment has been confirmed on your NovaPay account.</p>
  <div style="background:#0f1d35;border-radius:12px;padding:20px;margin-bottom:24px">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:rgba(255,255,255,0.4)">Order ID</span><strong>%s</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:rgba(255,255,255,0.4)">Amount</span><strong style="color:#3b82f6">₹%.2f</strong></div>
  </div>
  <a href="%s/dashboard/transactions" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none">View Transaction →</a>
</div>`, orderId, float64(amount)/100, os.Getenv("APP_URL"))
	return e.Send(email, fmt.Sprintf("Payment of ₹%.2f received — NovaPay", float64(amount)/100), html)
}

func (e *EmailService) SendSubscriptionActivated(email, planName string) error {
	html := fmt.Sprintf(`
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#020817;color:#dbeafe;padding:40px;border-radius:16px">
  <h1 style="font-size:24px;font-weight:800;color:#3b82f6;margin-bottom:8px">Subscription Activated 🚀</h1>
  <p style="color:rgba(255,255,255,0.5);margin-bottom:24px">Your <strong>%s</strong> plan is now active. Your gateway is ready to accept payments.</p>
  <a href="%s/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none">Go to Dashboard →</a>
</div>`, planName, os.Getenv("APP_URL"))
	return e.Send(email, "Your NovaPay subscription is active!", html)
}

func (e *EmailService) SendExpiryReminder(email, planName string, daysLeft int) error {
	html := fmt.Sprintf(`
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#020817;color:#dbeafe;padding:40px;border-radius:16px">
  <h1 style="font-size:24px;font-weight:800;color:#f59e0b;margin-bottom:8px">Subscription Expiring Soon ⚠️</h1>
  <p style="color:rgba(255,255,255,0.5);margin-bottom:24px">Your <strong>%s</strong> plan expires in <strong>%d days</strong>. Renew now to keep your gateway active.</p>
  <a href="%s/dashboard/subscription" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none">Renew Subscription →</a>
</div>`, planName, daysLeft, os.Getenv("APP_URL"))
	return e.Send(email, fmt.Sprintf("Your NovaPay subscription expires in %d days", daysLeft), html)
}
