package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"
)

// PaytmOrderStatus is the response from Paytm's order status API
type PaytmOrderStatus struct {
	STATUS      string `json:"STATUS"`       // TXN_SUCCESS, PENDING, TXN_FAILURE
	TXNID       string `json:"TXNID"`        // Paytm transaction ID
	BANKTXNID   string `json:"BANKTXNID"`    // UTR / bank transaction ID
	TXNAMOUNT   string `json:"TXNAMOUNT"`    // Amount as string e.g. "99.00"
	ORDERID     string `json:"ORDERID"`      // Your transaction reference
	MID         string `json:"MID"`          // Merchant ID
	GATEWAYNAME string `json:"GATEWAYNAME"`  // UPI, HDFC etc
	RESPMSG     string `json:"RESPMSG"`      // Human readable message
	RESPCODE    string `json:"RESPCODE"`     // 01 = success
}

// CheckPaytmOrderStatus calls Paytm's order status API
// MID = merchant's Paytm Business Merchant ID
// txnRef = the transaction reference we embedded in the UPI link (paytm_txn_ref)
func (s *Service) CheckPaytmOrderStatus(mid, txnRef string) (*PaytmOrderStatus, error) {
	jsonData, err := json.Marshal(map[string]string{
		"MID":     mid,
		"ORDERID": txnRef,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal paytm request: %w", err)
	}

	apiURL := fmt.Sprintf(
		"https://securegw.paytm.in/order/status?JsonData=%s",
		url.QueryEscape(string(jsonData)),
	)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("paytm api call failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read paytm response: %w", err)
	}

	var status PaytmOrderStatus
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, fmt.Errorf("parse paytm response: %w", err)
	}

	return &status, nil
}

// VerifyPaytmPayment checks Paytm for a payment and marks it paid if confirmed
// Returns true if payment was just confirmed
func (s *Service) VerifyPaytmPayment(ctx context.Context, paymentID uuid.UUID) (bool, error) {
	// Get payment details
	payment, err := s.repo.GetPaymentByIDSimple(ctx, paymentID)
	if err != nil || payment == nil {
		return false, fmt.Errorf("payment not found: %w", err)
	}

	if payment.Status != "pending" {
		return false, nil // already resolved
	}

	if payment.PaytmTxnRef == "" {
		return false, nil // no paytm ref, skip
	}

	// Get merchant's Paytm MID
	mid, err := s.repo.GetMerchantPaytmMID(ctx, payment.MerchantID)
	if err != nil || mid == "" {
		return false, nil // merchant has no Paytm MID configured
	}

	// Call Paytm API
	status, err := s.CheckPaytmOrderStatus(mid, payment.PaytmTxnRef)
	if err != nil {
		return false, fmt.Errorf("paytm check failed: %w", err)
	}

	if status.STATUS == "TXN_SUCCESS" &&
		status.MID == mid &&
		status.ORDERID == payment.PaytmTxnRef {

		// Mark payment as paid
		utr := status.BANKTXNID
		if utr == "" {
			utr = status.TXNID
		}
		if err := s.repo.MarkPaymentPaid(ctx, paymentID, utr); err != nil {
			return false, fmt.Errorf("mark paid failed: %w", err)
		}

		// Queue webhook
		s.queuePaymentWebhook(ctx, paymentID)

		return true, nil
	}

	return false, nil
}

// queuePaymentWebhook is a helper to fire the webhook after payment confirmation
func (s *Service) queuePaymentWebhook(ctx context.Context, paymentID uuid.UUID) {
	payment, err := s.repo.GetPaymentByIDSimple(ctx, paymentID)
	if err != nil || payment == nil {
		return
	}

	merchant, err := s.repo.GetMerchantByID(ctx, payment.MerchantID)
	if err != nil || merchant == nil || merchant.WebhookURL == "" {
		return
	}

	payload := map[string]interface{}{
		"event":      "payment.success",
		"payment_id": payment.ID.String(),
		"order_id":   payment.OrderID,
		"amount":     payment.Amount,
		"status":     "paid",
		"paid_at":    time.Now().UTC().Format(time.RFC3339),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return
	}

	s.redis.LPush(ctx, "webhook:queue", string(payloadBytes))
}