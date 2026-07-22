<?php
/**
 * NovaPay PHP SDK
 * ---------------
 * Zero-dependency client for the NovaPay Payment Gateway (https://nova-pay.in).
 *
 * Usage:
 *   require 'NovaPay.php';
 *   $novapay = new NovaPay('YOUR_API_KEY', 'YOUR_API_SECRET');
 *
 *   // 1) Create a payment (amount in paise: ₹499.00 => 49900)
 *   $payment = $novapay->createPayment([
 *       'order_id' => 'ORD-1001',
 *       'amount'   => 49900,
 *       'currency' => 'INR',
 *       'customer_reference' => 'Invoice #1001',
 *       'redirect_url'       => 'https://yourstore.com/thank-you',
 *   ]);
 *   // Send the customer to the hosted checkout:
 *   header('Location: ' . $novapay->checkoutUrl($payment['payment_id']));
 *
 *   // 2) In your webhook endpoint:
 *   $event = $novapay->parseWebhook(file_get_contents('php://input'),
 *                                   $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '',
 *                                   'YOUR_WEBHOOK_SECRET');
 *   if ($event !== null && $event['status'] === 'paid') { /* mark order paid */ }
 */

class NovaPayException extends \Exception {}

class NovaPay
{
    private string $apiKey;
    private string $apiSecret;
    private string $baseUrl;

    public function __construct(string $apiKey, string $apiSecret, string $baseUrl = 'https://nova-pay.in')
    {
        $this->apiKey    = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->baseUrl   = rtrim($baseUrl, '/');
    }

    /* ── Payments ─────────────────────────────────────────────────────── */

    /**
     * Create a payment. Required: order_id, amount (paise), currency ('INR').
     * Optional: customer_reference, redirect_url, expires_in_hours,
     *           notify_on_paid, collect_customer_details.
     * Returns: payment_id, qr_code_base64, upi_intent_link, expires_at, status.
     */
    public function createPayment(array $params, ?string $idempotencyKey = null): array
    {
        return $this->signedRequest('POST', '/api/v1/payments/create', $params, $idempotencyKey);
    }

    /** Payment status via the authenticated API. */
    public function getPaymentStatus(string $paymentId): array
    {
        return $this->signedRequest('GET', '/api/v1/payments/status/' . urlencode($paymentId));
    }

    /** Public payment status — no auth, safe for frontend polling. */
    public function getPublicStatus(string $paymentId): array
    {
        return $this->plainRequest('GET', '/api/v1/public/payment/' . urlencode($paymentId));
    }

    /** Hosted checkout page URL for a created payment. */
    public function checkoutUrl(string $paymentId): string
    {
        return $this->baseUrl . '/pay/' . $paymentId;
    }

    /* ── Crypto (USDT) ────────────────────────────────────────────────── */

    /** Start a USDT payment for a pending order. $network: trc20|bep20|erc20 */
    public function initCryptoPayment(string $paymentId, string $network): array
    {
        return $this->plainRequest('POST',
            '/api/v1/public/payment/' . urlencode($paymentId) . '/crypto/init',
            ['network' => $network]);
    }

    /** Verify a customer-submitted transaction hash. Idempotent. */
    public function verifyCryptoPayment(string $cryptoPaymentId, string $txHash): array
    {
        return $this->plainRequest('POST', '/api/v1/public/crypto/verify',
            ['crypto_payment_id' => $cryptoPaymentId, 'tx_hash' => $txHash]);
    }

    /* ── Webhooks ─────────────────────────────────────────────────────── */

    /**
     * Verify and decode a webhook. Returns the event array, or null if the
     * signature is invalid (always discard those).
     */
    public function parseWebhook(string $rawBody, string $signatureHeader, string $webhookSecret): ?array
    {
        $expected = hash_hmac('sha256', $rawBody, $webhookSecret);
        if (!hash_equals($expected, $signatureHeader)) {
            return null;
        }
        $data = json_decode($rawBody, true);
        return is_array($data) ? $data : null;
    }

    /* ── Internals ────────────────────────────────────────────────────── */

    private function signedRequest(string $method, string $path, array $body = [], ?string $idempotencyKey = null): array
    {
        $timestamp = (string) time();
        $payload   = $method === 'GET' ? '' : json_encode($body, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, $this->apiSecret);

        $headers = [
            'Content-Type: application/json',
            'X-API-KEY: '    . $this->apiKey,
            'X-TIMESTAMP: '  . $timestamp,
            'X-SIGNATURE: '  . $signature,
        ];
        if ($idempotencyKey !== null) {
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }
        return $this->execute($method, $path, $payload, $headers);
    }

    private function plainRequest(string $method, string $path, array $body = []): array
    {
        $payload = $method === 'GET' ? '' : json_encode($body, JSON_UNESCAPED_SLASHES);
        return $this->execute($method, $path, $payload, ['Content-Type: application/json']);
    }

    private function execute(string $method, string $path, string $payload, array $headers): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 30,
        ]);
        if ($payload !== '') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        $response = curl_exec($ch);
        $errno    = curl_errno($ch);
        $status   = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($errno !== 0 || $response === false) {
            throw new NovaPayException('NovaPay request failed: network error');
        }
        $data = json_decode($response, true);
        if (!is_array($data)) {
            throw new NovaPayException('NovaPay request failed: invalid response (HTTP ' . $status . ')');
        }
        if ($status >= 400 || (isset($data['success']) && $data['success'] === false)) {
            throw new NovaPayException($data['error'] ?? ('NovaPay error (HTTP ' . $status . ')'));
        }
        return $data['data'] ?? $data;
    }
}
