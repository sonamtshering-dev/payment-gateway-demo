package blockchain

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// EVM ADAPTER (Ethereum ERC20 + BNB Smart Chain BEP20)
//
// Uses plain JSON-RPC (eth_getTransactionReceipt / eth_blockNumber /
// eth_getBlockByNumber) so it works against any free public RPC endpoint.
// ============================================================================

type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type rpcResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type evmLog struct {
	Address string   `json:"address"`
	Topics  []string `json:"topics"`
	Data    string   `json:"data"`
}

type evmReceipt struct {
	Status      string   `json:"status"`
	BlockNumber string   `json:"blockNumber"`
	Logs        []evmLog `json:"logs"`
	From        string   `json:"from"`
}

type evmBlock struct {
	Timestamp string `json:"timestamp"`
}

func rpcCall(ctx context.Context, client *http.Client, url, method string, params []interface{}, out interface{}) error {
	body, _ := json.Marshal(rpcRequest{JSONRPC: "2.0", ID: 1, Method: method, Params: params})
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("rpc http %d", resp.StatusCode)
	}
	var rr rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&rr); err != nil {
		return err
	}
	if rr.Error != nil {
		return fmt.Errorf("rpc error %d: %s", rr.Error.Code, rr.Error.Message)
	}
	if string(rr.Result) == "null" || len(rr.Result) == 0 {
		return errNotFound
	}
	return json.Unmarshal(rr.Result, out)
}

// verifyEVM fetches a transaction receipt and extracts the USDT transfer.
func (v *Verifier) verifyEVM(ctx context.Context, rpcURL, txHash, tokenContract string, decimals int, provider string) (*models.OnChainTransfer, error) {
	var receipt evmReceipt
	if err := rpcCall(ctx, v.client, rpcURL, "eth_getTransactionReceipt", []interface{}{txHash}, &receipt); err != nil {
		if err == errNotFound {
			return &models.OnChainTransfer{Found: false, Provider: provider}, nil
		}
		return nil, err
	}

	out := &models.OnChainTransfer{
		Found:         true,
		Success:       receipt.Status == "0x1",
		TokenContract: tokenContract,
		Provider:      provider,
	}

	blockNum, _ := hexToBigInt(receipt.BlockNumber)
	out.BlockNumber = blockNum.Int64()

	// Locate the USDT Transfer log.
	want := stripHex(tokenContract)
	for _, lg := range receipt.Logs {
		if stripHex(lg.Address) != want {
			continue
		}
		if len(lg.Topics) < 3 || stripHex(lg.Topics[0]) != transferEventSig {
			continue
		}
		out.Sender = "0x" + topicToAddress(lg.Topics[1])
		out.Recipient = "0x" + topicToAddress(lg.Topics[2])
		amount, _ := hexToBigInt(lg.Data)
		out.AmountRaw = amount.String()
		out.AmountHuman = rawToHuman(amount, decimals)
		break
	}

	// Confirmations = current height - tx block + 1
	var head string
	if err := rpcCall(ctx, v.client, rpcURL, "eth_blockNumber", []interface{}{}, &head); err == nil {
		if cur, ok := hexToBigInt(head); ok {
			conf := new(big.Int).Sub(cur, blockNum)
			conf.Add(conf, big.NewInt(1))
			if conf.Sign() > 0 {
				out.Confirmations = int(conf.Int64())
			}
		}
	}

	// Block timestamp (best-effort; verification does not hard-fail if unavailable)
	var block evmBlock
	if err := rpcCall(ctx, v.client, rpcURL, "eth_getBlockByNumber", []interface{}{receipt.BlockNumber, false}, &block); err == nil {
		if ts, ok := hexToBigInt(block.Timestamp); ok {
			out.Timestamp = time.Unix(ts.Int64(), 0).UTC()
		}
	}

	return out, nil
}
