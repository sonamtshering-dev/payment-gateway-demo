/**
 * NovaPay Node.js SDK
 * -------------------
 * Zero-dependency client for the NovaPay Payment Gateway (https://nova-pay.in).
 * Requires Node.js 18+ (built-in fetch).
 *
 * Usage:
 *   const NovaPay = require('./novapay');
 *   const novapay = new NovaPay(process.env.NOVAPAY_API_KEY, process.env.NOVAPAY_API_SECRET);
 *
 *   // 1) Create a payment (amount in paise: ₹499.00 => 49900)
 *   const payment = await novapay.createPayment({
 *     order_id: 'ORD-1001',
 *     amount: 49900,
 *     currency: 'INR',
 *     customer_reference: 'Invoice #1001',
 *     redirect_url: 'https://yourstore.com/thank-you',
 *   });
 *   res.redirect(novapay.checkoutUrl(payment.payment_id));
 *
 *   // 2) In your webhook route (use the RAW request body):
 *   const event = novapay.parseWebhook(rawBody, req.headers['x-webhook-signature'], WEBHOOK_SECRET);
 *   if (event && event.status === 'paid') { // mark order paid }
 */

'use strict';

const crypto = require('crypto');

class NovaPayError extends Error {}

class NovaPay {
  /**
   * @param {string} apiKey
   * @param {string} apiSecret
   * @param {string} [baseUrl]
   */
  constructor(apiKey, apiSecret, baseUrl = 'https://nova-pay.in') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /* ── Payments ─────────────────────────────────────────────────────── */

  /**
   * Create a payment. Required: order_id, amount (paise), currency ('INR').
   * Optional: customer_reference, redirect_url, expires_in_hours,
   *           notify_on_paid, collect_customer_details.
   */
  createPayment(params, idempotencyKey) {
    return this.#signed('POST', '/api/v1/payments/create', params, idempotencyKey);
  }

  /** Payment status via the authenticated API. */
  getPaymentStatus(paymentId) {
    return this.#signed('GET', `/api/v1/payments/status/${encodeURIComponent(paymentId)}`);
  }

  /** Public payment status — no auth, safe for frontend polling. */
  getPublicStatus(paymentId) {
    return this.#plain('GET', `/api/v1/public/payment/${encodeURIComponent(paymentId)}`);
  }

  /** Hosted checkout page URL for a created payment. */
  checkoutUrl(paymentId) {
    return `${this.baseUrl}/pay/${paymentId}`;
  }

  /* ── Crypto (USDT) ────────────────────────────────────────────────── */

  /** Start a USDT payment for a pending order. network: trc20|bep20|erc20 */
  initCryptoPayment(paymentId, network) {
    return this.#plain('POST', `/api/v1/public/payment/${encodeURIComponent(paymentId)}/crypto/init`, { network });
  }

  /** Verify a customer-submitted transaction hash. Idempotent. */
  verifyCryptoPayment(cryptoPaymentId, txHash) {
    return this.#plain('POST', '/api/v1/public/crypto/verify', {
      crypto_payment_id: cryptoPaymentId,
      tx_hash: txHash,
    });
  }

  /* ── Webhooks ─────────────────────────────────────────────────────── */

  /**
   * Verify and decode a webhook. Pass the RAW request body string (not the
   * parsed object). Returns the event, or null if the signature is invalid.
   */
  parseWebhook(rawBody, signatureHeader, webhookSecret) {
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signatureHeader || ''));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  }

  /* ── Internals ────────────────────────────────────────────────────── */

  async #signed(method, path, body, idempotencyKey) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = method === 'GET' ? '' : JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.#execute(method, path, payload, headers);
  }

  async #plain(method, path, body) {
    const payload = method === 'GET' ? '' : JSON.stringify(body);
    return this.#execute(method, path, payload, { 'Content-Type': 'application/json' });
  }

  async #execute(method, path, payload, headers) {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers,
      body: payload || undefined,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new NovaPayError(`NovaPay request failed: invalid response (HTTP ${res.status})`);
    }
    if (!res.ok || data.success === false) {
      throw new NovaPayError(data.error || `NovaPay error (HTTP ${res.status})`);
    }
    return data.data !== undefined ? data.data : data;
  }
}

module.exports = NovaPay;
module.exports.NovaPayError = NovaPayError;
