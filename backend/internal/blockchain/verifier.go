package blockchain

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/models"
)

var errNotFound = errors.New("transaction not found")

// Verifier fetches and normalizes USDT transfers across supported chains using
// only free/public endpoints.
type Verifier struct {
	cfg    config.CryptoConfig
	client *http.Client
}

func NewVerifier(cfg config.CryptoConfig) *Verifier {
	return &Verifier{
		cfg:    cfg,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// VerifyUSDT fetches the transaction on the given network and returns the
// normalized USDT transfer it contains (if any). It performs NO business
// validation — the caller checks recipient, amount, confirmations, expiry.
func (v *Verifier) VerifyUSDT(ctx context.Context, network, txHash string) (*models.OnChainTransfer, error) {
	net, ok := config.CryptoNetworks[network]
	if !ok {
		return nil, fmt.Errorf("unsupported network: %s", network)
	}

	switch network {
	case "trc20":
		return v.verifyTron(ctx, txHash, net.TokenContract, net.Decimals, "trongrid")
	case "bep20":
		return v.verifyEVM(ctx, v.cfg.BscRPCURL, txHash, net.TokenContract, net.Decimals, "bsc_rpc")
	case "erc20":
		return v.verifyEVM(ctx, v.cfg.EthRPCURL, txHash, net.TokenContract, net.Decimals, "eth_rpc")
	default:
		return nil, fmt.Errorf("unsupported network: %s", network)
	}
}

// AddressMatches compares an on-chain recipient (as returned by VerifyUSDT) to a
// merchant wallet address, normalizing per network. EVM addresses compare
// case-insensitively on the 20-byte body; TRON decodes the base58 wallet to its
// hex body first.
func (v *Verifier) AddressMatches(network, onchainRecipient, merchantWallet string) bool {
	switch network {
	case "trc20":
		body, ok := tronBase58ToHexBody(merchantWallet)
		if !ok {
			return false
		}
		return stripHex(onchainRecipient) == body
	case "bep20", "erc20":
		return stripHex(onchainRecipient) == stripHex(merchantWallet)
	default:
		return false
	}
}
