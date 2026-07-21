package blockchain

import (
	"crypto/sha256"
	"fmt"
	"math/big"
	"strings"
)

// Transfer(address,address,uint256) event signature (keccak256 topic0).
// Identical across all EVM chains and TRON (which uses the same EVM log format).
const transferEventSig = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

// stripHex removes an optional 0x prefix and lowercases.
func stripHex(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "0x")
	s = strings.TrimPrefix(s, "0X")
	return strings.ToLower(s)
}

// topicToAddress takes a 32-byte (64-hex) log topic and returns the trailing
// 20-byte address body as lowercase hex (no prefix).
func topicToAddress(topic string) string {
	h := stripHex(topic)
	if len(h) < 40 {
		return h
	}
	return h[len(h)-40:]
}

// hexToBigInt parses a hex string (optional 0x) into a big.Int.
func hexToBigInt(s string) (*big.Int, bool) {
	h := stripHex(s)
	if h == "" {
		return big.NewInt(0), true
	}
	n, ok := new(big.Int).SetString(h, 16)
	return n, ok
}

// rawToHuman converts base-unit integer amount to a human decimal string,
// applying the token's decimals. e.g. (10003700, 6) -> "10.0037".
func rawToHuman(raw *big.Int, decimals int) string {
	if raw == nil {
		return "0"
	}
	denom := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	q := new(big.Int)
	r := new(big.Int)
	q.QuoRem(raw, denom, r)
	if r.Sign() == 0 {
		return q.String()
	}
	// Build fractional part, zero-padded to `decimals`, trailing zeros trimmed.
	frac := r.String()
	if len(frac) < decimals {
		frac = strings.Repeat("0", decimals-len(frac)) + frac
	}
	frac = strings.TrimRight(frac, "0")
	return q.String() + "." + frac
}

// amountsEqual compares two human decimal strings exactly (no float rounding).
func amountsEqual(a, b string) bool {
	ra, oka := new(big.Rat).SetString(a)
	rb, okb := new(big.Rat).SetString(b)
	if !oka || !okb {
		return false
	}
	return ra.Cmp(rb) == 0
}

// amountGTE reports whether human amount a >= b.
func amountGTE(a, b string) bool {
	ra, oka := new(big.Rat).SetString(a)
	rb, okb := new(big.Rat).SetString(b)
	if !oka || !okb {
		return false
	}
	return ra.Cmp(rb) >= 0
}

// ============================================================================
// TRON BASE58CHECK
// ============================================================================

const b58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// tronBase58ToHexBody decodes a TRON base58check address (e.g. "TR7NH...") and
// returns the 20-byte address body as lowercase hex, so it can be compared
// against an EVM-style log topic. Returns ("", false) on any decode/checksum error.
func tronBase58ToHexBody(addr string) (string, bool) {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return "", false
	}
	// base58 decode
	result := big.NewInt(0)
	radix := big.NewInt(58)
	for _, c := range addr {
		idx := strings.IndexRune(b58Alphabet, c)
		if idx < 0 {
			return "", false
		}
		result.Mul(result, radix)
		result.Add(result, big.NewInt(int64(idx)))
	}
	decoded := result.Bytes()
	// account for leading '1' chars -> leading zero bytes
	for i := 0; i < len(addr) && addr[i] == '1'; i++ {
		decoded = append([]byte{0}, decoded...)
	}
	// expect 25 bytes: 0x41 prefix + 20 body + 4 checksum
	if len(decoded) != 25 {
		return "", false
	}
	body := decoded[:21]
	checksum := decoded[21:]
	first := sha256.Sum256(body)
	second := sha256.Sum256(first[:])
	for i := 0; i < 4; i++ {
		if checksum[i] != second[i] {
			return "", false
		}
	}
	if body[0] != 0x41 {
		return "", false
	}
	return strings.ToLower(fmt.Sprintf("%x", body[1:])), true
}
