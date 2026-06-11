package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/upay/gateway/internal/logger"
)

// cfAccessRule is the Cloudflare Firewall Access Rules API (v4).
// We use action=whitelist to let the IP bypass Managed Challenge / bot detection.
const cfAccessRulesURL = "https://api.cloudflare.com/client/v4/zones/%s/firewall/access_rules/rules"

type cfRuleConfig struct {
	Target string `json:"target"` // "ip" or "ip_range"
	Value  string `json:"value"`
}

type cfCreateRuleRequest struct {
	Mode          string       `json:"mode"`   // "whitelist"
	Configuration cfRuleConfig `json:"configuration"`
	Notes         string       `json:"notes"`
}

type cfRuleResult struct {
	ID string `json:"id"`
}

type cfAPIResponse struct {
	Success bool         `json:"success"`
	Result  cfRuleResult `json:"result"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// CloudflareService handles automatic IP whitelisting via the Cloudflare v4 API.
type CloudflareService struct {
	apiToken string
	zoneID   string
	client   *http.Client
}

func NewCloudflareService(apiToken, zoneID string) *CloudflareService {
	return &CloudflareService{
		apiToken: apiToken,
		zoneID:   zoneID,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// Enabled returns true if Cloudflare credentials are configured.
func (cf *CloudflareService) Enabled() bool {
	return cf.apiToken != "" && cf.zoneID != ""
}

// AddIPRule creates a firewall access rule that whitelists the given IP or CIDR.
// Returns the Cloudflare rule ID (needed for later deletion).
func (cf *CloudflareService) AddIPRule(ctx context.Context, ipCIDR, label string) (string, error) {
	if !cf.Enabled() {
		return "", nil // silently skip — CF not configured
	}

	target := "ip"
	// If CIDR notation (contains /), use ip_range
	for _, ch := range ipCIDR {
		if ch == '/' {
			target = "ip_range"
			break
		}
	}

	body := cfCreateRuleRequest{
		Mode: "whitelist",
		Configuration: cfRuleConfig{
			Target: target,
			Value:  ipCIDR,
		},
		Notes: fmt.Sprintf("NovaPay merchant whitelist: %s", label),
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal CF request: %w", err)
	}

	url := fmt.Sprintf(cfAccessRulesURL, cf.zoneID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to build CF request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+cf.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := cf.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("CF API request failed: %w", err)
	}
	defer resp.Body.Close()

	var apiResp cfAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return "", fmt.Errorf("failed to decode CF response: %w", err)
	}

	if !apiResp.Success {
		msg := "unknown error"
		if len(apiResp.Errors) > 0 {
			msg = apiResp.Errors[0].Message
		}
		return "", fmt.Errorf("CF API error: %s", msg)
	}

	logger.Info().Str("ip", ipCIDR).Str("cf_rule_id", apiResp.Result.ID).Msg("Cloudflare whitelist rule created")
	return apiResp.Result.ID, nil
}

// DeleteIPRule removes a firewall access rule by its Cloudflare rule ID.
func (cf *CloudflareService) DeleteIPRule(ctx context.Context, cfRuleID string) error {
	if !cf.Enabled() || cfRuleID == "" {
		return nil
	}

	url := fmt.Sprintf(cfAccessRulesURL+"/%s", cf.zoneID, cfRuleID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("failed to build CF delete request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+cf.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := cf.client.Do(req)
	if err != nil {
		return fmt.Errorf("CF API delete request failed: %w", err)
	}
	defer resp.Body.Close()

	var apiResp struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	json.NewDecoder(resp.Body).Decode(&apiResp)

	if !apiResp.Success {
		msg := "unknown error"
		if len(apiResp.Errors) > 0 {
			msg = apiResp.Errors[0].Message
		}
		return fmt.Errorf("CF API delete error: %s", msg)
	}

	logger.Info().Str("cf_rule_id", cfRuleID).Msg("Cloudflare whitelist rule deleted")
	return nil
}
