package blockchain

import (
	"math/big"
	"testing"
)

func TestRawToHuman(t *testing.T) {
	cases := []struct {
		raw      string
		decimals int
		want     string
	}{
		{"10003700", 6, "10.0037"},   // TRC20/ERC20 USDT, 6 decimals
		{"1000000", 6, "1"},          // exact whole
		{"11110001", 6, "11.110001"}, // nonce tail preserved
		{"1000000000000000000", 18, "1"},          // BEP20 1 USDT (18 decimals)
		{"11110001000000000000", 18, "11.110001"}, // BEP20 with tail
		{"0", 6, "0"},
	}
	for _, c := range cases {
		raw, _ := new(big.Int).SetString(c.raw, 10)
		if got := rawToHuman(raw, c.decimals); got != c.want {
			t.Errorf("rawToHuman(%s,%d)=%s want %s", c.raw, c.decimals, got, c.want)
		}
	}
}

func TestAmountsEqual(t *testing.T) {
	if !amountsEqual("11.110010", "11.11001") {
		t.Error("expected 11.110010 == 11.11001 (trailing zero)")
	}
	if amountsEqual("10.0037", "10.0038") {
		t.Error("expected 10.0037 != 10.0038")
	}
	if !amountsEqual("1", "1.000000") {
		t.Error("expected 1 == 1.000000")
	}
}

func TestTopicToAddress(t *testing.T) {
	topic := "0x000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7"
	want := "dac17f958d2ee523a2206206994597c13d831ec7"
	if got := topicToAddress(topic); got != want {
		t.Errorf("topicToAddress=%s want %s", got, want)
	}
}

func TestTronBase58ToHexBody(t *testing.T) {
	// Official USDT-TRC20 contract address and its known hex body.
	body, ok := tronBase58ToHexBody("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")
	if !ok {
		t.Fatal("failed to decode valid TRON address")
	}
	if body != "a614f803b6fd780986a42c78ec9c7f77e6ded13c" {
		t.Errorf("unexpected hex body: %s", body)
	}
	// Garbage input must fail, not panic.
	if _, ok := tronBase58ToHexBody("not-a-real-address-0OIl"); ok {
		t.Error("expected invalid address to fail decode")
	}
}
