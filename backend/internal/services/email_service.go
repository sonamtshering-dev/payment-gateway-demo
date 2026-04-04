package services

import (
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
	msg := fmt.Sprintf("From: NovaPay <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s", e.from, to, subject, html)
	return smtp.SendMail("smtp.gmail.com:587", auth, e.from, []string{to}, []byte(msg))
}

func (e *EmailService) SendWelcome(name, email, referralCode string) error {
	return e.Send(email, "Welcome to NovaPay!", fmt.Sprintf("<h1>Welcome %s!</h1><p>Referral code: %s</p><a href=\'%s/dashboard\'>Dashboard</a>", name, referralCode, os.Getenv("APP_URL")))
}

func (e *EmailService) SendPaymentConfirmation(email, orderId string, amount int64) error {
	return e.Send(email, fmt.Sprintf("Payment of Rs%.2f received", float64(amount)/100), fmt.Sprintf("<h1>Payment Received!</h1><p>Order: %s</p><p>Amount: Rs%.2f</p>", orderId, float64(amount)/100))
}

func (e *EmailService) SendKYCApproved(email, name string) error {
	return e.Send(email, "KYC Approved - NovaPay", fmt.Sprintf("<h1>KYC Approved, %s!</h1><p>Your account is now fully active.</p>", name))
}

func (e *EmailService) SendKYCRejected(email, name, reason string) error {
	return e.Send(email, "KYC Update Required - NovaPay", fmt.Sprintf("<h1>KYC Needs Attention</h1><p>Hi %s, reason: %s</p>", name, reason))
}

func (e *EmailService) SendSubscriptionActivated(email, planName string) error {
	return e.Send(email, "Subscription Active - NovaPay", fmt.Sprintf("<h1>Your %s plan is active!</h1>", planName))
}

func (e *EmailService) SendExpiryReminder(email, planName string, daysLeft int) error {
	return e.Send(email, fmt.Sprintf("Subscription expires in %d days - NovaPay", daysLeft), fmt.Sprintf("<h1>Your %s plan expires in %d days</h1>", planName, daysLeft))
}
