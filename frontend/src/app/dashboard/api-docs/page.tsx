'use client';
import React, { useEffect, useState } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nova-pay.in';

// ── Code snippets ─────────────────────────────────────────────────────────────

const SIGNATURE_JS = `const crypto = require('crypto');

function signRequest(apiSecret, timestamp, body) {
  // message = timestamp + "." + raw JSON body string
  const message = \`\${timestamp}.\${body}\`;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('hex');
}

// Always use the EXACT same JSON string you send as the body
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify({ order_id: 'ORD-001', amount: 49900, currency: 'INR' });
const signature = signRequest(process.env.NOVAPAY_API_SECRET, timestamp, body);

// Then send the request:
// headers: { 'X-API-Key': process.env.NOVAPAY_API_KEY, 'X-Timestamp': timestamp, 'X-Signature': signature }`;

const SIGNATURE_PY = `import hmac, hashlib, time, json, os

def sign_request(api_secret: str, body_dict: dict) -> tuple[str, str]:
    timestamp = str(int(time.time()))
    # separators=(',',':') produces compact JSON — same as your request body
    body = json.dumps(body_dict, separators=(',', ':'))
    message = f"{timestamp}.{body}"
    sig = hmac.new(api_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return timestamp, sig

# Usage:
timestamp, sig = sign_request(os.environ['NOVAPAY_API_SECRET'], payload_dict)
# headers: { 'X-API-Key': os.environ['NOVAPAY_API_KEY'], 'X-Timestamp': timestamp, 'X-Signature': sig }`;

const SIGNATURE_PHP = `<?php
function signRequest(string $apiSecret, string $timestamp, string $body): string {
    // message = timestamp + "." + raw JSON body
    $message = $timestamp . '.' . $body;
    return hash_hmac('sha256', $message, $apiSecret);
}

$timestamp = (string) time();
$body = json_encode(['order_id' => 'ORD-001', 'amount' => 49900, 'currency' => 'INR'],
                     JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$signature = signRequest($_ENV['NOVAPAY_API_SECRET'], $timestamp, $body);

// Then send with curl:
// $headers = ["X-API-Key: {$_ENV['NOVAPAY_API_KEY']}", "X-Timestamp: $timestamp", "X-Signature: $signature"];
?>`;

const CREATE_HEADERS = `X-API-Key:          upay_your_api_key_here
X-Timestamp:        1774001171
X-Signature:        a3f9c2d8e1b4...   (HMAC-SHA256 hex)
X-Idempotency-Key:  ORD-2026-00123     (your order_id — prevents double-charge)
Content-Type:       application/json`;

const CREATE_BODY = `{
  "order_id":           "ORD-2026-00123",
  "amount":             49900,
  "currency":           "INR",
  "customer_reference": "Rahul Sharma",
  "redirect_url":       "https://yoursite.com/success"
}

// Do NOT include merchant_id — your account is
// identified automatically from the X-API-Key header.`;

const CREATE_RESPONSE = `{
  "success": true,
  "data": {
    "payment_id":      "019d0aa1-af3a-79ce-aa49-336dfa67e48b",
    "order_id":        "ORD-2026-00123",
    "upi_intent_link": "upi://pay?pa=merchant@oksbi&pn=Store&am=499.00&cu=INR&tn=ORD-2026-00123",
    "qr_code_base64":  "data:image/png;base64,iVBOR...",
    "pay_url":         "https://nova-pay.in/pay/019d0aa1-af3a-79ce-aa49-336dfa67e48b",
    "amount":          49900,
    "currency":        "INR",
    "status":          "pending",
    "expires_at":      "2026-03-20T09:10:38Z"
  }
}`;

const STATUS_RESPONSE = `{
  "success": true,
  "data": {
    "payment_id": "019d0aa1-af3a-79ce-aa49-336dfa67e48b",
    "order_id":   "ORD-2026-00123",
    "amount":     49900,
    "currency":   "INR",
    "status":     "paid",
    "paid_at":    "2026-03-20T09:15:10Z",
    "utr":        "607931415985"
  }
}`;

const CURL_EXAMPLE = `# Set your credentials (copy from API Credentials tab)
API_KEY="upay_your_api_key"
API_SECRET="your_api_secret"
BASE="https://nova-pay.in/api/v1"

TIMESTAMP=$(date +%s)
BODY='{"order_id":"ORD-001","amount":49900,"currency":"INR","redirect_url":"https://yoursite.com/success"}'

# Generate HMAC-SHA256 signature: timestamp + "." + body
SIG=$(echo -n "\${TIMESTAMP}.\${BODY}" | \\
  openssl dgst -sha256 -hmac "\${API_SECRET}" | \\
  awk '{print $2}')

curl -X POST \${BASE}/payments/create \\
  -H "X-API-Key: \${API_KEY}" \\
  -H "X-Timestamp: \${TIMESTAMP}" \\
  -H "X-Signature: \${SIG}" \\
  -H "Content-Type: application/json" \\
  -d "\${BODY}"

# Check payment status (no auth needed)
# curl \${BASE}/public/payment/{payment_id}`;

const WEBHOOK_PAYLOAD = `{
  "event":      "payment.success",
  "payment_id": "019d0aa1-af3a-79ce-aa49-336dfa67e48b",
  "order_id":   "ORD-2026-00123",
  "amount":     49900,
  "status":     "paid",
  "utr":        "607931415985",
  "paid_at":    "2026-03-20T09:15:10Z"
}`;

const WEBHOOK_VERIFY_JS = `const crypto = require('crypto');

function verifyWebhook(rawBody, signature, webhookSecret) {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  // Always use timingSafeEqual — never plain ===
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// Express example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-webhook-signature'];  // header sent by NovaPay
  if (!verifyWebhook(req.body, sig, process.env.NOVAPAY_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  const event = JSON.parse(req.body);
  // Use event.payment_id to deduplicate before fulfilling order
  console.log('Payment confirmed:', event.order_id, 'UTR:', event.utr);
  res.sendStatus(200);
});`;

const WEBHOOK_VERIFY_PY = `import hmac, hashlib, os
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = os.environ['NOVAPAY_WEBHOOK_SECRET']

def verify_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/webhook', methods=['POST'])
def webhook():
    sig = request.headers.get('X-Webhook-Signature', '')  # header sent by NovaPay
    if not verify_webhook(request.data, sig, WEBHOOK_SECRET):
        return 'Invalid signature', 401
    event = request.get_json(force=True)
    # Always deduplicate using payment_id before fulfilling
    print('Payment confirmed:', event['order_id'], 'UTR:', event['utr'])
    return '', 200`;

const WEBHOOK_VERIFY_PHP = `<?php
$webhookSecret = $_ENV['NOVAPAY_WEBHOOK_SECRET'];
$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';  // header sent by NovaPay

$expected = hash_hmac('sha256', $rawBody, $webhookSecret);

// Use hash_equals — timing-safe comparison
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($rawBody, true);

// Always deduplicate using payment_id before fulfilling
if ($event['status'] === 'paid') {
    // fulfil order for $event['order_id']
    error_log('Payment confirmed: ' . $event['order_id'] . ' UTR: ' . $event['utr']);
}

http_response_code(200);
?>`;

// ── Reusable components ───────────────────────────────────────────────────────

function CodeBlock({ code, label, lang }: { code: string; label?: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
          {label}
        </div>
      )}
      <div style={{ background: '#030d1f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
            </div>
            {lang && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{lang}</span>}
          </div>
          <button
            onClick={() => { 
      try { navigator.clipboard.writeText(code); } 
      catch { const el = document.createElement('textarea'); el.value = code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
      setCopied(true); setTimeout(() => setCopied(false), 2000); 
    }}
            style={{ background: 'none', border: 'none', color: copied ? '#3b82f6' : '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'color 0.2s' }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '14px 16px', fontSize: 12, color: '#93c5fd', fontFamily: 'monospace', lineHeight: 1.75, overflowX: 'auto' as const }}>{code}</pre>
      </div>
    </div>
  );
}

function InfoBox({ type, title, children }: { type: 'info' | 'warn' | 'success'; title: string; children: React.ReactNode }) {
  const colors = {
    info:    { bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.2)',  text: '#93c5fd', icon: 'ℹ️' },
    warn:    { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.2)',  text: '#fde68a', icon: '⚠️' },
    success: { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.2)', text: '#a7f3d0', icon: '✅' },
  }[type];
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12 }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{colors.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{children}</div>;
}

function CardSubtitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>{children}</div>;
}

function MethodBadge({ method }: { method: 'POST' | 'GET' }) {
  const isPost = method === 'POST';
  return (
    <span style={{ background: isPost ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: isPost ? '#93c5fd' : '#34d399', border: `1px solid ${isPost ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.25)'}`, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
      {method}
    </span>
  );
}

function FieldTable({ rows }: { rows: { field: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 2fr', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['Field', 'Type', 'Required', 'Description'].map(h => (
          <div key={h} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{h}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 2fr', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#93c5fd', fontFamily: 'monospace' }}>{r.field}</div>
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#f59e0b', fontFamily: 'monospace' }}>{r.type}</div>
          <div style={{ padding: '10px 12px' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 4, background: r.required ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)', color: r.required ? '#fca5a5' : 'rgba(255,255,255,0.3)', border: `1px solid ${r.required ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
              {r.required ? 'required' : 'optional'}
            </span>
          </div>
          <div style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{r.desc}</div>
        </div>
      ))}
    </div>
  );
}

function LangToggle({ value, onChange, langs }: { value: string; onChange: (v: string) => void; langs?: [string,string][] }) {
  const options = langs || [['js', 'Node.js'], ['py', 'Python'], ['php', 'PHP']];
  return (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, marginBottom: 12, width: 'fit-content' }}>
      {options.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)}
          style={{ background: value === k ? 'rgba(29,78,216,0.3)' : 'transparent', border: 'none', borderRadius: 6, padding: '5px 16px', color: value === k ? '#93c5fd' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: value === k ? 700 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface IPEntry { id: string; ip_cidr: string; label: string; created_at: string; }

export default function APIDocsPage() {
  const [profile, setProfile]         = useState<any>(null);
  const [webhook, setWebhook]         = useState('');
  const [loading, setLoading]         = useState(true);
  const [rotating, setRotating]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [copied, setCopied]           = useState('');
  const [showKey, setShowKey]           = useState(false);
  const [showSecret, setShowSecret]     = useState(false);
  const [showAPISecret, setShowAPISecret] = useState(false);
  const [apiSecret, setApiSecret]       = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [rotatedKeys, setRotatedKeys]   = useState<{api_key: string; api_secret: string} | null>(null);
  const [ipList, setIPList]           = useState<IPEntry[]>([]);
  const [newIP, setNewIP]             = useState('');
  const [newIPLabel, setNewIPLabel]   = useState('');
  const [addingIP, setAddingIP]       = useState(false);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState<'credentials' | 'guide' | 'webhook'>('credentials');
  const [sigLang, setSigLang]         = useState('js');
  const [verifyLang, setVerifyLang]   = useState('js');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const getMerchantId = () => {
    try { return JSON.parse(atob(token?.split('.')[1] || '')).merchant_id || ''; } catch { return ''; }
  };

  const fetchIPList = () =>
    fetch('/api/v1/dashboard/ip-whitelist', { headers }).then(r => r.json())
      .then(d => { if (d.success) setIPList(d.data || []); });

  useEffect(() => {
    fetch('/api/v1/dashboard/profile', { headers }).then(r => r.json())
      .then(d => { if (d.success) setProfile(d.data); })
      .finally(() => setLoading(false));
    fetch('/api/v1/dashboard/webhook', { headers }).then(r => r.json())
      .then(d => { if (d.success) setWebhook(d.data?.webhook_url || ''); });
    fetch('/api/v1/dashboard/webhook-secret', { headers }).then(r => r.json())
      .then(d => { if (d.success) setWebhookSecret(d.data?.webhook_secret || ''); });
    fetch('/api/v1/dashboard/api-secret', { headers }).then(r => r.json())
      .then(d => { if (d.success) setApiSecret(d.data?.api_secret || ''); });
    fetchIPList();
  }, []);

  const copy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleRotate = async () => {
    if (!confirm('Rotate API keys? Your existing integrations will stop working until updated. You will be shown your new API Secret — save it immediately.')) return;
    setRotating(true);
    try {
      const r = await fetch('/api/v1/dashboard/rotate-keys', { method: 'POST', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setProfile((p: any) => ({ ...p, api_key: d.data.api_key }));
      setApiSecret(d.data.api_secret);
      setShowAPISecret(true);
      // Show the new credentials prominently
      setRotatedKeys({ api_key: d.data.api_key, api_secret: d.data.api_secret });
    } catch (e: any) { flash(e.message, true); }
    finally { setRotating(false); }
  };

  const handleAddIP = async () => {
    if (!newIP.trim()) return;
    setAddingIP(true);
    try {
      const r = await fetch('/api/v1/dashboard/ip-whitelist', {
        method: 'POST', headers,
        body: JSON.stringify({ ip_cidr: newIP.trim(), label: newIPLabel.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setNewIP(''); setNewIPLabel('');
      fetchIPList();
      flash('IP added to whitelist');
    } catch (e: any) { flash(e.message, true); }
    finally { setAddingIP(false); }
  };

  const handleDeleteIP = async (id: string) => {
    try {
      const r = await fetch(`/api/v1/dashboard/ip-whitelist/${id}`, { method: 'DELETE', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      fetchIPList();
      flash('IP removed');
    } catch (e: any) { flash(e.message, true); }
  };

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/v1/dashboard/webhook', { method: 'PUT', headers, body: JSON.stringify({ webhook_url: webhook }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('Webhook URL saved!');
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width: '100%', background: '#030d1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', color: '#dbeafe', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' as const };

  const TABS = [
    { key: 'credentials', label: '🔑 API Credentials' },
    { key: 'guide',       label: '📖 Integration Guide' },
    { key: 'webhook',     label: '🔗 Webhooks' },
  ];

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 760 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', color: '#3b82f6', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      {/* ── ROTATION SUCCESS MODAL ── */}
      {rotatedKeys && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0f1d35', border: '2px solid rgba(245,158,11,0.4)', borderRadius: 20, padding: '28px 32px', maxWidth: 560, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#fde68a' }}>Save your new credentials NOW</div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Your API Secret is shown <strong style={{ color: '#fde68a' }}>only here</strong>. Once you close this dialog it cannot be retrieved — only rotated again.
            </p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>New API Key</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={rotatedKeys.api_key} style={{ ...inp, flex: 1, color: '#93c5fd', fontSize: 12 }} />
                <button onClick={() => copy(rotatedKeys.api_key, 'rot-key')} style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.25)', borderRadius: 8, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                  {copied === 'rot-key' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>New API Secret <span style={{ color: '#fde68a' }}>— Save this, you won&apos;t see it again</span></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={rotatedKeys.api_secret} style={{ ...inp, flex: 1, color: '#fde68a', fontSize: 12 }} />
                <button onClick={() => copy(rotatedKeys.api_secret, 'rot-sec')} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '0 14px', color: '#fde68a', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                  {copied === 'rot-sec' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { copy(rotatedKeys.api_key + '\n' + rotatedKeys.api_secret, 'rot-both'); }}
                style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 0', color: '#fde68a', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                {copied === 'rot-both' ? '✓ Copied both' : 'Copy both'}
              </button>
              <button onClick={() => setRotatedKeys(null)}
                style={{ flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '10px 0', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                I&apos;ve saved them — Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>API Documentation</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Integrate NovaPay payments into your application</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{ flex: 1, background: activeTab === t.key ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'transparent', border: 'none', borderRadius: 9, padding: '9px 0', color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: activeTab === t.key ? 700 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ── CREDENTIALS TAB ── */}
          {activeTab === 'credentials' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>

              <SectionCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <CardTitle>API Key</CardTitle>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Send this in the <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>X-API-Key</code> header on every request</div>
                  </div>
                  <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 100 }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input style={{ ...inp, flex: 1, color: '#8b9ab5' }} readOnly value={showKey ? (profile?.api_key || '') : '••••••••••••••••••••••••••••••••'} />
                  <button onClick={() => setShowKey(s => !s)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0 14px', color: '#64748b', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => copy(profile?.api_key || '', 'apikey')} style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 10, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {copied === 'apikey' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={handleRotate} disabled={rotating} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '7px 16px', color: '#ef4444', cursor: rotating ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                    {rotating ? 'Rotating…' : '↻ Rotate Key'}
                  </button>
                  <span style={{ fontSize: 11, color: '#4b5563' }}>⚠ Rotating invalidates your current key immediately</span>
                </div>
              </SectionCard>

              <SectionCard>
                <CardTitle>API Secret</CardTitle>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                  Used to sign every payment request with HMAC-SHA256. Send as <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>X-Signature</code> — never in the request body or client-side code.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, color: '#8b9ab5' }} readOnly
                    value={showAPISecret ? apiSecret : '••••••••••••••••••••••••••••••••'} />
                  <button onClick={() => setShowAPISecret(s => !s)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0 14px', color: '#64748b', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {showAPISecret ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => copy(apiSecret, 'apisec')}
                    style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 10, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {copied === 'apisec' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
                <CardTitle>Webhook Secret</CardTitle>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                  Used to verify the <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>X-NovaPay-Signature</code> header on incoming webhooks.
                  Never expose this in client-side code.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, color: '#8b9ab5' }} readOnly
                    value={showSecret ? webhookSecret : '••••••••••••••••••••••••••••••••'} />
                  <button onClick={() => setShowSecret(s => !s)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0 14px', color: '#64748b', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => copy(webhookSecret, 'whsec')}
                    style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 10, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {copied === 'whsec' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
                <CardTitle>Merchant ID</CardTitle>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>For reference only. Do not include in API request bodies — your account is identified from the API key.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, color: '#8b9ab5' }} readOnly value={getMerchantId()} />
                  <button onClick={() => copy(getMerchantId(), 'mid')} style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 10, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {copied === 'mid' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
                <CardTitle>Base URL</CardTitle>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>All API requests go to this base URL</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, color: '#f59e0b' }} readOnly value={`${BASE_URL}/api/v1`} />
                  <button onClick={() => copy(`${BASE_URL}/api/v1`, 'baseurl')} style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 10, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {copied === 'baseurl' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
                <CardTitle>Webhook URL</CardTitle>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>NovaPay will POST payment events to this URL when payments are confirmed</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, fontFamily: 'DM Sans, sans-serif' }} value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourdomain.com/webhook/novapay" />
                  <button onClick={handleSaveWebhook} disabled={saving} style={{ background: saving ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '0 18px', color: saving ? '#4b5563' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' as const }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
                <CardTitle>IP Whitelist</CardTitle>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                  Optional — restrict your payment API to only accept calls from specific server IPs. Recommended for production.
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
                  Leave empty to allow all IPs. Supports exact IPs (<code style={{ color: '#93c5fd', fontFamily: 'monospace' }}>203.0.113.5</code>) and CIDR ranges (<code style={{ color: '#93c5fd', fontFamily: 'monospace' }}>10.0.0.0/24</code>).
                </div>

                {ipList.length > 0 && (
                  <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                    {ipList.map((entry, i) => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < ipList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <code style={{ flex: 1, fontSize: 13, color: '#93c5fd', fontFamily: 'monospace' }}>{entry.ip_cidr}</code>
                        {entry.label && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{entry.label}</span>}
                        <button onClick={() => handleDeleteIP(entry.id)}
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6, padding: '4px 10px', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newIP} onChange={e => setNewIP(e.target.value)}
                    placeholder="203.0.113.5 or 10.0.0.0/24"
                    style={{ ...inp, flex: 2 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddIP(); }}
                  />
                  <input value={newIPLabel} onChange={e => setNewIPLabel(e.target.value)}
                    placeholder="Label (optional)"
                    style={{ ...inp, flex: 1 }}
                  />
                  <button onClick={handleAddIP} disabled={addingIP || !newIP.trim()}
                    style={{ background: addingIP || !newIP.trim() ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '0 18px', color: addingIP || !newIP.trim() ? '#4b5563' : '#fff', cursor: addingIP || !newIP.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' as const }}>
                    {addingIP ? 'Adding…' : 'Add IP'}
                  </button>
                </div>
                {ipList.length > 0 && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 10 }}>
                    ⚠ Only the IPs listed above can call your payment API. Make sure your server IP is included.
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* ── INTEGRATION GUIDE TAB ── */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>

              {/* Prerequisites */}
              <SectionCard>
                <CardTitle>Before You Start</CardTitle>
                <CardSubtitle>You need three things from the API Credentials tab. Keep them in environment variables — never hardcode them.</CardSubtitle>
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                  {[
                    { name: 'NOVAPAY_API_KEY',    example: 'upay_a1b2c3…',  desc: 'Sent as X-API-Key header on every payment request' },
                    { name: 'NOVAPAY_API_SECRET', example: 'sk_d4e5f6…',   desc: 'Used to sign requests with HMAC-SHA256. Never send in the body.' },
                    { name: 'NOVAPAY_WEBHOOK_SECRET', example: 'whsec_g7h8…', desc: 'Used to verify X-NovaPay-Signature on incoming webhooks' },
                  ].map((item, i, arr) => (
                    <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 2fr', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                      <div style={{ padding: '11px 14px', fontSize: 12, color: '#f59e0b', fontFamily: 'monospace' }}>{item.name}</div>
                      <div style={{ padding: '11px 14px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{item.example}</div>
                      <div style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  {[
                    ['API Key & Secret', 'credentials'],
                    ['Webhook Secret', 'credentials'],
                  ].map(([label, tab]) => (
                    <button key={label} onClick={() => setActiveTab(tab as any)}
                      style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 8, padding: '6px 14px', color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      → {label}
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Signing */}
              <SectionCard>
                <CardTitle>Step 1 — Sign Your Requests</CardTitle>
                <CardSubtitle>Every payment API request needs an HMAC-SHA256 signature. This prevents tampering and replay attacks.</CardSubtitle>

                <div style={{ background: '#030d1f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#93c5fd', lineHeight: 1.9, marginBottom: 16 }}>
                  message &nbsp;&nbsp;&nbsp;= timestamp + <span style={{ color: '#f59e0b' }}>"."</span> + raw_json_body<br/>
                  signature = HMAC-SHA256(<span style={{ color: '#f59e0b' }}>NOVAPAY_API_SECRET</span>, message)<br/>
                  X-Signature = hex(signature)
                </div>

                <LangToggle value={sigLang} onChange={setSigLang} />
                <CodeBlock
                  code={sigLang === 'js' ? SIGNATURE_JS : sigLang === 'py' ? SIGNATURE_PY : SIGNATURE_PHP}
                  lang={sigLang === 'js' ? 'JavaScript' : sigLang === 'py' ? 'Python' : 'PHP'}
                />
                <InfoBox type="warn" title="Timestamp tolerance is 5 minutes">
                  Requests older than 300 seconds are rejected. Always use the current server time — never a cached value.
                </InfoBox>
              </SectionCard>

              {/* Create Payment */}
              <SectionCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <MethodBadge method="POST" />
                  <CardTitle>Step 2 — Create Payment Order</CardTitle>
                </div>
                <CardSubtitle>Returns a QR code and hosted payment page. Show these to your customer.</CardSubtitle>

                <CodeBlock code={`${BASE_URL}/api/v1/payments/create`} label="Endpoint" />
                <CodeBlock code={CREATE_HEADERS} label="Required Headers" />

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Request Body Fields</div>
                <FieldTable rows={[
                  { field: 'order_id',          type: 'string',  required: true,  desc: 'Your unique order ID. Must be unique per transaction. Also used as X-Idempotency-Key.' },
                  { field: 'amount',             type: 'integer', required: true,  desc: 'Amount in paise. ₹1 = 100  |  ₹499 = 49900.' },
                  { field: 'currency',           type: 'string',  required: true,  desc: 'Must be "INR".' },
                  { field: 'customer_reference', type: 'string',  required: false, desc: 'Customer name or note shown in payment. Max 128 chars.' },
                  { field: 'redirect_url',       type: 'string',  required: false, desc: 'After payment, customer is redirected here. NovaPay appends: ?payment_id=UUID&status=paid&order_id=YOUR_ID' },
                ]} />

                <InfoBox type="warn" title="Do not include merchant_id in the body">
                  Your account is identified automatically from the X-API-Key header.
                </InfoBox>

                <CodeBlock code={CREATE_BODY} label="Example Request Body" />
                <CodeBlock code={CREATE_RESPONSE} label="Success Response — 201 Created" />

                <InfoBox type="info" title="Two ways to use the response">
                  <strong>Option A</strong> — Redirect customer to <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>pay_url</code>. NovaPay hosts the full payment page with QR + UPI app buttons.<br/><br/>
                  <strong>Option B</strong> — Embed <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>qr_code_base64</code> in your own page and use <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>upi_intent_link</code> for mobile deep links.
                </InfoBox>
              </SectionCard>

              {/* Check Status */}
              <SectionCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <MethodBadge method="GET" />
                  <CardTitle>Step 3 — Poll Payment Status</CardTitle>
                </div>
                <CardSubtitle>Public endpoint — no auth headers needed. Poll every 3–5 seconds until status changes from pending.</CardSubtitle>

                <CodeBlock code={`GET ${BASE_URL}/api/v1/public/payment/{payment_id}`} label="Endpoint" />
                <CodeBlock code={STATUS_RESPONSE} label="Response" />

                <InfoBox type="info" title="utr field">
                  The <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>utr</code> (Unique Transaction Reference) is the bank reference number. Use this to reconcile payments in your records. Only present when status = "paid".
                </InfoBox>
              </SectionCard>

              {/* Verify Payment (manual) */}
              <SectionCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <MethodBadge method="POST" />
                  <CardTitle>Step 3b — Manually Verify Payment (optional)</CardTitle>
                </div>
                <CardSubtitle>Use this if your customer reports a payment that wasn't auto-detected. Requires the UTR from the customer's UPI app.</CardSubtitle>

                <CodeBlock code={`${BASE_URL}/api/v1/payments/verify`} label="Endpoint (API-key + signature auth required)" />
                <FieldTable rows={[
                  { field: 'payment_id', type: 'string',  required: true,  desc: 'The payment_id from the create response.' },
                  { field: 'utr',        type: 'string',  required: true,  desc: 'Bank UTR from the customer — visible in their UPI app payment history.' },
                  { field: 'amount',     type: 'integer', required: true,  desc: 'Must match the original payment amount exactly.' },
                ]} />
                <InfoBox type="warn" title="Only use as a fallback">
                  NovaPay auto-detects payments within ~10 seconds. Only call verify if the customer paid but status is still pending after 2 minutes.
                </InfoBox>
              </SectionCard>

              {/* Status codes */}
              <SectionCard>
                <CardTitle>Payment Status Codes</CardTitle>
                <div style={{ height: 12 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { status: 'pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', desc: 'Awaiting payment — keep polling' },
                    { status: 'paid',    color: '#10b981', bg: 'rgba(16,185,129,0.08)', desc: 'Confirmed — fulfil the order' },
                    { status: 'failed',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  desc: 'Failed — ask customer to retry' },
                    { status: 'expired', color: '#64748b', bg: 'rgba(100,116,139,0.08)', desc: 'Timed out — create a new order' },
                  ].map(s => (
                    <div key={s.status} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: 'monospace' }}>{s.status}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Errors */}
              <SectionCard>
                <CardTitle>Error Responses</CardTitle>
                <CardSubtitle>All errors return a consistent JSON structure.</CardSubtitle>
                <CodeBlock code={`{ "success": false, "error": "invalid signature" }`} label="Error format" />
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  {[
                    ['400', 'Bad request — missing or invalid fields'],
                    ['401', 'Invalid API key or HMAC signature mismatch'],
                    ['403', 'IP not in whitelist — your account has IP restrictions enabled. Add your server IP under API Credentials → IP Whitelist.'],
                    ['408', 'Timestamp too old — replay prevention (> 5 min drift). Use server time, not client.'],
                    ['409', 'Duplicate order_id — this order was already paid or is pending'],
                    ['422', 'KYC not approved or subscription not active — contact support'],
                    ['429', 'Rate limit exceeded — max 100 requests/min per merchant. Retry after 1 minute.'],
                    ['500', 'Server error — retry after a few seconds'],
                    ['503', 'Service temporarily unavailable — database or infra issue. Retry after 10 seconds.'],
                  ].map(([code, desc], i, arr) => (
                    <div key={code} style={{ display: 'flex', gap: 16, padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#ef4444', minWidth: 36 }}>{code}</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Quick start */}
              <SectionCard>
                <CardTitle>Quick Start (cURL)</CardTitle>
                <CardSubtitle>Complete example with correct HMAC signature generation.</CardSubtitle>
                <CodeBlock code={CURL_EXAMPLE} lang="bash" />
              </SectionCard>

              {/* Checklist */}
              <SectionCard>
                <CardTitle>Integration Checklist</CardTitle>
                <div style={{ height: 10 }} />
                {[
                  ['Copy API Key + Secret from Credentials tab', 'Store as NOVAPAY_API_KEY and NOVAPAY_API_SECRET env vars — never commit to git'],
                  ['Copy Webhook Secret from Credentials tab', 'Store as NOVAPAY_WEBHOOK_SECRET env var'],
                  ['Set your webhook URL', 'Must be HTTPS — NovaPay POSTs payment events here. Set it in the Webhook Settings card.'],
                  ['Sign every payment request with HMAC-SHA256', 'message = timestamp + "." + raw JSON body → see Step 1'],
                  ['Store payment_id after creation', 'Use it to poll status and deduplicate webhooks'],
                  ['Redirect customer to pay_url or embed QR', 'Option A: redirect to pay_url · Option B: embed qr_code_base64 in your page'],
                  ['Poll GET /public/payment/:id every 3–5s', 'No auth needed — stop when status changes from pending'],
                  ['Verify X-Webhook-Signature on incoming webhooks', 'HMAC-SHA256 of the raw request body using your Webhook Secret'],
                  ['Deduplicate with payment_id before fulfilling', 'Webhooks may fire more than once — always check first'],
                ].map(([item, note], i, arr) => (
                  <div key={item} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'flex-start' }}>
                    <span style={{ color: '#10b981', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#dbeafe', fontWeight: 500 }}>{item}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{note}</div>
                    </div>
                  </div>
                ))}
              </SectionCard>
            </div>
          )}

          {/* ── WEBHOOK TAB ── */}
          {activeTab === 'webhook' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>

              <SectionCard>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardSubtitle>NovaPay sends a POST request to your URL when a payment is confirmed. Auto-detected within ~10 seconds.</CardSubtitle>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, fontFamily: 'DM Sans, sans-serif' }} value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourdomain.com/webhook/novapay" />
                  <button onClick={handleSaveWebhook} disabled={saving} style={{ background: saving ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '0 20px', color: saving ? '#4b5563' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' as const }}>
                    {saving ? 'Saving…' : 'Save Webhook'}
                  </button>
                </div>
              </SectionCard>

              <InfoBox type="success" title="Payments are auto-confirmed">
                NovaPay polls the payment provider every 5 seconds. When a payment is detected, your webhook fires automatically — no manual confirmation needed.
              </InfoBox>

              {/* Requirements */}
              <SectionCard>
                <CardTitle>Endpoint Requirements</CardTitle>
                <div style={{ height: 10 }} />
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  {[
                    ['Accept HTTPS POST', 'Use HTTPS in production — HTTP only for local testing'],
                    ['Return HTTP 200', 'Any other status triggers a retry'],
                    ['Respond within 10s', 'Requests timeout after 10 seconds'],
                    ['Handle duplicates', 'Same event may arrive more than once — deduplicate using payment_id'],
                  ].map(([req, detail], i, arr) => (
                    <div key={req} style={{ display: 'flex', gap: 14, padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ color: '#10b981', fontSize: 13, flexShrink: 0 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#dbeafe', marginBottom: 2 }}>{req}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Payload */}
              <SectionCard>
                <CardTitle>Webhook Payload</CardTitle>
                <CardSubtitle>POST request with Content-Type: application/json</CardSubtitle>
                <CodeBlock code={WEBHOOK_PAYLOAD} />
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 2fr', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Field', 'Type', 'Description'].map(h => (
                      <div key={h} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{h}</div>
                    ))}
                  </div>
                  {[
                    ['event',      'string',  'Event type — currently payment.success'],
                    ['payment_id', 'string',  'NovaPay UUID. Use for deduplication.'],
                    ['order_id',   'string',  'Your original order ID from the create request'],
                    ['amount',     'integer', 'Amount in paise (₹1 = 100)'],
                    ['status',     'string',  'Always "paid" for payment.success'],
                    ['utr',        'string',  'Bank UTR — use to reconcile with your bank statement'],
                    ['paid_at',    'string',  'ISO 8601 timestamp of payment confirmation'],
                  ].map(([field, type, desc], i, arr) => (
                    <div key={field} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 2fr', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div style={{ padding: '10px 12px', fontSize: 12, color: '#93c5fd', fontFamily: 'monospace' }}>{field}</div>
                      <div style={{ padding: '10px 12px', fontSize: 12, color: '#f59e0b', fontFamily: 'monospace' }}>{type}</div>
                      <div style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Verify */}
              <SectionCard>
                <CardTitle>Verify Webhook Signature</CardTitle>
                <CardSubtitle>Every webhook includes an X-Webhook-Signature header. Always verify before processing.</CardSubtitle>
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 12, color: '#a7f3d0' }}>
                  Your Webhook Secret is in the <strong>API Credentials</strong> tab — copy it and store as <code style={{ fontFamily: 'monospace' }}>NOVAPAY_WEBHOOK_SECRET</code> env var.
                </div>
                <div style={{ background: '#030d1f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: '#93c5fd' }}>
                  X-Webhook-Signature: a3f9c2d8...&nbsp;&nbsp;<span style={{ color: '#475569' }}>(HMAC-SHA256 of raw body using NOVAPAY_WEBHOOK_SECRET)</span><br/>
                  X-Webhook-Timestamp: 1774001171&nbsp;&nbsp;<span style={{ color: '#475569' }}>(Unix timestamp of delivery)</span>
                </div>
                <LangToggle value={verifyLang} onChange={setVerifyLang} />
                <CodeBlock
                  code={verifyLang === 'js' ? WEBHOOK_VERIFY_JS : verifyLang === 'py' ? WEBHOOK_VERIFY_PY : WEBHOOK_VERIFY_PHP}
                  lang={verifyLang === 'js' ? 'JavaScript' : verifyLang === 'py' ? 'Python' : 'PHP'}
                />
                <InfoBox type="warn" title="Use the raw request body">
                  Parse JSON only after verifying. Use timingSafeEqual / compare_digest — never plain string comparison.
                </InfoBox>
              </SectionCard>

              {/* Retry */}
              <SectionCard>
                <CardTitle>Retry Policy</CardTitle>
                <CardSubtitle>If your endpoint fails or returns non-200, NovaPay retries with exponential backoff — up to 5 attempts.</CardSubtitle>
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                  {[['1st', 'Immediate'], ['2nd', '~5 minutes later'], ['3rd', '~30 minutes later'], ['4th', '~2 hours later'], ['5th', '~8 hours later — final attempt']].map(([attempt, time], i, arr) => (
                    <div key={attempt} style={{ display: 'flex', gap: 16, padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#3b82f6', minWidth: 28 }}>{attempt}</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{time}</span>
                    </div>
                  ))}
                </div>
                <InfoBox type="warn" title="Handle duplicates with payment_id">
                  Retries can deliver the same event multiple times. Always check if you have already processed a payment_id before fulfilling an order.
                </InfoBox>
              </SectionCard>

            </div>
          )}
        </>
      )}
    </div>
  );
}
