package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upay/gateway/internal/services"
	"github.com/upay/gateway/internal/utils"
)

type phonePeStatusResp struct {
	Success bool   `json:"success"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    struct {
		MerchantTransactionID string `json:"merchantTransactionId"`
		TransactionID         string `json:"transactionId"`
		Amount                int64  `json:"amount"`
		State                 string `json:"state"` // COMPLETED | PENDING | FAILED
		ResponseCode          string `json:"responseCode"`
		PaymentInstrument     struct {
			Type string `json:"type"`
			UTR  string `json:"utr"`
		} `json:"paymentInstrument"`
	} `json:"data"`
}

func (w *Worker) phonePeVerificationWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	log.Info().Msg("PhonePe verification worker started")
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("PhonePe verification worker stopped")
			return
		case <-ticker.C:
			w.runPhonePeVerification(ctx)
		}
	}
}

func (w *Worker) runPhonePeVerification(ctx context.Context) {
	payments, err := w.repo.GetPendingPhonePePayments(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch pending PhonePe payments")
		return
	}
	if len(payments) == 0 {
		return
	}

	for _, payment := range payments {
		cfg, err := w.repo.GetPhonePeConfig(ctx, payment.MerchantID)
		if err != nil || cfg == nil || cfg.MerchantID == "" {
			continue
		}

		// Decrypt salt key
		saltKey, err := utils.Decrypt(cfg.SaltKey, w.config.Security.EncryptionKey)
		if err != nil {
			log.Error().Err(err).Str("merchant_id", payment.MerchantID.String()).Msg("PhonePe: failed to decrypt salt key")
			continue
		}

		status, err := checkPhonePeStatus(cfg.MerchantID, saltKey, cfg.SaltIndex, payment.PaytmTxnRef)
		if err != nil {
			log.Error().Err(err).Str("payment_id", payment.ID.String()).Msg("PhonePe API error")
			continue
		}

		if status.Data.State == "COMPLETED" || status.Code == "PAYMENT_SUCCESS" {
			utr := status.Data.PaymentInstrument.UTR
			if utr == "" {
				utr = status.Data.TransactionID
			}
			if err := w.repo.MarkPaymentPaid(ctx, payment.ID, utr); err != nil {
				log.Error().Err(err).Msg("PhonePe: failed to mark payment paid")
				continue
			}

			// Queue webhook
			merchant, err := w.repo.GetMerchantByID(ctx, payment.MerchantID)
			if err == nil && merchant != nil && merchant.WebhookURL != "" {
				payload := map[string]interface{}{
					"payment_id": payment.ID.String(),
					"order_id":   payment.OrderID,
					"amount":     payment.Amount,
					"currency":   "INR",
					"status":     "paid",
					"utr":        utr,
					"timestamp":  time.Now().Unix(),
				}
				payloadBytes, _ := json.Marshal(payload)
				w.redis.LPush(ctx, "webhook:queue", string(payloadBytes))
			}

			log.Info().
				Str("payment_id", payment.ID.String()).
				Str("order_id", payment.OrderID).
				Str("utr", utr).
				Msg("Payment auto-confirmed via PhonePe ✅")

			w.enqueueTelegramForMerchant(ctx, payment.MerchantID, services.TGNotifPaymentReceived,
				services.FormatPaymentReceived(payment.OrderID, utr, payment.Amount))

			if len(payment.OrderID) > 4 && payment.OrderID[:4] == "SUB-" {
				if subMerchantID, planName, aerr := w.repo.ActivateSubscriptionForPayment(ctx, payment.MerchantID, payment.OrderID); aerr != nil {
					log.Error().Err(aerr).Str("order_id", payment.OrderID).Msg("PhonePe: failed to activate subscription")
				} else {
					log.Info().Str("order_id", payment.OrderID).Msg("Subscription activated via PhonePe ✅")
					w.enqueueTelegramForMerchant(ctx, subMerchantID, services.TGNotifSubscriptionActive,
						services.FormatSubscriptionActivated(planName))
				}
			}
		}
	}
}

func checkPhonePeStatus(merchantID, saltKey, saltIndex, txnRef string) (*phonePeStatusResp, error) {
	urlPath := fmt.Sprintf("/pg/v1/status/%s/%s", merchantID, txnRef)
	checksum := utils.GenPhonePeChecksum(urlPath, saltKey, saltIndex)

	apiURL := fmt.Sprintf("https://api.phonepe.com/apis/hermes%s", urlPath)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-VERIFY", checksum)
	req.Header.Set("X-MERCHANT-ID", merchantID)
	req.Header.Set("accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result phonePeStatusResp
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse phonepe response: %w (body: %s)", err, string(body))
	}
	return &result, nil
}
