package services

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/utils"
)

func (s *Service) DeleteUPI(ctx context.Context, upiID uuid.UUID, merchantID uuid.UUID) error {
	return s.repo.DeleteMerchantUPI(ctx, upiID, merchantID)
}

func (s *Service) GetMerchantTransactions(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) ([]models.TransactionLog, error) {
	payments, _, err := s.repo.GetPaymentsByMerchant(ctx, merchantID, filter)
	if err != nil {
		return nil, err
	}
	var logs []models.TransactionLog
	for _, p := range payments {
		logs = append(logs, models.TransactionLog{
			ID:        p.ID,
			PaymentID: p.ID,
			Status:    string(p.Status),
			Source:    "payment",
			CreatedAt: p.CreatedAt,
		})
	}
	return logs, nil
}


func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	tokenHash := utils.HashToken(refreshToken)
	rt, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil || rt == nil {
		return nil, fmt.Errorf("invalid or expired refresh token")
	}

	// Revoke old token
	s.repo.RevokeRefreshToken(ctx, tokenHash)

	// Get merchant
	merchant, err := s.repo.GetMerchantByID(ctx, rt.MerchantID)
	if err != nil || merchant == nil {
		return nil, fmt.Errorf("merchant not found")
	}

	// Don't expose API secret on token refresh — only returned at registration
	return s.generateAuthResponse(ctx, merchant, "")
}

func (s *Service) GetMerchantByID(ctx context.Context, merchantID uuid.UUID) (*models.Merchant, error) {
	return s.repo.GetMerchantByID(ctx, merchantID)
}

func (s *Service) GetUPIs(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantUPI, error) {
	return s.repo.GetMerchantUPIs(ctx, merchantID)
}

// privateRanges covers all RFC-1918, loopback, link-local, and cloud metadata CIDRs.
var privateRanges = func() []*net.IPNet {
	cidrs := []string{
		"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
		"127.0.0.0/8", "169.254.0.0/16",
		"::1/128", "fc00::/7", "fe80::/10",
	}
	var nets []*net.IPNet
	for _, c := range cidrs {
		_, n, _ := net.ParseCIDR(c)
		nets = append(nets, n)
	}
	return nets
}()

func isPrivateIP(host string) bool {
	// Strip brackets from IPv6 literal
	host = strings.TrimPrefix(strings.TrimSuffix(host, "]"), "[")
	ips, err := net.LookupHost(host)
	if err != nil {
		return true // treat unresolvable as unsafe
	}
	for _, ipStr := range ips {
		ip := net.ParseIP(ipStr)
		if ip == nil {
			return true
		}
		for _, r := range privateRanges {
			if r.Contains(ip) {
				return true
			}
		}
	}
	return false
}

func (s *Service) UpdateWebhook(ctx context.Context, merchantID uuid.UUID, webhookURL string) error {
	if webhookURL != "" {
		parsed, err := url.Parse(webhookURL)
		if err != nil || parsed.Scheme != "https" {
			return fmt.Errorf("invalid webhook URL: must use HTTPS")
		}
		host := parsed.Hostname()
		if host == "" || isPrivateIP(host) {
			return fmt.Errorf("invalid webhook URL: internal or unresolvable addresses not allowed")
		}
	}
	return s.repo.UpdateMerchantWebhook(ctx, merchantID, webhookURL)
}


func (s *Service) AdminListMerchants(ctx context.Context, filter models.AdminMerchantFilter) ([]models.Merchant, error) {
	return s.repo.AdminListMerchants(ctx, filter)
}

func (s *Service) AdminGetFraudAlerts(ctx context.Context, filter models.AdminFraudFilter) ([]models.FraudAlert, error) {
	if filter.Page == 0 { filter.Page = 1 }
	if filter.Limit == 0 { filter.Limit = 20 }
	alerts, _, err := s.repo.GetFraudAlerts(ctx, filter)
	return alerts, err
}

func (s *Service) GetPaymentByIDFull(ctx context.Context, paymentID uuid.UUID) (*models.Payment, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *Service) AdminListPayments(ctx context.Context) (interface{}, error) {
	return s.repo.AdminListPayments(ctx)
}

func (s *Service) SavePaytmMID(ctx context.Context, merchantID uuid.UUID, upiID, mid string) error {
	return s.repo.SavePaytmMID(ctx, merchantID, upiID, mid)
}

func (s *Service) UpdateKYCDocument(ctx context.Context, merchantID uuid.UUID, docURL string) error {
	return s.repo.UpdateKYCDocumentURL(ctx, merchantID, docURL)
}

func (s *Service) GetMerchantPayments(ctx context.Context, merchantID uuid.UUID, filter models.TransactionFilter) ([]models.Payment, int64, error) {
	return s.repo.GetPaymentsByMerchant(ctx, merchantID, filter)
}

func (s *Service) GetWebhookSecret(ctx context.Context, merchantID uuid.UUID) (string, error) {
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return "", fmt.Errorf("merchant not found")
	}
	return merchant.WebhookSecret, nil
}

func (s *Service) GetAPISecret(ctx context.Context, merchantID uuid.UUID) (string, error) {
	merchant, err := s.repo.GetMerchantByID(ctx, merchantID)
	if err != nil || merchant == nil {
		return "", fmt.Errorf("merchant not found")
	}
	// Decrypt the stored secret and return it
	plaintext, err := utils.Decrypt(merchant.APISecret, s.config.Security.EncryptionKey)
	if err != nil {
		return "", fmt.Errorf("failed to retrieve secret")
	}
	return plaintext, nil
}

func (s *Service) GetIPWhitelist(ctx context.Context, merchantID uuid.UUID) ([]models.MerchantIPWhitelistEntry, error) {
	return s.repo.GetMerchantIPWhitelist(ctx, merchantID)
}

func (s *Service) AddIPWhitelistEntry(ctx context.Context, merchantID uuid.UUID, req models.AddIPWhitelistRequest) (*models.MerchantIPWhitelistEntry, error) {
	// Auto-add to Cloudflare WAF (bypass managed challenge for this IP)
	cfRuleID, err := s.cloudflare.AddIPRule(ctx, req.IPCIDR, req.Label)
	if err != nil {
		// Log but don't fail — DB entry still saves; CF can be retried later
		fmt.Printf("WARNING: Cloudflare whitelist failed for %s: %v\n", req.IPCIDR, err)
		cfRuleID = ""
	}
	return s.repo.AddMerchantIPWhitelistEntry(ctx, merchantID, req.IPCIDR, req.Label, cfRuleID)
}

func (s *Service) DeleteIPWhitelistEntry(ctx context.Context, merchantID uuid.UUID, entryID uuid.UUID) error {
	// Get the entry first so we can retrieve the cf_rule_id
	entry, err := s.repo.GetMerchantIPWhitelistEntryByID(ctx, entryID, merchantID)
	if err == nil && entry != nil && entry.CFRuleID != "" {
		// Auto-remove from Cloudflare WAF
		if cfErr := s.cloudflare.DeleteIPRule(ctx, entry.CFRuleID); cfErr != nil {
			fmt.Printf("WARNING: Cloudflare rule deletion failed for rule %s: %v\n", entry.CFRuleID, cfErr)
		}
	}
	return s.repo.DeleteMerchantIPWhitelistEntry(ctx, merchantID, entryID)
}
