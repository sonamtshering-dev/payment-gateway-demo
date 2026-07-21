package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/big"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/logger"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

// ============================================================================
// CRYPTO CONFIG / WALLETS (dashboard)
// ============================================================================

func (s *Service) GetCryptoSettings(ctx context.Context, merchantID uuid.UUID) (map[string]interface{}, error) {
	cfg, err := s.repo.GetCryptoConfig(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	if cfg == nil {
		cfg = &models.MerchantCryptoConfig{
			MerchantID: merchantID, PricingMode: string(models.PricingModeLive),
			RequiredConfirmations: 1, PaymentTimeoutMin: 30,
		}
	}
	wallets, err := s.repo.ListCryptoWallets(ctx, merchantID)
	if err != nil {
		return nil, err
	}
	networks := make([]map[string]interface{}, 0, len(config.CryptoNetworks))
	for _, id := range []string{"trc20", "bep20", "erc20"} {
		n := config.CryptoNetworks[id]
		networks = append(networks, map[string]interface{}{
			"id": n.ID, "label": n.Label, "min_confirmations": n.SafeConfirmFloor,
		})
	}
	return map[string]interface{}{
		"config":   cfg,
		"wallets":  wallets,
		"networks": networks,
	}, nil
}

func (s *Service) UpdateCryptoConfig(ctx context.Context, merchantID uuid.UUID, req models.UpdateCryptoConfigRequest) error {
	switch models.CryptoPricingMode(req.PricingMode) {
	case models.PricingModeLive, models.PricingModeFixed, models.PricingModeLiveAdjust:
	default:
		return fmt.Errorf("invalid pricing mode")
	}
	if models.CryptoPricingMode(req.PricingMode) == models.PricingModeFixed && req.FixedRate <= 0 {
		return fmt.Errorf("fixed rate must be greater than zero")
	}
	if req.AdjustmentPct < -50 || req.AdjustmentPct > 50 {
		return fmt.Errorf("adjustment must be between -50%% and +50%%")
	}
	if req.PaymentTimeoutMin < 5 || req.PaymentTimeoutMin > 180 {
		return fmt.Errorf("timeout must be between 5 and 180 minutes")
	}
	cfg := &models.MerchantCryptoConfig{
		MerchantID: merchantID, USDTEnabled: req.USDTEnabled, PricingMode: req.PricingMode,
		FixedRate: req.FixedRate, AdjustmentPct: req.AdjustmentPct,
		RequiredConfirmations: req.RequiredConfirmations, PaymentTimeoutMin: req.PaymentTimeoutMin,
		AutoVerify: req.AutoVerify,
	}
	return s.repo.UpsertCryptoConfig(ctx, cfg)
}

func (s *Service) SaveCryptoWallet(ctx context.Context, merchantID uuid.UUID, req models.SaveCryptoWalletRequest) error {
	if _, ok := config.CryptoNetworks[req.Network]; !ok {
		return fmt.Errorf("unsupported network")
	}
	addr := strings.TrimSpace(req.Address)
	if !validWalletAddress(req.Network, addr) {
		return fmt.Errorf("invalid %s wallet address", strings.ToUpper(req.Network))
	}
	return s.repo.UpsertCryptoWallet(ctx, &models.MerchantCryptoWallet{
		ID: utils.NewID(), MerchantID: merchantID, Network: req.Network, Address: addr,
	})
}

func (s *Service) DeleteCryptoWallet(ctx context.Context, merchantID uuid.UUID, network string) error {
	return s.repo.DeleteCryptoWallet(ctx, merchantID, network)
}

// ============================================================================
// PRICING ENGINE
// ============================================================================

// resolveRate returns the INR-per-USDT rate to lock for an order.
func (s *Service) resolveRate(ctx context.Context, cfg *models.MerchantCryptoConfig) (float64, error) {
	switch models.CryptoPricingMode(cfg.PricingMode) {
	case models.PricingModeFixed:
		if cfg.FixedRate <= 0 {
			return 0, fmt.Errorf("merchant fixed rate not configured")
		}
		return cfg.FixedRate, nil
	case models.PricingModeLiveAdjust:
		live, err := s.liveRate(ctx)
		if err != nil {
			return 0, err
		}
		return live * (1 + cfg.AdjustmentPct/100.0), nil
	default: // live
		return s.liveRate(ctx)
	}
}

// liveRate fetches INR-per-USDT, cached in Redis for 60s, with a configured fallback.
func (s *Service) liveRate(ctx context.Context) (float64, error) {
	const cacheKey = "crypto:rate:usdt_inr"
	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil && cached != "" {
		if v, e := strconv.ParseFloat(cached, 64); e == nil && v > 0 {
			return v, nil
		}
	}
	rate, err := s.fetchLiveRate(ctx)
	if err != nil || rate <= 0 {
		if s.config.Crypto.RateFallbackINR > 0 {
			logger.Warn().Err(err).Msg("Live USDT rate unavailable; using configured fallback")
			return s.config.Crypto.RateFallbackINR, nil
		}
		return 0, fmt.Errorf("exchange rate unavailable, please try again shortly")
	}
	s.redis.Set(ctx, cacheKey, strconv.FormatFloat(rate, 'f', 8, 64), 60*time.Second)
	return rate, nil
}

func (s *Service) fetchLiveRate(ctx context.Context) (float64, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", s.config.Crypto.RateAPIURL, nil)
	if err != nil {
		return 0, err
	}
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("rate api http %d", resp.StatusCode)
	}
	// CoinGecko shape: {"tether":{"inr":88.5}}
	var body map[string]map[string]float64
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, err
	}
	if t, ok := body["tether"]; ok {
		if v, ok := t["inr"]; ok {
			return v, nil
		}
	}
	return 0, fmt.Errorf("unexpected rate api response")
}

// ============================================================================
// CHECKOUT: INIT CRYPTO PAYMENT
// ============================================================================

func (s *Service) InitCryptoPayment(ctx context.Context, paymentID uuid.UUID, network string) (*models.CryptoInitResponse, error) {
	net, ok := config.CryptoNetworks[network]
	if !ok {
		return nil, fmt.Errorf("unsupported network")
	}
	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil || payment == nil {
		return nil, fmt.Errorf("payment not found")
	}
	if payment.Status != models.PaymentStatusPending {
		return nil, fmt.Errorf("this order is no longer awaiting payment")
	}

	cfg, err := s.repo.GetCryptoConfig(ctx, payment.MerchantID)
	if err != nil {
		return nil, err
	}
	if cfg == nil || !cfg.USDTEnabled {
		return nil, fmt.Errorf("USDT payments are not enabled for this merchant")
	}
	wallet, err := s.repo.GetCryptoWallet(ctx, payment.MerchantID, network)
	if err != nil || wallet == nil || !wallet.IsActive || wallet.Address == "" {
		return nil, fmt.Errorf("merchant has not configured a %s wallet", strings.ToUpper(network))
	}

	// Reuse an existing pending crypto payment for this order+network (keeps the
	// locked rate stable if the customer reloads).
	if existing, _ := s.repo.GetActiveCryptoPaymentForOrder(ctx, paymentID, network); existing != nil {
		return s.buildInitResponse(existing, net)
	}

	rate, err := s.resolveRate(ctx, cfg)
	if err != nil {
		return nil, err
	}

	baseStr, expectedStr, err := s.computeUniqueAmount(ctx, payment, network, wallet.Address, rate, net.Decimals)
	if err != nil {
		return nil, err
	}

	timeout := time.Duration(cfg.PaymentTimeoutMin) * time.Minute
	if timeout <= 0 {
		timeout = 30 * time.Minute
	}
	// The crypto window cannot outlive the parent order.
	expiresAt := time.Now().Add(timeout)
	if expiresAt.After(payment.ExpiresAt) {
		expiresAt = payment.ExpiresAt
	}

	cp := &models.CryptoPayment{
		ID: utils.NewID(), PaymentID: payment.ID, MerchantID: payment.MerchantID,
		Network: network, TokenContract: net.TokenContract, MerchantWallet: wallet.Address,
		INRAmount: payment.Amount, ExchangeRate: rate, PricingMode: cfg.PricingMode,
		BaseUSDT: baseStr, ExpectedUSDT: expectedStr, ExpiresAt: expiresAt,
	}
	if err := s.repo.CreateCryptoPayment(ctx, cp); err != nil {
		return nil, fmt.Errorf("could not start crypto payment, please retry")
	}
	return s.buildInitResponse(cp, net)
}

func (s *Service) buildInitResponse(cp *models.CryptoPayment, net config.CryptoNetwork) (*models.CryptoInitResponse, error) {
	// QR encodes the plain wallet address (widest wallet-app compatibility).
	qr, _ := utils.GenerateQRBase64(cp.MerchantWallet)
	return &models.CryptoInitResponse{
		CryptoPaymentID: cp.ID.String(), Network: cp.Network, NetworkLabel: net.Label,
		MerchantWallet: cp.MerchantWallet, ExpectedUSDT: cp.ExpectedUSDT, ExchangeRate: cp.ExchangeRate,
		PricingMode: cp.PricingMode, INRAmount: cp.INRAmount, QRCodeBase64: qr,
		ExpiresAt: cp.ExpiresAt, Status: cp.Status,
	}, nil
}

// computeUniqueAmount rounds the base USDT up to 2 decimals, then appends a small
// random nonce in the micro-decimals so the payable amount is unique among
// pending orders for this wallet — this is what binds a pasted TxID to one order.
func (s *Service) computeUniqueAmount(ctx context.Context, payment *models.Payment, network, wallet string, rate float64, decimals int) (base string, expected string, err error) {
	inrRupees := float64(payment.Amount) / 100.0
	usdt := inrRupees / rate
	baseVal := math.Ceil(usdt*100) / 100 // round up to 2dp — merchant never under-receives
	base = strconv.FormatFloat(baseVal, 'f', 2, 64)

	for attempt := 0; attempt < 12; attempt++ {
		nonce := rand.Intn(9999) + 1 // 0.000001 .. 0.009999 USDT (≈ < ₹1)
		expVal := baseVal + float64(nonce)/1e6
		expected = strconv.FormatFloat(expVal, 'f', 6, 64)
		n, e := s.repo.CountPendingCryptoForAmount(ctx, payment.MerchantID, network, wallet, expected)
		if e == nil && n == 0 {
			return base, expected, nil
		}
	}
	return "", "", fmt.Errorf("too many concurrent crypto orders, please retry")
}

// ============================================================================
// CHECKOUT: VERIFY CRYPTO PAYMENT (customer-submitted TxID)
// ============================================================================

func (s *Service) VerifyCryptoPayment(ctx context.Context, req models.CryptoVerifyRequest, clientIP string) (map[string]interface{}, error) {
	cpID, err := uuid.Parse(req.CryptoPaymentID)
	if err != nil {
		return nil, fmt.Errorf("invalid payment reference")
	}
	cp, err := s.repo.GetCryptoPaymentByID(ctx, cpID)
	if err != nil || cp == nil {
		return nil, fmt.Errorf("payment not found")
	}

	// Idempotent: already settled.
	if cp.Status == "paid" {
		return map[string]interface{}{"status": "paid", "message": "Payment already confirmed"}, nil
	}
	if cp.Status != "pending" {
		return nil, fmt.Errorf("this payment can no longer be verified")
	}
	if time.Now().After(cp.ExpiresAt) {
		return nil, fmt.Errorf("payment window has expired")
	}

	txHash := strings.TrimSpace(req.TxHash)
	if !validTxHash(cp.Network, txHash) {
		return nil, fmt.Errorf("that does not look like a valid %s transaction hash", strings.ToUpper(cp.Network))
	}

	logEntry := &models.CryptoVerificationLog{
		ID: utils.NewID(), CryptoPaymentID: &cp.ID, PaymentID: &cp.PaymentID,
		MerchantID: &cp.MerchantID, Network: cp.Network, TxHash: txHash, IP: clientIP,
	}
	fail := func(reason string) (map[string]interface{}, error) {
		logEntry.Result = "failed"
		logEntry.Reason = reason
		s.repo.LogCryptoVerification(context.Background(), logEntry)
		return nil, errors.New(reason)
	}

	transfer, err := s.verifier.VerifyUSDT(ctx, cp.Network, txHash)
	if err != nil {
		logger.Error().Err(err).Str("crypto_payment_id", cp.ID.String()).Msg("Blockchain verification error")
		return fail("could not reach the blockchain right now, please try again in a moment")
	}
	logEntry.Provider = transfer.Provider

	if !transfer.Found {
		return fail("transaction not found on the network yet — wait a bit after sending, then retry")
	}
	if !transfer.Success {
		return fail("that transaction failed on-chain")
	}
	if transfer.Recipient == "" {
		return fail("no USDT transfer found in that transaction")
	}
	if !s.verifier.AddressMatches(cp.Network, transfer.Recipient, cp.MerchantWallet) {
		return fail("that transaction was not sent to the merchant's wallet")
	}
	// Exact amount is what binds a transfer to this specific order.
	if !cryptoAmountsEqual(transfer.AmountHuman, cp.ExpectedUSDT) {
		return fail(fmt.Sprintf("amount mismatch — please send exactly %s USDT", cp.ExpectedUSDT))
	}
	// Confirmations: enforce the greater of the network safe floor and merchant setting.
	required := networkConfirmFloor(cp.Network)
	if mc, _ := s.repo.GetCryptoConfig(ctx, cp.MerchantID); mc != nil && mc.RequiredConfirmations > required {
		required = mc.RequiredConfirmations
	}
	if transfer.Confirmations < required {
		return fail(fmt.Sprintf("waiting for confirmations (%d of %d) — check again shortly", transfer.Confirmations, required))
	}
	// The transfer must not predate this order (blocks reusing an old transfer).
	if !transfer.Timestamp.IsZero() {
		if transfer.Timestamp.After(cp.ExpiresAt.Add(2 * time.Minute)) {
			return fail("that transaction is outside this order's payment window")
		}
		if transfer.Timestamp.Before(cp.CreatedAt.Add(-10 * time.Minute)) {
			return fail("that transaction predates this order and cannot be used")
		}
	}

	explorerURL := fmt.Sprintf(config.CryptoNetworks[cp.Network].ExplorerTxURL, txHash)
	txTime := transfer.Timestamp
	if txTime.IsZero() {
		txTime = time.Now()
	}

	paid, err := s.repo.MarkCryptoPaymentPaid(ctx, cp.ID, transfer, txHash, explorerURL, txTime)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return fail("that transaction has already been used for another order")
		}
		logger.Error().Err(err).Str("crypto_payment_id", cp.ID.String()).Msg("Failed to mark crypto payment paid")
		return fail("could not finalize the payment, please try again")
	}
	if !paid {
		// Lost the race — another request settled it first. Treat as success (idempotent).
		return map[string]interface{}{"status": "paid", "message": "Payment confirmed"}, nil
	}

	logEntry.Result = "success"
	logEntry.Reason = "verified"
	s.repo.LogCryptoVerification(context.Background(), logEntry)

	// Settle the parent order through the existing pipeline (webhook + telegram + status).
	s.settleParentOrder(context.Background(), cp, txHash)

	return map[string]interface{}{
		"status":       "paid",
		"message":      "Payment confirmed",
		"tx_hash":      txHash,
		"explorer_url": explorerURL,
		"amount_usdt":  transfer.AmountHuman,
	}, nil
}

// settleParentOrder marks the INR order paid and fires the standard side-effects.
func (s *Service) settleParentOrder(ctx context.Context, cp *models.CryptoPayment, txHash string) {
	if err := s.repo.MarkPaymentPaid(ctx, cp.PaymentID, txHash); err != nil {
		logger.Error().Err(err).Str("payment_id", cp.PaymentID.String()).Msg("Crypto: failed to mark parent order paid")
		return
	}
	payment, err := s.repo.GetPaymentByID(ctx, cp.PaymentID)
	if err == nil && payment != nil {
		go s.dispatchWebhook(context.Background(), payment, txHash)
		s.notifyTelegramPaymentReceived(context.Background(), payment.MerchantID, payment.OrderID, payment.Amount)
	}
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

func networkConfirmFloor(network string) int {
	if n, ok := config.CryptoNetworks[network]; ok {
		return n.SafeConfirmFloor
	}
	return 1
}

func validWalletAddress(network, addr string) bool {
	switch network {
	case "trc20":
		return len(addr) == 34 && strings.HasPrefix(addr, "T")
	case "bep20", "erc20":
		return len(addr) == 42 && strings.HasPrefix(addr, "0x")
	}
	return false
}

func validTxHash(network, h string) bool {
	switch network {
	case "trc20":
		return len(h) == 64 && isHex(h)
	case "bep20", "erc20":
		hh := strings.TrimPrefix(h, "0x")
		return len(hh) == 64 && isHex(hh)
	}
	return false
}

func isHex(s string) bool {
	for _, c := range s {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

// cryptoAmountsEqual compares two human decimal strings exactly (no float error).
func cryptoAmountsEqual(a, b string) bool {
	ra, oka := new(big.Rat).SetString(a)
	rb, okb := new(big.Rat).SetString(b)
	if !oka || !okb {
		return false
	}
	return ra.Cmp(rb) == 0
}
