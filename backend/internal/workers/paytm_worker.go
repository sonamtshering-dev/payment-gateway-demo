package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"time"

	"github.com/rs/zerolog/log"
)

type PaytmOrderStatus struct {
	STATUS    string `json:"STATUS"`
	TXNID     string `json:"TXNID"`
	BANKTXNID string `json:"BANKTXNID"`
	TXNAMOUNT string `json:"TXNAMOUNT"`
	ORDERID   string `json:"ORDERID"`
	MID       string `json:"MID"`
	RESPMSG   string `json:"RESPMSG"`
}

func (w *Worker) paytmVerificationWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	log.Info().Msg("Paytm verification worker started")
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Paytm verification worker stopped")
			return
		case <-ticker.C:
			w.runPaytmVerification(ctx)
		}
	}
}

func (w *Worker) runPaytmVerification(ctx context.Context) {
	payments, err := w.repo.GetPendingPaytmPayments(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch pending Paytm payments")
		return
	}
	if len(payments) == 0 {
		return
	}
	for _, payment := range payments {
		mid, err := w.repo.GetMerchantPaytmMID(ctx, payment.MerchantID)
		if err != nil || mid == "" {
			continue
		}
		status, err := checkPaytmStatus(mid, payment.PaytmTxnRef)
		if err != nil {
			log.Error().Err(err).Str("payment_id", payment.ID.String()).Msg("Paytm API error")
			continue
		}
		if status.STATUS == "TXN_SUCCESS" && status.MID == mid && status.ORDERID == payment.PaytmTxnRef {
			utr := status.BANKTXNID
			if utr == "" {
				utr = status.TXNID
			}
			if err := w.repo.MarkPaymentPaid(ctx, payment.ID, utr); err != nil {
				log.Error().Err(err).Msg("Failed to mark payment paid")
				continue
			}
			// Queue webhook
			merchant, err := w.repo.GetMerchantByID(ctx, payment.MerchantID)
			if err == nil && merchant != nil && merchant.WebhookURL != "" {
				payload := map[string]interface{}{
					"event":      "payment.success",
					"payment_id": payment.ID.String(),
					"order_id":   payment.OrderID,
					"amount":     payment.Amount,
					"status":     "paid",
					"utr":        utr,
					"paid_at":    time.Now().UTC().Format(time.RFC3339),
				}
				payloadBytes, _ := json.Marshal(payload)
				w.redis.LPush(ctx, "webhook:queue", string(payloadBytes))
			}
			log.Info().
				Str("payment_id", payment.ID.String()).
				Str("order_id", payment.OrderID).
				Str("utr", utr).
				Msg("Payment auto-confirmed via Paytm ✅")

			// Auto-activate subscription if this is a SUB- payment
			if len(payment.OrderID) > 4 && payment.OrderID[:4] == "SUB-" {
				if aerr := w.repo.ActivateSubscriptionForPayment(ctx, payment.MerchantID, payment.OrderID); aerr != nil {
					log.Error().Err(aerr).Str("order_id", payment.OrderID).Msg("Failed to activate subscription")
				} else {
					log.Info().Str("order_id", payment.OrderID).Msg("Subscription activated ✅")
				}
			}
		}
	}
}

func checkPaytmStatus(mid, txnRef string) (*PaytmOrderStatus, error) {
	jsonData, _ := json.Marshal(map[string]string{"MID": mid, "ORDERID": txnRef})
	apiURL := fmt.Sprintf("https://securegw.paytm.in/order/status?JsonData=%s", url.QueryEscape(string(jsonData)))
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var status PaytmOrderStatus
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, err
	}
	return &status, nil
}

// GenPaytmTxnRef is kept here for reference — actual usage is in utils/crypto.go
var _ = rand.Intn // suppress unused import
