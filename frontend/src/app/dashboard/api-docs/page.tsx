'use client';

import React, { useState, useEffect } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nova-pay.in';

// ════════════════════════════════════════════════════════════════════════════
// CODE SAMPLES — these mirror the backend contract exactly:
//   headers  X-API-KEY, X-TIMESTAMP (unix seconds, ±5 min), X-SIGNATURE
//   signature = hex( HMAC_SHA256( api_secret, `${timestamp}.${rawBody}` ) )
//   webhooks  X-Webhook-Signature = hex( HMAC_SHA256( webhook_secret, rawBody ) )
// ════════════════════════════════════════════════════════════════════════════

const QUICKSTART_CURL = `# 1. Compute the signature (timestamp.body, HMAC-SHA256, hex)
TIMESTAMP=$(date +%s)
BODY='{"order_id":"ORD-1001","amount":49900,"currency":"INR"}'
SIGNATURE=$(printf '%s.%s' "$TIMESTAMP" "$BODY" | \\
  openssl dgst -sha256 -hmac "$NOVAPAY_API_SECRET" -hex | awk '{print $2}')

# 2. Create the payment
curl -X POST ${BASE_URL}/api/v1/payments/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: $NOVAPAY_API_KEY" \\
  -H "X-TIMESTAMP: $TIMESTAMP" \\
  -H "X-SIGNATURE: $SIGNATURE" \\
  -d "$BODY"`;

const QUICKSTART_NODE = `const NovaPay = require('./novapay');            // SDK below — zero dependencies
const novapay = new NovaPay(API_KEY, API_SECRET);

const payment = await novapay.createPayment({
  order_id: 'ORD-1001',
  amount: 49900,                                  // paise — ₹499.00
  currency: 'INR',
  redirect_url: 'https://yourstore.com/thanks',
});

// Send the customer to the hosted checkout:
res.redirect(novapay.checkoutUrl(payment.payment_id));`;

const QUICKSTART_PHP = `require 'NovaPay.php';                           // SDK below — zero dependencies
$novapay = new NovaPay($apiKey, $apiSecret);

$payment = $novapay->createPayment([
    'order_id' => 'ORD-1001',
    'amount'   => 49900,                          // paise — ₹499.00
    'currency' => 'INR',
    'redirect_url' => 'https://yourstore.com/thanks',
]);

header('Location: ' . $novapay->checkoutUrl($payment['payment_id']));`;

const SIG_NODE = `const crypto = require('crypto');

const timestamp = String(Math.floor(Date.now() / 1000));
const body = JSON.stringify({ order_id: 'ORD-1001', amount: 49900, currency: 'INR' });

const signature = crypto
  .createHmac('sha256', process.env.NOVAPAY_API_SECRET)
  .update(\`\${timestamp}.\${body}\`)              // timestamp DOT body
  .digest('hex');

// headers: { 'X-API-KEY': key, 'X-TIMESTAMP': timestamp, 'X-SIGNATURE': signature }`;

const SIG_PHP = `$timestamp = (string) time();
$body      = json_encode(['order_id' => 'ORD-1001', 'amount' => 49900, 'currency' => 'INR']);

$signature = hash_hmac('sha256', $timestamp . '.' . $body, $apiSecret);

// headers: X-API-KEY, X-TIMESTAMP: $timestamp, X-SIGNATURE: $signature`;

const SIG_PY = `import hmac, hashlib, time, json, os

timestamp = str(int(time.time()))
body = json.dumps({"order_id": "ORD-1001", "amount": 49900, "currency": "INR"},
                  separators=(",", ":"))

signature = hmac.new(
    os.environ["NOVAPAY_API_SECRET"].encode(),
    f"{timestamp}.{body}".encode(),               # timestamp DOT body
    hashlib.sha256,
).hexdigest()

# headers: X-API-KEY, X-TIMESTAMP, X-SIGNATURE`;

const CREATE_RESPONSE = `{
  "success": true,
  "data": {
    "payment_id": "3b1e7a9c-…",
    "qr_code_base64": "data:image/png;base64,…",
    "upi_intent_link": "upi://pay?pa=…&am=499.00&cu=INR",
    "amount": 49900,
    "currency": "INR",
    "expires_at": "2026-07-23T12:30:00Z",
    "status": "pending"
  }
}

Hosted checkout page:  ${BASE_URL}/pay/{payment_id}`;

const STATUS_RESPONSE = `{
  "success": true,
  "data": {
    "payment_id": "3b1e7a9c-…",
    "order_id": "ORD-1001",
    "amount": 49900,
    "currency": "INR",
    "status": "paid",                // pending | paid | failed | expired
    "utr": "417822334455",
    "paid_at": "2026-07-23T12:04:11Z",
    "expires_at": "2026-07-23T12:30:00Z",
    "usdt_enabled": true,
    "crypto_networks": [{ "id": "trc20", "label": "USDT · TRC20 (Tron)" }]
  }
}`;

const CRYPTO_INIT_BODY = `curl -X POST ${BASE_URL}/api/v1/public/payment/PAYMENT_ID/crypto/init \\
  -H "Content-Type: application/json" \\
  -d '{ "network": "trc20" }'`;

const CRYPTO_INIT_RESPONSE = `{
  "success": true,
  "data": {
    "crypto_payment_id": "8f2c…",
    "network": "trc20",
    "network_label": "USDT · TRC20 (Tron)",
    "merchant_wallet": "TXYZaBc…",
    "expected_usdt": "11.340072",     // customer must send EXACTLY this
    "exchange_rate": 88.18,           // locked for this order
    "inr_amount": 100000,
    "qr_code_base64": "data:image/png;base64,…",
    "expires_at": "2026-07-23T12:30:00Z",
    "status": "pending"
  }
}`;

const CRYPTO_VERIFY_BODY = `curl -X POST ${BASE_URL}/api/v1/public/crypto/verify \\
  -H "Content-Type: application/json" \\
  -d '{ "crypto_payment_id": "8f2c…", "tx_hash": "0xabc…" }'`;

const CRYPTO_VERIFY_RESPONSE = `{
  "success": true,
  "data": {
    "status": "paid",
    "message": "Payment confirmed",
    "tx_hash": "0xabc…",
    "explorer_url": "https://tronscan.org/#/transaction/…",
    "amount_usdt": "11.340072"
  }
}

// Checks performed on-chain: recipient = merchant wallet, official USDT
// contract, exact amount, confirmations, expiry window, hash never used
// before. Idempotent — retrying a confirmed payment returns "paid" again.`;

const WEBHOOK_PAYLOAD = `POST {your webhook URL}
X-Webhook-Signature: 6e8b1a…            // hex HMAC-SHA256 of the raw body
X-Webhook-Timestamp: 1784747099
Content-Type: application/json

{
  "payment_id": "3b1e7a9c-…",
  "order_id": "ORD-1001",
  "amount": 49900,
  "currency": "INR",
  "status": "paid",
  "utr": "417822334455",              // UPI UTR, or crypto tx hash for USDT
  "timestamp": 1784747099,
  "signature": "6e8b1a…"
}`;

const WEBHOOK_VERIFY_NODE = `// Express — use the RAW body, not the parsed object
app.post('/webhooks/novapay', express.raw({ type: '*/*' }), (req, res) => {
  const raw = req.body.toString();
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');

  if (expected !== req.headers['x-webhook-signature']) return res.status(401).end();

  const event = JSON.parse(raw);
  if (event.status === 'paid') {
    // fulfil event.order_id — payment reference in event.utr
  }
  res.status(200).end();                // respond 2xx fast; we retry otherwise
});`;

const WEBHOOK_VERIFY_PHP = `$raw       = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$expected  = hash_hmac('sha256', $raw, $webhookSecret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit;
}

$event = json_decode($raw, true);
if (($event['status'] ?? '') === 'paid') {
    // fulfil $event['order_id'] — payment reference in $event['utr']
}
http_response_code(200);`;

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINT REFERENCE — only endpoints that actually exist on the gateway
// ════════════════════════════════════════════════════════════════════════════

interface Endpoint {
  method: string;
  path: string;
  title: string;
  desc: string;
  auth: 'HMAC' | 'None' | 'JWT';
  params?: { name: string; type: string; required: boolean; desc: string }[];
  body?: string;
  response?: string;
}

const ENDPOINT_GROUPS: { name: string; color: string; note?: string; endpoints: Endpoint[] }[] = [
  {
    name: 'Payments API',
    color: '#2563EB',
    note: 'Server-to-server. Signed with your API key + secret (see Authentication). Optional Idempotency-Key header on POSTs — same key returns the cached response for 24h.',
    endpoints: [
      {
        method: 'POST', path: '/api/v1/payments/create', title: 'Create Payment', auth: 'HMAC',
        desc: 'Create an order and get the QR, UPI intent link and hosted checkout page.',
        params: [
          { name: 'order_id', type: 'string', required: true, desc: 'Your unique order ID (1–64 chars). Reusing an active one fails.' },
          { name: 'amount', type: 'integer', required: true, desc: 'Amount in paise. Min 100 (₹1.00).' },
          { name: 'currency', type: 'string', required: true, desc: 'Must be "INR". USDT conversion happens at checkout.' },
          { name: 'customer_reference', type: 'string', required: false, desc: 'Shown on the checkout page (max 128).' },
          { name: 'redirect_url', type: 'string', required: false, desc: 'Where the customer is sent after paying. The checkout page auto-redirects after 5 seconds with ?order_id=…&status=paid appended.' },
          { name: 'expires_in_hours', type: 'integer', required: false, desc: 'Payment window. Default: 15 minutes.' },
          { name: 'notify_on_paid', type: 'boolean', required: false, desc: 'Email you when this payment completes.' },
          { name: 'collect_customer_details', type: 'boolean', required: false, desc: 'Ask the customer for name/email/phone at checkout.' },
        ],
        body: QUICKSTART_CURL,
        response: CREATE_RESPONSE,
      },
      {
        method: 'GET', path: '/api/v1/payments/status/:payment_id', title: 'Get Payment (authenticated)', auth: 'HMAC',
        desc: 'Fetch a payment with full details. Sign with an empty body.',
        response: STATUS_RESPONSE,
      },
      {
        method: 'POST', path: '/api/v1/payments/verify', title: 'Manual Verify (UPI)', auth: 'HMAC',
        desc: 'Mark a pending payment paid with a UTR you have confirmed yourself. Most integrations never need this — auto-verification and webhooks handle it.',
        params: [
          { name: 'payment_id', type: 'string', required: true, desc: 'Payment to verify' },
          { name: 'utr', type: 'string', required: true, desc: 'Bank UTR (6–32 chars)' },
          { name: 'amount', type: 'integer', required: true, desc: 'Must equal the order amount (paise)' },
        ],
        response: `{ "success": true, "message": "payment verified" }`,
      },
    ],
  },
  {
    name: 'Checkout (public)',
    color: '#7C3AED',
    note: 'No authentication — safe to call from your frontend or the customer’s browser.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/public/payment/:payment_id', title: 'Get Payment Status', auth: 'None',
        desc: 'Poll payment status from the browser. Includes USDT availability for the merchant.',
        response: STATUS_RESPONSE,
      },
    ],
  },
  {
    name: 'Crypto — USDT',
    color: '#26A17B',
    note: 'Customer pays USDT directly to the merchant wallet (TRC20 / BEP20 / ERC20); NovaPay verifies the transaction on-chain. Enable it in Merchants → Crypto Payments.',
    endpoints: [
      {
        method: 'POST', path: '/api/v1/public/payment/:payment_id/crypto/init', title: 'Init USDT Payment', auth: 'None',
        desc: 'Lock the exchange rate and get the wallet + exact USDT amount for an order.',
        params: [{ name: 'network', type: 'string', required: true, desc: 'trc20 | bep20 | erc20' }],
        body: CRYPTO_INIT_BODY,
        response: CRYPTO_INIT_RESPONSE,
      },
      {
        method: 'POST', path: '/api/v1/public/crypto/verify', title: 'Verify Transaction Hash', auth: 'None',
        desc: 'Verify the customer-submitted TxID on-chain and settle the order. Rate-limited per IP.',
        params: [
          { name: 'crypto_payment_id', type: 'string', required: true, desc: 'From the init response' },
          { name: 'tx_hash', type: 'string', required: true, desc: 'Transaction hash of the USDT transfer' },
        ],
        body: CRYPTO_VERIFY_BODY,
        response: CRYPTO_VERIFY_RESPONSE,
      },
    ],
  },
];

const ERRORS = [
  { status: '401', code: 'MISSING_HEADERS', desc: 'X-API-KEY, X-SIGNATURE or X-TIMESTAMP header missing' },
  { status: '401', code: 'INVALID_API_KEY', desc: 'API key not recognised (rotated or wrong environment?)' },
  { status: '401', code: 'INVALID_TIMESTAMP', desc: 'Timestamp outside the ±5 minute window — check server clock' },
  { status: '401', code: 'INVALID_SIGNATURE', desc: 'HMAC mismatch — sign the exact raw body you send, as timestamp.body' },
  { status: '400', code: '—', desc: 'Validation error — the message says which field' },
  { status: '429', code: 'RATE_LIMIT_EXCEEDED', desc: 'Payments API: 60 req/min per IP. Auth endpoints (login, OTP): 10/min. Forgot-password: 5/min. Back off and retry.' },
  { status: '500', code: '—', desc: 'Gateway error — safe to retry with the same Idempotency-Key' },
];

const SDKS = [
  {
    name: 'PHP SDK', file: '/downloads/novapay-php-sdk.zip',
    desc: 'Single-file client: create payments, poll status, verify webhooks, USDT helpers. PHP 8+, no dependencies.',
    icon: 'PHP', color: '#777BB3',
  },
  {
    name: 'Node.js SDK', file: '/downloads/novapay-node-sdk.zip',
    desc: 'Zero-dependency client for Node 18+. Same coverage as PHP, with timing-safe webhook verification.',
    icon: 'JS', color: '#F7DF1E',
  },
  {
    name: 'WooCommerce Plugin', file: '/downloads/novapay-woocommerce.zip',
    desc: 'Drop-in WordPress plugin: hosted checkout at cart, signed webhooks auto-complete orders. No coding.',
    icon: 'WP', color: '#21759B',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// UI helpers
// ════════════════════════════════════════════════════════════════════════════

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    try { navigator.clipboard.writeText(code); } catch {
      const el = document.createElement('textarea'); el.value = code;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ position: 'relative', background: '#0F172A', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #1E293B' }}>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>{label || 'code'}</span>
        <button onClick={doCopy} style={{ background: copied ? '#14532D' : '#1E293B', border: 'none', borderRadius: 6, padding: '4px 10px', color: copied ? '#4ADE80' : '#94A3B8', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, color: '#E2E8F0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{code}</pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    GET:    { bg: '#EFF6FF', color: '#2563EB' },
    POST:   { bg: '#F0FDF4', color: '#059669' },
    PUT:    { bg: '#FFFBEB', color: '#D97706' },
    DELETE: { bg: '#FEF2F2', color: '#DC2626' },
  };
  const s = styles[method] || styles.GET;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 800, borderRadius: 6, padding: '3px 8px', letterSpacing: '.03em', flexShrink: 0 }}>{method}</span>
  );
}

function AuthBadge({ auth }: { auth: string }) {
  if (auth === 'None') return <span style={{ fontSize: 10.5, fontWeight: 700, color: '#059669', background: '#F0FDF4', borderRadius: 6, padding: '3px 8px' }}>Public</span>;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: '#D97706', background: '#FFFBEB', borderRadius: 6, padding: '3px 8px' }}>Signed</span>;
}

function Tabs({ tabs, children }: { tabs: string[]; children: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActive(i)}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, background: active === i ? '#0F172A' : '#F1F5F9', color: active === i ? '#fff' : '#64748B', transition: 'all .12s' }}>
            {t}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════

interface IPEntry { id: string; ip_cidr: string; label: string; created_at: string; }

export default function ApiDocsPage() {
  const [openEndpoint, setOpenEndpoint] = useState<string | null>(null);

  // ── Credentials & settings state (live data) ──
  const [profile, setProfile] = useState<any>(null);
  const [apiSecret, setApiSecret] = useState('');
  const [webhook, setWebhook] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWHSecret, setShowWHSecret] = useState(false);
  const [copied, setCopied] = useState('');
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotatedKeys, setRotatedKeys] = useState<{ api_key: string; api_secret: string } | null>(null);
  const [ipList, setIPList] = useState<IPEntry[]>([]);
  const [newIP, setNewIP] = useState('');
  const [newIPLabel, setNewIPLabel] = useState('');
  const [flashMsg, setFlashMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const flash = (text: string, ok = true) => { setFlashMsg({ ok, text }); setTimeout(() => setFlashMsg(null), 4000); };

  const fetchIPList = () =>
    fetch('/api/v1/dashboard/ip-whitelist', { headers: hdrs }).then(r => r.json())
      .then(d => { if (d.success) setIPList(d.data || []); });

  useEffect(() => {
    fetch('/api/v1/dashboard/profile', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setProfile(d.data); });
    fetch('/api/v1/dashboard/webhook', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setWebhook(d.data?.webhook_url || ''); });
    fetch('/api/v1/dashboard/webhook-secret', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setWebhookSecret(d.data?.webhook_secret || ''); });
    fetch('/api/v1/dashboard/api-secret', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setApiSecret(d.data?.api_secret || ''); });
    fetchIPList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (text: string, key: string) => {
    try { navigator.clipboard.writeText(text); } catch {
      const el = document.createElement('textarea'); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove();
    }
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  const handleRotate = async () => {
    if (!confirm('Rotate API keys? Existing integrations stop working until updated.')) return;
    setRotating(true);
    try {
      const r = await fetch('/api/v1/dashboard/rotate-keys', { method: 'POST', headers: hdrs });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to rotate keys');
      setProfile((p: any) => ({ ...p, api_key: d.data.api_key }));
      setApiSecret(d.data.api_secret);
      setRotatedKeys({ api_key: d.data.api_key, api_secret: d.data.api_secret });
    } catch (e: any) { flash(e.message, false); }
    finally { setRotating(false); }
  };

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/v1/dashboard/webhook', { method: 'PUT', headers: hdrs, body: JSON.stringify({ webhook_url: webhook }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save');
      flash('Webhook URL saved');
    } catch (e: any) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const handleAddIP = async () => {
    if (!newIP.trim()) return;
    try {
      const r = await fetch('/api/v1/dashboard/ip-whitelist', { method: 'POST', headers: hdrs, body: JSON.stringify({ ip_cidr: newIP.trim(), label: newIPLabel.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to add IP');
      setNewIP(''); setNewIPLabel('');
      await fetchIPList(); flash('IP added to whitelist');
    } catch (e: any) { flash(e.message, false); }
  };

  const handleDeleteIP = async (id: string) => {
    try {
      await fetch(`/api/v1/dashboard/ip-whitelist/${id}`, { method: 'DELETE', headers: hdrs });
      await fetchIPList(); flash('IP removed');
    } catch { flash('Failed to remove IP', false); }
  };

  const mask = (v: string) => (v ? v.slice(0, 6) + '••••••••••••' + v.slice(-4) : '—');
  const credInp: React.CSSProperties = { flex: 1, minWidth: 0, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 11px', color: '#0F172A', fontSize: 12, fontFamily: 'ui-monospace, monospace', outline: 'none' };
  const credBtn: React.CSSProperties = { background: '#F1F5F9', border: 'none', borderRadius: 7, padding: '8px 12px', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 };

  const sections = [
    { id: 'credentials', label: 'Credentials' },
    { id: 'quickstart', label: 'Quick Start' },
    { id: 'auth', label: 'Authentication' },
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'errors', label: 'Errors' },
    { id: 'sdks', label: 'SDKs & Plugins' },
  ];

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={{ maxWidth: 860, fontFamily: 'inherit' }}>
      <style>{`
        .doc-card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:22px 24px; margin-bottom:16px; scroll-margin-top: 20px; }
        .doc-h2 { font-size:17px; font-weight:800; color:#0F172A; letter-spacing:-.02em; margin:0 0 4px; }
        .doc-sub { font-size:13px; color:#64748B; margin:0 0 16px; line-height:1.65; }
        .doc-ep:hover { background:#F8FAFC; }
        .doc-table th { text-align:left; font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:.07em; padding:8px 12px; }
        .doc-table td { font-size:12.5px; color:#334155; padding:9px 12px; border-top:1px solid #F1F5F9; vertical-align:top; }
        .doc-chip:hover { background:#E2E8F0 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-.03em' }}>API Documentation</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
          Everything you need to accept UPI and USDT payments through NovaPay. Base URL:{' '}
          <code style={{ background: '#F1F5F9', borderRadius: 5, padding: '2px 7px', fontSize: 12.5, color: '#0F172A' }}>{BASE_URL}</code>
        </p>
      </div>

      {/* ── Section nav ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => jump(s.id)} className="doc-chip"
            style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#334155', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .12s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Toast ── */}
      {flashMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, background: flashMsg.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${flashMsg.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius: 10, padding: '11px 16px', color: flashMsg.ok ? '#059669' : '#DC2626', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          {flashMsg.text}
        </div>
      )}

      {/* ── Rotated keys modal ── */}
      {rotatedKeys && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: '2px solid #FDE68A', borderRadius: 20, padding: '28px 32px', maxWidth: 540, width: '100%' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#D97706', marginBottom: 8 }}>Save your new credentials now</div>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              Your API Secret is shown <strong style={{ color: '#D97706' }}>only here</strong>. Once you close this dialog it cannot be retrieved — only rotated again.
            </p>
            {([['New API Key', rotatedKeys.api_key, 'rot-key'], ['New API Secret', rotatedKeys.api_secret, 'rot-sec']] as const).map(([label, val, key]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={val} style={credInp} />
                  <button onClick={() => copy(val, key)} style={{ ...credBtn, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706' }}>
                    {copied === key ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setRotatedKeys(null)}
              style={{ width: '100%', marginTop: 8, background: '#2563EB', border: 'none', borderRadius: 10, padding: '11px 0', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
              I&apos;ve saved them — Close
            </button>
          </div>
        </div>
      )}

      {/* ── Credentials & setup ── */}
      <div className="doc-card" id="credentials">
        <h2 className="doc-h2">Credentials &amp; Setup</h2>
        <p className="doc-sub">Your live keys and webhook configuration. The API secret signs every request — keep it server-side only.</p>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>API Key</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={showKey ? (profile?.api_key || '') : mask(profile?.api_key || '')} style={credInp} />
              <button style={credBtn} onClick={() => setShowKey(s => !s)}>{showKey ? 'Hide' : 'Show'}</button>
              <button style={credBtn} onClick={() => copy(profile?.api_key || '', 'k')}>{copied === 'k' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>API Secret</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={showSecret ? apiSecret : mask(apiSecret)} style={credInp} />
              <button style={credBtn} onClick={() => setShowSecret(s => !s)}>{showSecret ? 'Hide' : 'Show'}</button>
              <button style={credBtn} onClick={() => copy(apiSecret, 's')}>{copied === 's' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Webhook URL</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourserver.com/webhooks/novapay" style={credInp} />
              <button onClick={handleSaveWebhook} disabled={saving}
                style={{ ...credBtn, background: '#2563EB', color: '#fff' }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Webhook Secret</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={showWHSecret ? webhookSecret : mask(webhookSecret)} style={credInp} />
              <button style={credBtn} onClick={() => setShowWHSecret(s => !s)}>{showWHSecret ? 'Hide' : 'Show'}</button>
              <button style={credBtn} onClick={() => copy(webhookSecret, 'w')}>{copied === 'w' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Compromised keys? Rotate immediately — old keys stop working at once.</div>
          <button onClick={handleRotate} disabled={rotating}
            style={{ ...credBtn, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
            {rotating ? 'Rotating…' : 'Rotate API Keys'}
          </button>
        </div>

        {/* IP whitelist */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>IP Whitelist <span style={{ fontWeight: 500, color: '#94A3B8', fontSize: 12 }}>(optional)</span></div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>When set, Payments API calls are accepted only from these IPs/CIDRs.</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input value={newIP} onChange={e => setNewIP(e.target.value)} placeholder="203.0.113.10 or 203.0.113.0/24" style={{ ...credInp, flex: 2, minWidth: 180 }} />
            <input value={newIPLabel} onChange={e => setNewIPLabel(e.target.value)} placeholder="Label (e.g. prod server)" style={{ ...credInp, flex: 1, minWidth: 120 }} />
            <button style={{ ...credBtn, background: '#2563EB', color: '#fff' }} onClick={handleAddIP}>Add</button>
          </div>
          {ipList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ipList.map(ip => (
                <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', borderRadius: 8, padding: '8px 12px' }}>
                  <code style={{ fontSize: 12, color: '#0F172A', fontWeight: 600 }}>{ip.ip_cidr}</code>
                  <span style={{ fontSize: 12, color: '#94A3B8', flex: 1 }}>{ip.label}</span>
                  <button onClick={() => handleDeleteIP(ip.id)} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick start ── */}
      <div className="doc-card" id="quickstart">
        <h2 className="doc-h2">Quick Start</h2>
        <p className="doc-sub">From zero to a live payment in four steps.</p>

        {[
          { n: 1, t: 'Get your keys', d: <>Grab your <strong>API Key</strong> and <strong>API Secret</strong> from this page&apos;s Credentials section (or rotate them under Security). Keep the secret server-side — never in frontend code.</> },
          { n: 2, t: 'Create a payment', d: <>One signed POST creates the order and returns a <code>payment_id</code>.</> },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{step.n}</div>
            <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65 }}><strong style={{ color: '#0F172A' }}>{step.t}.</strong> {step.d}</div>
          </div>
        ))}

        <div style={{ margin: '14px 0 18px' }}>
          <Tabs tabs={['Node.js', 'PHP', 'curl']}>
            {[<CodeBlock key="n" code={QUICKSTART_NODE} label="Node.js" />,
              <CodeBlock key="p" code={QUICKSTART_PHP} label="PHP" />,
              <CodeBlock key="c" code={QUICKSTART_CURL} label="bash" />]}
          </Tabs>
        </div>

        {[
          { n: 3, t: 'Send the customer to checkout', d: <>Redirect to <code>{BASE_URL}/pay/{'{payment_id}'}</code> — QR, UPI apps, and USDT (if you enabled it) are all handled there. Or render the returned QR yourself.</> },
          { n: 4, t: 'Get paid', d: <>Payments confirm automatically. Your webhook receives a signed <code>paid</code> event (see Webhooks below). The checkout page auto-redirects the customer to your <code>redirect_url</code> after 5 seconds with <code>?order_id=…&amp;status=paid</code> appended — or immediately on button click.</> },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{step.n}</div>
            <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65 }}><strong style={{ color: '#0F172A' }}>{step.t}.</strong> {step.d}</div>
          </div>
        ))}
      </div>

      {/* ── Authentication ── */}
      <div className="doc-card" id="auth">
        <h2 className="doc-h2">Authentication</h2>
        <p className="doc-sub">
          Payments API requests are signed with three headers. The signature is an HMAC-SHA256 (hex) of the string{' '}
          <code style={{ background: '#F1F5F9', borderRadius: 5, padding: '1px 6px' }}>timestamp + &quot;.&quot; + rawBody</code>, keyed with your API secret.
          For GET requests the body is the empty string. Timestamps must be unix seconds within ±5 minutes.
        </p>

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table className="doc-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#F8FAFC', borderRadius: 10 }}>
            <thead><tr><th>Header</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td><code>X-API-KEY</code></td><td>Your API key</td></tr>
              <tr><td><code>X-TIMESTAMP</code></td><td>Unix seconds, e.g. <code>1784747099</code></td></tr>
              <tr><td><code>X-SIGNATURE</code></td><td><code>hex(HMAC_SHA256(secret, timestamp + &quot;.&quot; + body))</code></td></tr>
              <tr><td><code>Idempotency-Key</code></td><td>Optional on POSTs — repeats return the cached response for 24h</td></tr>
            </tbody>
          </table>
        </div>

        <Tabs tabs={['Node.js', 'PHP', 'Python']}>
          {[<CodeBlock key="n" code={SIG_NODE} label="Node.js" />,
            <CodeBlock key="p" code={SIG_PHP} label="PHP" />,
            <CodeBlock key="y" code={SIG_PY} label="Python" />]}
        </Tabs>

        <div style={{ marginTop: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#92400E', lineHeight: 1.6 }}>
          <strong>Signature mismatches?</strong> Sign the exact bytes you send — serialize the JSON once and reuse that string for both the signature and the request body. A re-serialized body with different key order or spacing will fail.
        </div>
      </div>

      {/* ── Endpoints ── */}
      <div id="endpoints">
        {ENDPOINT_GROUPS.map(group => (
          <div className="doc-card" key={group.name} style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 16, borderRadius: 2, background: group.color }} />
                <h2 className="doc-h2" style={{ margin: 0 }}>{group.name}</h2>
              </div>
              {group.note && <p className="doc-sub" style={{ margin: '8px 0 0' }}>{group.note}</p>}
            </div>
            {group.endpoints.map(ep => {
              const key = ep.method + ep.path;
              const open = openEndpoint === key;
              return (
                <div key={key} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <div className="doc-ep" onClick={() => setOpenEndpoint(open ? null : key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 24px', cursor: 'pointer', transition: 'background .1s' }}>
                    <MethodBadge method={ep.method} />
                    <code style={{ fontSize: 12.5, color: '#0F172A', fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{ep.path}</code>
                    <AuthBadge auth={ep.auth} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"
                      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {open && (
                    <div style={{ padding: '4px 24px 20px', background: '#FCFDFE' }}>
                      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, marginBottom: 14 }}>{ep.desc}</div>
                      {ep.params && (
                        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                          <table className="doc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                            <tbody>
                              {ep.params.map(p => (
                                <tr key={p.name}>
                                  <td><code style={{ fontSize: 12 }}>{p.name}</code></td>
                                  <td style={{ color: '#7C3AED' }}>{p.type}</td>
                                  <td>{p.required ? <span style={{ color: '#DC2626', fontWeight: 700 }}>yes</span> : 'no'}</td>
                                  <td>{p.desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {ep.body && <div style={{ marginBottom: 12 }}><CodeBlock code={ep.body} label="request" /></div>}
                      {ep.response && <CodeBlock code={ep.response} label="response" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Webhooks ── */}
      <div className="doc-card" id="webhooks">
        <h2 className="doc-h2">Webhooks</h2>
        <p className="doc-sub">
          Set your webhook URL above in this page&apos;s Webhook section. When a payment completes (UPI or USDT) we POST a signed
          event to it. Failed deliveries retry automatically with exponential backoff (up to 5 attempts) — always respond
          2xx quickly and process asynchronously. Verify the signature on <strong>every</strong> delivery before trusting it.
        </p>
        <div style={{ marginBottom: 14 }}><CodeBlock code={WEBHOOK_PAYLOAD} label="delivery" /></div>
        <Tabs tabs={['Node.js', 'PHP']}>
          {[<CodeBlock key="n" code={WEBHOOK_VERIFY_NODE} label="Node.js" />,
            <CodeBlock key="p" code={WEBHOOK_VERIFY_PHP} label="PHP" />]}
        </Tabs>
      </div>

      {/* ── Errors ── */}
      <div className="doc-card" id="errors">
        <h2 className="doc-h2">Errors</h2>
        <p className="doc-sub">All errors return <code>{`{ "success": false, "error": "…" }`}</code> with a conventional HTTP status.</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="doc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th>Status</th><th>Code</th><th>Meaning &amp; fix</th></tr></thead>
            <tbody>
              {ERRORS.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: e.status.startsWith('4') ? '#D97706' : '#DC2626' }}>{e.status}</td>
                  <td><code style={{ fontSize: 11.5 }}>{e.code}</code></td>
                  <td>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SDKs ── */}
      <div className="doc-card" id="sdks">
        <h2 className="doc-h2">SDKs &amp; Plugins</h2>
        <p className="doc-sub">Official integration kits — zero dependencies, matching this API exactly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
          {SDKS.map(sdk => (
            <a key={sdk.name} href={sdk.file} download
              style={{ display: 'block', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', textDecoration: 'none', transition: 'border-color .15s', background: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: sdk.color + '22', color: sdk.color === '#F7DF1E' ? '#B45309' : sdk.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, marginBottom: 10 }}>{sdk.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{sdk.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55, marginBottom: 10 }}>{sdk.desc}</div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2563EB' }}>Download ZIP ↓</span>
            </a>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '8px 0 30px', fontSize: 12, color: '#94A3B8' }}>
        Need help integrating? <a href="/contact" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Contact support</a> — we usually respond within a few hours.
      </div>
    </div>
  );
}
