package config

import "strconv"

// ============================================================================
// CRYPTO / USDT NETWORK CONFIGURATION
//
// USDT is deployed on each chain with a different contract address AND a
// different number of decimals. Getting decimals wrong silently mis-values
// every payment, so they are pinned here as constants, not fetched.
// ============================================================================

type CryptoNetwork struct {
	ID              string // trc20 | bep20 | erc20
	Label           string
	TokenContract   string // official USDT (Tether) contract on this chain
	Decimals        int    // USDT token decimals on this chain
	ExplorerTxURL   string // %s -> tx hash
	SafeConfirmFloor int   // minimum confirmations we will ever accept, regardless of merchant setting
}

// Official mainnet USDT (Tether) contracts. Verified values — do not change
// without cross-checking against Tether's official documentation.
var CryptoNetworks = map[string]CryptoNetwork{
	"trc20": {
		ID:               "trc20",
		Label:            "USDT · TRC20 (Tron)",
		TokenContract:    "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
		Decimals:         6,
		ExplorerTxURL:    "https://tronscan.org/#/transaction/%s",
		SafeConfirmFloor: 1,
	},
	"bep20": {
		ID:               "bep20",
		Label:            "USDT · BEP20 (BNB Smart Chain)",
		TokenContract:    "0x55d398326f99059fF775485246999027B3197955",
		Decimals:         18,
		ExplorerTxURL:    "https://bscscan.com/tx/%s",
		SafeConfirmFloor: 6,
	},
	"erc20": {
		ID:               "erc20",
		Label:            "USDT · ERC20 (Ethereum)",
		TokenContract:    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
		Decimals:         6,
		ExplorerTxURL:    "https://etherscan.io/tx/%s",
		SafeConfirmFloor: 12,
	},
}

// CryptoConfig holds provider endpoints and the exchange-rate source.
type CryptoConfig struct {
	TronGridURL    string // TronGrid base URL (TRC20)
	TronGridAPIKey string // optional; raises rate limits
	BscRPCURL      string // BNB Smart Chain JSON-RPC (BEP20)
	EthRPCURL      string // Ethereum JSON-RPC (ERC20)
	RateAPIURL     string // INR-per-USDT source
	RateFallbackINR float64 // hard fallback if all rate sources fail (0 = refuse)
}

func loadCryptoConfig() CryptoConfig {
	fallback, _ := strconv.ParseFloat(getEnv("CRYPTO_RATE_FALLBACK_INR", "0"), 64)
	return CryptoConfig{
		TronGridURL:     getEnv("TRONGRID_URL", "https://api.trongrid.io"),
		TronGridAPIKey:  getEnv("TRONGRID_API_KEY", ""),
		BscRPCURL:       getEnv("BSC_RPC_URL", "https://bsc-dataseed.binance.org"),
		EthRPCURL:       getEnv("ETH_RPC_URL", "https://eth.llamarpc.com"),
		RateAPIURL:      getEnv("CRYPTO_RATE_API_URL", "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr"),
		RateFallbackINR: fallback,
	}
}
