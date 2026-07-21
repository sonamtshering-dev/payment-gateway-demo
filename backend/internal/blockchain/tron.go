package blockchain

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// TRON ADAPTER (TRC20 USDT) via TronGrid
//
// Uses the full-node HTTP endpoints:
//   POST /wallet/gettransactioninfobyid  -> receipt, logs, blockNumber, timestamp
//   POST /wallet/getnowblock             -> current head for confirmations
// TRON emits EVM-style Transfer logs, but addresses are 41-prefixed hex; we
// compare against the merchant address by decoding its base58 form to a hex body.
// ============================================================================

type tronLog struct {
	Address string   `json:"address"` // hex, 41-prefixed (no 0x)
	Topics  []string `json:"topics"`
	Data    string   `json:"data"`
}

type tronTxInfo struct {
	ID             string    `json:"id"`
	BlockNumber    int64     `json:"blockNumber"`
	BlockTimeStamp int64     `json:"blockTimeStamp"` // ms
	Receipt        struct {
		Result string `json:"result"`
	} `json:"receipt"`
	Log            []tronLog `json:"log"`
	ContractResult []string  `json:"contractResult"`
}

type tronNowBlock struct {
	BlockHeader struct {
		RawData struct {
			Number int64 `json:"number"`
		} `json:"raw_data"`
	} `json:"block_header"`
}

func (v *Verifier) tronPost(ctx context.Context, path string, payload interface{}, out interface{}) error {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", v.cfg.TronGridURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if v.cfg.TronGridAPIKey != "" {
		req.Header.Set("TRON-PRO-API-KEY", v.cfg.TronGridAPIKey)
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("trongrid http %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// verifyTron fetches a TRC20 transaction and extracts the USDT transfer.
func (v *Verifier) verifyTron(ctx context.Context, txHash, tokenContract string, decimals int, provider string) (*models.OnChainTransfer, error) {
	var info tronTxInfo
	if err := v.tronPost(ctx, "/wallet/gettransactioninfobyid", map[string]string{"value": txHash}, &info); err != nil {
		return nil, err
	}
	if info.ID == "" {
		return &models.OnChainTransfer{Found: false, Provider: provider}, nil
	}

	out := &models.OnChainTransfer{
		Found:         true,
		Success:       info.Receipt.Result == "SUCCESS" || info.Receipt.Result == "",
		TokenContract: tokenContract,
		Provider:      provider,
		BlockNumber:   info.BlockNumber,
	}
	if info.BlockTimeStamp > 0 {
		out.Timestamp = time.UnixMilli(info.BlockTimeStamp).UTC()
	}

	// The token contract address in TRON logs is 41-prefixed hex; convert the
	// configured base58 contract to a hex body for comparison.
	wantContract, okC := tronBase58ToHexBody(tokenContract)
	for _, lg := range info.Log {
		logAddrBody := stripHex(lg.Address)
		if len(logAddrBody) == 42 && logAddrBody[:2] == "41" { // 41 + 20 bytes
			logAddrBody = logAddrBody[2:]
		}
		if okC && logAddrBody != wantContract {
			continue
		}
		if len(lg.Topics) < 3 || stripHex(lg.Topics[0]) != transferEventSig {
			continue
		}
		out.Sender = topicToAddress(lg.Topics[1])       // hex body
		out.Recipient = topicToAddress(lg.Topics[2])    // hex body
		amount, _ := hexToBigInt(lg.Data)
		out.AmountRaw = amount.String()
		out.AmountHuman = rawToHuman(amount, decimals)
		break
	}

	// Confirmations from current head.
	var now tronNowBlock
	if err := v.tronPost(ctx, "/wallet/getnowblock", map[string]string{}, &now); err == nil {
		if now.BlockHeader.RawData.Number > 0 && info.BlockNumber > 0 {
			conf := int(now.BlockHeader.RawData.Number-info.BlockNumber) + 1
			if conf > 0 {
				out.Confirmations = conf
			}
		}
	}

	return out, nil
}
