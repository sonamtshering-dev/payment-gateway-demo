package services

import (
	"encoding/base64"
	"fmt"
	"net/smtp"
	"os"
)

type EmailService struct {
	user     string
	password string
	from     string
}

func NewEmailService() *EmailService {
	user := os.Getenv("GMAIL_USER")
	return &EmailService{
		user:     user,
		password: os.Getenv("GMAIL_APP_PASSWORD"),
		from:     user,
	}
}

func (e *EmailService) Send(to, subject, html string) error {
	if e.user == "" || e.password == "" {
		fmt.Printf("[EMAIL SKIPPED] To: %s | Subject: %s\n", to, subject)
		return nil
	}
	auth := smtp.PlainAuth("", e.user, e.password, "smtp.gmail.com")
	encSubject := "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(subject)) + "?="
	msg := fmt.Sprintf("From: NovaPay <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s", e.from, to, encSubject, html)
	return smtp.SendMail("smtp.gmail.com:587", auth, e.from, []string{to}, []byte(msg))
}

func emailLayout(badgeText, badgeBg, badgeColor, title, body, btnText, btnURL, footerNote string) string {
	return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#e8eaf0;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif">` +
		`<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">` +
		`<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff">` +
		`<tr><td style="background:#020817;padding:28px 40px;border-bottom:3px solid #1d4ed8">` +
		`<table cellpadding="0" cellspacing="0"><tr>` +
		`<td style="width:40px;height:40px;background:#1d4ed8;border-radius:10px;text-align:center;vertical-align:middle;color:#fff;font-weight:800;font-size:18px">N</td>` +
		`<td style="padding-left:12px;color:#dbeafe;font-size:20px;font-weight:800">NovaPay</td>` +
		`</tr></table></td></tr>` +
		`<tr><td style="padding:40px 40px 0">` +
		`<div style="display:inline-block;background:` + badgeBg + `;color:` + badgeColor + `;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:20px">` + badgeText + `</div>` +
		title +
		`</td></tr>` +
		`<tr><td style="padding:0 40px 40px">` + body +
		`<a href="` + btnURL + `" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">` + btnText + `</a>` +
		`</td></tr>` +
		`<tr><td style="border-top:1px solid #e2e8f0;padding:24px 40px;background:#f8fafc">` +
		`<table width="100%"><tr><td style="font-size:14px;font-weight:700;color:#0f172a">NovaPay</td>` +
		`<td align="right"><a href="#" style="font-size:12px;color:#94a3b8;text-decoration:none;margin-left:16px">Unsubscribe</a>` +
		`<a href="#" style="font-size:12px;color:#94a3b8;text-decoration:none;margin-left:16px">Help</a></td></tr></table>` +
		`<div style="font-size:12px;color:#cbd5e1;margin-top:12px;line-height:1.5">nova-pay.in &middot; ` + footerNote + `</div>` +
		`</td></tr></table></td></tr></table></body></html>`
}

func emailCard(rows string) string {
	return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;overflow:hidden">` + rows + `</table>`
}

func emailRow(label, value, valueColor string) string {
	if valueColor == "" {
		valueColor = "#0f172a"
	}
	return `<tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0"><table width="100%"><tr>` +
		`<td style="font-size:13px;color:#94a3b8;font-weight:500">` + label + `</td>` +
		`<td align="right" style="font-size:13px;color:` + valueColor + `;font-weight:600">` + value + `</td>` +
		`</tr></table></td></tr>`
}

func emailFeature(text string) string {
	return `<li style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">` +
		`<span style="width:20px;height:20px;background:#f0fdf4;border-radius:50%;border:1px solid #bbf7d0;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:#16a34a">&#10003;</span>` +
		text + `</li>`
}

func (e *EmailService) SendWelcome(name, email, referralCode string) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	title := fmt.Sprintf(`<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">Welcome to NovaPay,<br>%s!</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">Your merchant account is ready. Start accepting UPI payments from customers across India with zero transaction fees.</p>`, name)
	features := `<ul style="list-style:none;margin:0 0 28px;padding:0">` +
		emailFeature("Accept UPI, QR codes and payment links") +
		emailFeature("Real-time payment notifications via email") +
		emailFeature("Detailed analytics and transaction history") +
		emailFeature("Webhook integrations and REST API access") +
		`</ul>`
	refBox := ""
	if referralCode != "" {
		refBox = fmt.Sprintf(`<div style="background:#020817;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;border:1px solid #1e3a5f"><div style="color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Your referral code</div><div style="color:#60a5fa;font-size:32px;font-weight:800;letter-spacing:6px;font-family:monospace;margin:10px 0">%s</div><div style="color:rgba(255,255,255,0.35);font-size:13px">Share with merchants &amp; earn 20%% off your next subscription</div></div>`, referralCode)
	}
	return e.Send(email, "Welcome to NovaPay — Your account is ready!", emailLayout(
		"&#10003; Account activated", "#f0fdf4", "#15803d",
		title, features+refBox,
		"Go to Dashboard →", appURL+"/dashboard",
		"You are receiving this because you created a NovaPay merchant account.",
	))
}

func (e *EmailService) SendPaymentConfirmation(email, orderId string, amount int64) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	amt := float64(amount) / 100
	title := `<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">You received a payment!</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">A UPI payment has been successfully confirmed on your NovaPay account.</p>`
	amtBox := fmt.Sprintf(`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px"><div style="font-size:13px;color:#15803d;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Amount received</div><div style="font-size:36px;font-weight:800;color:#0f172a;letter-spacing:-1px">&#8377;%.2f</div></div>`, amt)
	rows := emailRow("Order ID", orderId, "#0f172a") +
		emailRow("Payment method", "UPI", "") +
		emailRow("Status", "Paid", "#16a34a")
	return e.Send(email, fmt.Sprintf("Payment of ₹%.2f received — NovaPay", amt), emailLayout(
		"&#10003; Payment confirmed", "#eff6ff", "#1d4ed8",
		title, amtBox+emailCard(rows),
		"View Transaction →", appURL+"/dashboard/transactions",
		"Automated payment notification.",
	))
}

func (e *EmailService) SendKYCApproved(email, name string) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	title := fmt.Sprintf(`<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">KYC approved,<br>%s!</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">Your identity documents have been reviewed and approved. Your account is now fully activated.</p>`, name)
	rows := emailRow("Verification status", "Approved", "#16a34a") +
		emailRow("Account type", "Merchant", "")
	features := `<ul style="list-style:none;margin:0 0 28px;padding:0">` +
		emailFeature("Identity verified and approved") +
		emailFeature("Full gateway access unlocked") +
		emailFeature("Ready to accept payments from customers") +
		`</ul>`
	return e.Send(email, "KYC Approved — NovaPay", emailLayout(
		"&#10003; Identity verified", "#f0fdf4", "#15803d",
		title, emailCard(rows)+features,
		"Start Accepting Payments →", appURL+"/dashboard",
		"KYC verification confirmation.",
	))
}

func (e *EmailService) SendKYCRejected(email, name, reason string) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	title := fmt.Sprintf(`<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">KYC needs attention</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">Hi %s, your KYC submission was not approved. Please review the reason below and resubmit.</p>`, name)
	warnBox := fmt.Sprintf(`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:18px 20px;margin-bottom:28px"><div style="font-size:14px;font-weight:700;color:#b91c1c;margin-bottom:6px">Rejection reason</div><div style="font-size:13px;color:#dc2626;line-height:1.5">%s</div></div>`, reason)
	return e.Send(email, "KYC Update Required — NovaPay", emailLayout(
		"&#10007; Action required", "#fef2f2", "#b91c1c",
		title, warnBox,
		"Resubmit KYC →", appURL+"/dashboard/kyc",
		"KYC verification update.",
	))
}

func (e *EmailService) SendSubscriptionActivated(email, planName string) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	title := fmt.Sprintf(`<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">Your %s plan<br>is now active!</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">Your gateway is fully unlocked. Create unlimited payment links, QR codes, and access the full API.</p>`, planName)
	rows := emailRow("Plan", planName, "#6d28d9") +
		emailRow("API calls / day", "Unlimited", "#16a34a") +
		emailRow("Payment links", "Unlimited", "#16a34a")
	return e.Send(email, "Subscription Active — NovaPay", emailLayout(
		"&#128640; Subscription activated", "#f5f3ff", "#6d28d9",
		title, emailCard(rows),
		"Go to Dashboard →", appURL+"/dashboard",
		"Subscription confirmation.",
	))
}

func (e *EmailService) SendExpiryReminder(email, planName string, daysLeft int) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	title := fmt.Sprintf(`<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">Your subscription<br>expires in %d days</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">Your %s plan is expiring soon. Renew now to ensure your customers can continue making payments.</p>`, daysLeft, planName)
	warnBox := `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 20px;margin-bottom:28px"><div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:6px">What happens if you don't renew?</div><div style="font-size:13px;color:#b45309;line-height:1.5">Your payment links, QR codes, and API access will stop working. Customers will be unable to complete payments.</div></div>`
	return e.Send(email, fmt.Sprintf("Your subscription expires in %d days — NovaPay", daysLeft), emailLayout(
		"&#9888; Action required", "#fffbeb", "#b45309",
		title, warnBox,
		"Renew Subscription →", appURL+"/dashboard/subscription",
		"Subscription expiry reminder.",
	))
}
func (e *EmailService) SendMonthlyStatement(email, name, month string, totalSales, totalCost, totalProfit float64, totalTransactions int) error {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://nova-pay.in"
	}
	title := fmt.Sprintf(`<h1 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">Monthly Statement</h1><p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 32px">Hi %s, here is your NovaPay statement for %s.</p>`, name, month)
	rows := emailRow("Total Sales", fmt.Sprintf("₹%.2f", totalSales), "#0f172a") +
		emailRow("Total Cost", fmt.Sprintf("₹%.2f", totalCost), "#dc2626") +
		emailRow("Total Profit", fmt.Sprintf("₹%.2f", totalProfit), "#16a34a") +
		emailRow("Transactions", fmt.Sprintf("%d", totalTransactions), "#1d4ed8")
	return e.Send(email, fmt.Sprintf("NovaPay Statement — %s", month), emailLayout(
		"Monthly Statement", "#f0fdf4", "#15803d",
		title, emailCard(rows),
		"View Dashboard →", appURL+"/dashboard/profit",
		"Monthly statement for your NovaPay account.",
	))
}
