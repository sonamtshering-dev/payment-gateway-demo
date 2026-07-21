'use client';
import React, { useEffect, useState } from 'react';
import { BookOpen, Search, ChevronRight, Copy, Check, Eye, EyeOff, RefreshCw, Plus, Trash2, Shield, Zap, Globe } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nova-pay.in';

// ── Code snippets ────────────────────────────────────────────────────────────

const CREATE_PAYMENT_CURL = `curl -X POST ${BASE_URL}/api/v1/payments/create \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-Timestamp: $(date +%s)" \\
  -H "X-Signature: HMAC_SHA256_SIG" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "ORD-2026-001",
    "amount": 49900,
    "currency": "INR",
    "redirect_url": "https://yoursite.com/success"
  }'`;

const CREATE_PAYMENT_RESPONSE = `{
  "success": true,
  "data": {
    "payment_id": "019d0aa1-af3a-79ce-aa49-336dfa67e48b",
    "order_id":   "ORD-2026-001",
    "upi_intent_link": "upi://pay?pa=merchant@oksbi&pn=Store&am=499.00",
    "qr_code_base64": "data:image/png;base64,iVBOR...",
    "pay_url": "${BASE_URL}/pay/019d0aa1-af3a-79ce-aa49-336dfa67e48b",
    "amount":  49900,
    "status":  "pending",
    "expires_at": "2026-03-20T09:10:38Z"
  }
}`;

const GET_STATUS_RESPONSE = `{
  "success": true,
  "data": {
    "payment_id": "019d0aa1-af3a-79ce-aa49-336dfa67e48b",
    "order_id":   "ORD-2026-001",
    "amount":     49900,
    "status":     "paid",
    "paid_at":    "2026-03-20T09:15:10Z",
    "utr":        "607931415985"
  }
}`;

const WEBHOOK_PAYLOAD = `{
  "event":      "payment.success",
  "payment_id": "019d0aa1-af3a-79ce-aa49-336dfa67e48b",
  "order_id":   "ORD-2026-001",
  "amount":     49900,
  "status":     "paid",
  "utr":        "607931415985",
  "paid_at":    "2026-03-20T09:15:10Z"
}`;

const SIGNATURE_JS = `const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify({ order_id: 'ORD-001', amount: 49900 });
const sig = crypto.createHmac('sha256', process.env.NOVAPAY_API_SECRET)
  .update(\`\${timestamp}.\${body}\`).digest('hex');
// Headers: X-API-Key, X-Timestamp, X-Signature`;

const SIGNATURE_PY = `import hmac, hashlib, time, json, os
timestamp = str(int(time.time()))
body = json.dumps(payload, separators=(',', ':'))
sig = hmac.new(os.environ['API_SECRET'].encode(),
  f"{timestamp}.{body}".encode(), hashlib.sha256).hexdigest()
# Headers: X-API-Key, X-Timestamp, X-Signature`;

// ── Endpoint definitions ─────────────────────────────────────────────────────

const ENDPOINT_CATEGORIES = [
  {
    name: 'Payments',
    color: '#2563EB',
    bg: '#EFF6FF',
    endpoints: [
      { method: 'POST', path: '/api/v1/payments/create',    title: 'Create Payment',    desc: 'Generate QR / UPI link for a new payment' },
      { method: 'GET',  path: '/api/v1/public/payment/:id', title: 'Get Payment Status', desc: 'Fetch payment status (no auth required)' },
      { method: 'GET',  path: '/api/v1/dashboard/payments', title: 'List Payments',      desc: 'List all payments with filters' },
      { method: 'POST', path: '/api/v1/payments/refund',    title: 'Refund Payment',     desc: 'Initiate a refund for a paid transaction' },
    ],
  },
  {
    name: 'QR Codes',
    color: '#7C3AED',
    bg: '#F5F3FF',
    endpoints: [
      { method: 'POST', path: '/api/v1/qr/static',  title: 'Create Static QR',  desc: 'Generate a reusable static QR code' },
      { method: 'GET',  path: '/api/v1/qr/:id',     title: 'Get QR Details',     desc: 'Fetch details of a QR code' },
      { method: 'GET',  path: '/api/v1/qr',         title: 'List QR Codes',      desc: 'List all your QR codes' },
    ],
  },
  {
    name: 'Settlements',
    color: '#059669',
    bg: '#ECFDF5',
    endpoints: [
      { method: 'GET', path: '/api/v1/dashboard/settlements',      title: 'List Settlements',  desc: 'Paginated list of settlement batches' },
      { method: 'GET', path: '/api/v1/dashboard/settlements/:id',  title: 'Settlement Detail', desc: 'Transactions in a settlement batch' },
    ],
  },
  {
    name: 'Webhooks',
    color: '#D97706',
    bg: '#FFFBEB',
    endpoints: [
      { method: 'PUT', path: '/api/v1/dashboard/webhook',        title: 'Update Webhook URL',    desc: 'Set the endpoint to receive events' },
      { method: 'GET', path: '/api/v1/dashboard/webhook-secret', title: 'Get Webhook Secret',    desc: 'Retrieve your HMAC signing secret' },
    ],
  },
  {
    name: 'Merchants',
    color: '#0891B2',
    bg: '#F0F9FF',
    endpoints: [
      { method: 'GET',  path: '/api/v1/dashboard/profile',   title: 'Get Profile',      desc: 'Retrieve your merchant profile' },
      { method: 'PUT',  path: '/api/v1/dashboard/profile',   title: 'Update Profile',   desc: 'Update business name or details' },
      { method: 'POST', path: '/api/v1/dashboard/logo',      title: 'Upload Logo',      desc: 'Upload your business logo (multipart)' },
    ],
  },
];

// endpoint detail content
const ENDPOINT_DETAILS: Record<string, { body?: string; response?: string; params?: { name: string; type: string; required: boolean; desc: string }[] }> = {
  '/api/v1/payments/create': {
    params: [
      { name: 'order_id',           type: 'string',  required: true,  desc: 'Your unique order ID (max 64 chars)' },
      { name: 'amount',             type: 'integer', required: true,  desc: 'Amount in smallest currency unit (paise for INR)' },
      { name: 'currency',           type: 'string',  required: false, desc: 'Currency code. Default: INR' },
      { name: 'customer_reference', type: 'string',  required: false, desc: 'Customer name or reference shown on UPI screen' },
      { name: 'redirect_url',       type: 'string',  required: false, desc: 'URL to redirect after payment completes' },
    ],
    body:     CREATE_PAYMENT_CURL,
    response: CREATE_PAYMENT_RESPONSE,
  },
  '/api/v1/public/payment/:id': {
    params: [{ name: 'id', type: 'string', required: true, desc: 'payment_id returned from Create Payment' }],
    response: GET_STATUS_RESPONSE,
  },
  '/api/v1/dashboard/webhook': {
    params: [{ name: 'webhook_url', type: 'string', required: true, desc: 'HTTPS endpoint to receive payment events' }],
    response: `{ "success": true, "message": "Webhook URL updated" }`,
  },
};

// ── Helper components ────────────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    try { navigator.clipboard.writeText(code); } catch {
      const el = document.createElement('textarea'); el.value = code;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>}
      <div style={{ background: '#0F172A', borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ef4444','#f59e0b','#3b82f6'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
          </div>
          <button onClick={doCopy} style={{ background: 'none', border: 'none', color: copied ? '#60A5FA' : '#64748B', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11.5, color: '#93C5FD', fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto' }}>{code}</pre>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    POST:   { bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE' },
    GET:    { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    PUT:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    DELETE: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  };
  const s = styles[method] || styles.GET;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace', letterSpacing: '0.05em', flexShrink: 0 }}>
      {method}
    </span>
  );
}

// ── State types ──────────────────────────────────────────────────────────────

interface IPEntry { id: string; ip_cidr: string; label: string; created_at: string; }

// ── Main page ────────────────────────────────────────────────────────────────

export default function APIDocsPage() {
  const [profile, setProfile]             = useState<any>(null);
  const [webhook, setWebhook]             = useState('');
  const [loading, setLoading]             = useState(true);
  const [rotating, setRotating]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [copied, setCopied]               = useState('');
  const [showKey, setShowKey]             = useState(false);
  const [showSecret, setShowSecret]       = useState(false);
  const [apiSecret, setApiSecret]         = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [rotatedKeys, setRotatedKeys]     = useState<{ api_key: string; api_secret: string } | null>(null);
  const [ipList, setIPList]               = useState<IPEntry[]>([]);
  const [newIP, setNewIP]                 = useState('');
  const [newIPLabel, setNewIPLabel]       = useState('');
  const [addingIP, setAddingIP]           = useState(false);
  const [success, setSuccess]             = useState('');
  const [error, setError]                 = useState('');
  const [sigLang, setSigLang]             = useState('js');
  const [endpointSearch, setEndpointSearch] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<{ method: string; path: string; title: string; desc: string } | null>(
    ENDPOINT_CATEGORIES[0].endpoints[0]
  );
  const [detailTab, setDetailTab] = useState<'params' | 'body' | 'response'>('params');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const fetchIPList = () =>
    fetch('/api/v1/dashboard/ip-whitelist', { headers: hdrs }).then(r => r.json())
      .then(d => { if (d.success) setIPList(d.data || []); });

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/dashboard/profile', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setProfile(d.data); }),
      fetch('/api/v1/dashboard/webhook', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setWebhook(d.data?.webhook_url || ''); }),
      fetch('/api/v1/dashboard/webhook-secret', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setWebhookSecret(d.data?.webhook_secret || ''); }),
      fetch('/api/v1/dashboard/api-secret', { headers: hdrs }).then(r => r.json()).then(d => { if (d.success) setApiSecret(d.data?.api_secret || ''); }),
      fetchIPList(),
    ]).finally(() => setLoading(false));
  }, []);

  const copy = (text: string, key: string) => {
    try { navigator.clipboard.writeText(text); } catch {
      const el = document.createElement('textarea'); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  const handleRotate = async () => {
    if (!confirm('Rotate API keys? Existing integrations stop working until updated.')) return;
    setRotating(true);
    try {
      const r = await fetch('/api/v1/dashboard/rotate-keys', { method: 'POST', headers: hdrs });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setProfile((p: any) => ({ ...p, api_key: d.data.api_key }));
      setApiSecret(d.data.api_secret);
      setRotatedKeys({ api_key: d.data.api_key, api_secret: d.data.api_secret });
    } catch (e: any) { flash(e.message, true); }
    finally { setRotating(false); }
  };

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/v1/dashboard/webhook', { method: 'PUT', headers: hdrs, body: JSON.stringify({ webhook_url: webhook }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('Webhook URL saved!');
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleAddIP = async () => {
    if (!newIP.trim()) return;
    setAddingIP(true);
    try {
      const r = await fetch('/api/v1/dashboard/ip-whitelist', { method: 'POST', headers: hdrs, body: JSON.stringify({ ip_cidr: newIP.trim(), label: newIPLabel.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setNewIP(''); setNewIPLabel('');
      await fetchIPList();
      flash('IP added to whitelist');
    } catch (e: any) { flash(e.message, true); }
    finally { setAddingIP(false); }
  };

  const handleDeleteIP = async (id: string) => {
    try {
      const r = await fetch(`/api/v1/dashboard/ip-whitelist/${id}`, { method: 'DELETE', headers: hdrs });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      await fetchIPList(); flash('IP removed');
    } catch (e: any) { flash(e.message, true); }
  };

  const inp: React.CSSProperties = { width: '100%', background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 11px', color: '#0F172A', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' };
  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 };

  const filteredCategories = ENDPOINT_CATEGORIES.map(cat => ({
    ...cat,
    endpoints: cat.endpoints.filter(e =>
      !endpointSearch ||
      e.title.toLowerCase().includes(endpointSearch.toLowerCase()) ||
      e.path.toLowerCase().includes(endpointSearch.toLowerCase())
    ),
  })).filter(cat => cat.endpoints.length > 0);

  const detail = selectedEndpoint ? ENDPOINT_DETAILS[selectedEndpoint.path] : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ad-layout { display: flex; align-items: flex-start; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background: #FFFFFF; }
        .ad-left { width: 240px; flex-shrink: 0; border-right: 1px solid #E2E8F0; background: #F8FAFC; overflow-y: auto; max-height: calc(100vh - 160px); overflow-x: hidden; }
        .ad-mid { width: 240px; flex-shrink: 0; border-right: 1px solid #E2E8F0; overflow-y: auto; max-height: calc(100vh - 160px); overflow-x: hidden; }
        .ad-right { flex: 1; min-width: 0; overflow-y: auto; max-height: calc(100vh - 160px); overflow-x: hidden; }
        .ep-item { display: flex; align-items: flex-start; gap: 8px; padding: 9px 14px; cursor: pointer; border-bottom: 1px solid #F1F5F9; transition: background 0.15s; }
        .ep-item:hover { background: #F8FAFC; }
        .ep-item.active { background: #EFF6FF; }
        .ad-left::-webkit-scrollbar, .ad-mid::-webkit-scrollbar, .ad-right::-webkit-scrollbar { width: 4px; }
        .ad-left::-webkit-scrollbar-thumb, .ad-mid::-webkit-scrollbar-thumb, .ad-right::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
        @media (max-width: 1100px) { .ad-left { width: 200px; } .ad-mid { width: 200px; } }
        @media (max-width: 850px) {
          .ad-layout { flex-direction: column; align-items: stretch; border: none; overflow: visible; }
          .ad-left { width: 100%; max-height: none; border-right: none; border-bottom: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 12px; border: 1px solid #E2E8F0; overflow-x: hidden; }
          .ad-mid { width: 100%; max-height: none; border-right: none; border-radius: 14px; margin-bottom: 12px; border: 1px solid #E2E8F0; overflow-x: hidden; }
          .ad-right { width: 100%; max-height: none; border-radius: 14px; border: 1px solid #E2E8F0; }
        }
      `}</style>

      {/* Toast notifications */}
      {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '11px 16px', color: '#059669', fontSize: 13, marginBottom: 16 }}>{success}</div>}

      {/* Rotated keys modal */}
      {rotatedKeys && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #FDE68A', borderRadius: 20, padding: '28px 32px', maxWidth: 540, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#D97706' }}>Save your new credentials NOW</div>
            </div>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              Your API Secret is shown <strong style={{ color: '#D97706' }}>only here</strong>. Once you close this dialog it cannot be retrieved — only rotated again.
            </p>
            {[['New API Key', rotatedKeys.api_key, 'rot-key'], ['New API Secret', rotatedKeys.api_secret, 'rot-sec']].map(([label, val, key]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={val} style={{ ...inp, flex: 1, fontSize: 12 }} />
                  <button onClick={() => copy(val, key)} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '0 14px', color: '#D97706', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                    {copied === key ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => copy(rotatedKeys.api_key + '\n' + rotatedKeys.api_secret, 'rot-both')}
                style={{ flex: 1, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 0', color: '#D97706', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                {copied === 'rot-both' ? '✓ Copied both' : 'Copy both'}
              </button>
              <button onClick={() => setRotatedKeys(null)}
                style={{ flex: 1, background: '#2563EB', border: 'none', borderRadius: 10, padding: '10px 0', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                I've saved them — Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} color="#2563EB" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>API Documentation</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Integrate NovaPay payments into your application</p>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="ad-layout" style={{ border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>

        {/* LEFT: Credentials + Webhooks + IP + Rate limits */}
        <div className="ad-left">
          <div style={{ padding: '16px 14px' }}>

            {/* API Credentials */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionHead}>API Credentials</div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>API Key</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input readOnly style={{ ...inp, flex: 1, fontSize: 10 }} value={showKey ? (profile?.api_key || '') : '••••••••••••••••••'} />
                  <button onClick={() => setShowKey(s => !s)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 7, padding: '0 8px', color: '#64748B', cursor: 'pointer' }}>
                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => copy(profile?.api_key || '', 'key')} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 7, padding: '0 8px', color: copied === 'key' ? '#2563EB' : '#64748B', cursor: 'pointer' }}>
                    {copied === 'key' ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>API Secret</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input readOnly style={{ ...inp, flex: 1, fontSize: 10 }} value={showSecret ? apiSecret : '••••••••••••••••••'} />
                  <button onClick={() => setShowSecret(s => !s)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 7, padding: '0 8px', color: '#64748B', cursor: 'pointer' }}>
                    {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => copy(apiSecret, 'secret')} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 7, padding: '0 8px', color: copied === 'secret' ? '#2563EB' : '#64748B', cursor: 'pointer' }}>
                    {copied === 'secret' ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>Environment</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ flex: 1, padding: '7px 10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 7, fontSize: 10, fontWeight: 700, color: '#059669', textAlign: 'center' }}>● LIVE</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleRotate} disabled={rotating} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: rotating ? '#94A3B8' : '#DC2626', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11, cursor: rotating ? 'wait' : 'pointer' }}>
                  <RefreshCw size={11} /> {rotating ? 'Rotating…' : 'Regenerate'}
                </button>
                <button style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #DBEAFE', background: '#EFF6FF', color: '#2563EB', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                  View Usage
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: '#E2E8F0', marginBottom: 16 }} />

            {/* Webhooks */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionHead}>Webhook</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>Endpoint URL</div>
                <input style={inp} value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yoursite.com/webhook" />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>Events</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['payment.success', 'payment.failed', 'refund.created'].map(ev => (
                    <span key={ev} style={{ fontSize: 9, padding: '3px 7px', borderRadius: 5, background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', fontFamily: 'monospace' }}>{ev}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>Signing Secret</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input readOnly style={{ ...inp, flex: 1, fontSize: 10 }} value={webhookSecret ? '••••••••••••••••' : '—'} />
                  <button onClick={() => copy(webhookSecret, 'whsec')} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 7, padding: '0 8px', color: copied === 'whsec' ? '#2563EB' : '#64748B', cursor: 'pointer' }}>
                    {copied === 'whsec' ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              <button onClick={handleSaveWebhook} disabled={saving} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: saving ? '#E2E8F0' : '#2563EB', color: saving ? '#94A3B8' : '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save Webhook'}
              </button>
            </div>

            <div style={{ height: 1, background: '#E2E8F0', marginBottom: 16 }} />

            {/* IP Whitelist */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionHead}>IP Whitelist</div>
              {ipList.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  {ipList.map(ip => (
                    <div key={ip.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 7, marginBottom: 5 }}>
                      <div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0F172A' }}>{ip.ip_cidr}</div>
                        {ip.label && <div style={{ fontSize: 10, color: '#94A3B8' }}>{ip.label}</div>}
                      </div>
                      <button onClick={() => handleDeleteIP(ip.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, fontStyle: 'italic' }}>No IPs whitelisted — all IPs allowed</div>
              )}
              <div style={{ marginBottom: 6 }}>
                <input style={{ ...inp, marginBottom: 5 }} value={newIP} onChange={e => setNewIP(e.target.value)} placeholder="192.168.1.0/24" />
                <input style={inp} value={newIPLabel} onChange={e => setNewIPLabel(e.target.value)} placeholder="Label (optional)" />
              </div>
              <button onClick={handleAddIP} disabled={addingIP || !newIP.trim()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 8, border: '1px solid #DBEAFE', background: '#EFF6FF', color: '#2563EB', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, cursor: addingIP || !newIP.trim() ? 'not-allowed' : 'pointer', opacity: !newIP.trim() ? 0.6 : 1 }}>
                <Plus size={12} /> {addingIP ? 'Adding…' : 'Add IP'}
              </button>
            </div>

            <div style={{ height: 1, background: '#E2E8F0', marginBottom: 16 }} />

            {/* Rate Limits */}
            <div>
              <div style={sectionHead}>Rate Limits</div>
              {[['Per Minute', '120 req', '#2563EB', '#EFF6FF'], ['Per Hour', '6,000 req', '#7C3AED', '#F5F3FF'], ['Per Day', '100K req', '#059669', '#ECFDF5']].map(([label, val, color, bg]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: bg as string, borderRadius: 8, marginBottom: 6, border: `1px solid ${(color as string) + '30'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={11} color={color as string} />
                    <span style={{ fontSize: 11, color: '#64748B' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: color as string, fontFamily: 'monospace' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE: Endpoint list */}
        <div className="ad-mid">
          <div style={{ padding: '12px 12px 0' }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={endpointSearch} onChange={e => setEndpointSearch(e.target.value)} placeholder="Search endpoints…"
                style={{ ...inp, paddingLeft: 30, fontSize: 12 }} />
            </div>
          </div>
          {filteredCategories.map(cat => (
            <div key={cat.name}>
              <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.name}</span>
              </div>
              {cat.endpoints.map(ep => (
                <div key={ep.path} className={`ep-item${selectedEndpoint?.path === ep.path ? ' active' : ''}`}
                  onClick={() => { setSelectedEndpoint(ep); setDetailTab('params'); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', background: selectedEndpoint?.path === ep.path ? '#EFF6FF' : undefined }}>
                  <MethodBadge method={ep.method} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 1, lineHeight: 1.3 }}>{ep.title}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* RIGHT: Endpoint detail */}
        <div className="ad-right">
          {selectedEndpoint ? (
            <div style={{ padding: '20px' }}>
              {/* Endpoint header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                <MethodBadge method={selectedEndpoint.method} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{selectedEndpoint.title}</div>
                  <code style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', background: '#F1F5F9', padding: '2px 8px', borderRadius: 5 }}>{selectedEndpoint.path}</code>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18, lineHeight: 1.6 }}>{selectedEndpoint.desc}</p>

              {/* Detail tabs */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
                {(['params', 'body', 'response'] as const).map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, background: detailTab === tab ? '#FFFFFF' : 'transparent', color: detailTab === tab ? '#2563EB' : '#64748B', boxShadow: detailTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize' }}>
                    {tab === 'params' ? 'Parameters' : tab === 'body' ? 'Request' : 'Response'}
                  </button>
                ))}
              </div>

              {detailTab === 'params' && (
                <div>
                  {detail?.params ? (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflowX: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 2fr', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', minWidth: 480 }}>
                        {['Parameter', 'Type', 'Required', 'Description'].map(h => (
                          <div key={h} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                      {detail.params.map((p, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 2fr', borderBottom: i < detail.params!.length - 1 ? '1px solid #F1F5F9' : 'none', minWidth: 480 }}>
                          <div style={{ padding: '10px 12px', fontSize: 12, color: '#2563EB', fontFamily: 'monospace' }}>{p.name}</div>
                          <div style={{ padding: '10px 12px', fontSize: 12, color: '#D97706', fontFamily: 'monospace' }}>{p.type}</div>
                          <div style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: p.required ? '#FEF2F2' : '#F1F5F9', color: p.required ? '#DC2626' : '#64748B', border: `1px solid ${p.required ? '#FECACA' : '#E2E8F0'}`, fontFamily: 'monospace' }}>
                              {p.required ? 'required' : 'optional'}
                            </span>
                          </div>
                          <div style={{ padding: '10px 12px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: '#94A3B8' }}>No request parameters for this endpoint</div>
                    </div>
                  )}

                  {/* Auth headers reminder */}
                  <div style={{ marginTop: 16, background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={13} /> Required Headers
                    </div>
                    {[
                      ['X-API-Key',        'Your API key'],
                      ['X-Timestamp',      'Unix timestamp (seconds)'],
                      ['X-Signature',      'HMAC-SHA256 of timestamp.body'],
                      ['Content-Type',     'application/json'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 4, fontSize: 12 }}>
                        <code style={{ color: '#2563EB', fontFamily: 'monospace', minWidth: 140 }}>{k}</code>
                        <span style={{ color: '#475569' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Signature code */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 7, padding: 3, marginBottom: 10, width: 'fit-content' }}>
                      {[['js', 'Node.js'], ['py', 'Python']].map(([k, label]) => (
                        <button key={k} onClick={() => setSigLang(k)}
                          style={{ background: sigLang === k ? '#FFFFFF' : 'transparent', border: sigLang === k ? '1px solid #E2E8F0' : 'none', borderRadius: 5, padding: '5px 14px', color: sigLang === k ? '#2563EB' : '#64748B', fontSize: 11, fontWeight: sigLang === k ? 700 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <CodeBlock code={sigLang === 'js' ? SIGNATURE_JS : SIGNATURE_PY} label="Generate Signature" />
                  </div>
                </div>
              )}

              {detailTab === 'body' && (
                <div>
                  {detail?.body ? (
                    <CodeBlock code={detail.body} label="Example Request (cURL)" />
                  ) : (
                    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: '#94A3B8' }}>No request body example available</div>
                    </div>
                  )}
                  <div style={{ marginTop: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>Idempotency</div>
                    <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                      Send <code style={{ fontFamily: 'monospace', color: '#D97706' }}>X-Idempotency-Key</code> (your <code style={{ fontFamily: 'monospace', color: '#D97706' }}>order_id</code>) to prevent duplicate charges on retries.
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'response' && (
                <div>
                  {detail?.response ? (
                    <CodeBlock code={detail.response} label="Success Response (200)" />
                  ) : (
                    <CodeBlock code={`{ "success": true, "data": { ... } }`} label="Response Shape" />
                  )}
                  <CodeBlock code={`{
  "success": false,
  "error": "order_id already used",
  "code": "DUPLICATE_ORDER"
}`} label="Error Response (4xx)" />
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={13} /> Status Codes
                    </div>
                    {[['200', 'Success'], ['400', 'Bad request / validation error'], ['401', 'Invalid API key or signature'], ['409', 'Duplicate order_id'], ['429', 'Rate limit exceeded'], ['500', 'Server error — retry with backoff']].map(([code, desc]) => (
                      <div key={code} style={{ display: 'flex', gap: 10, marginBottom: 4, fontSize: 12 }}>
                        <code style={{ fontFamily: 'monospace', color: ['200'].includes(code) ? '#059669' : '#DC2626', minWidth: 36 }}>{code}</code>
                        <span style={{ color: '#475569' }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Webhook payload reference */}
              {selectedEndpoint.path.includes('webhook') && (
                <div style={{ marginTop: 16 }}>
                  <CodeBlock code={WEBHOOK_PAYLOAD} label="Webhook Event Payload" />
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>Verify Signatures</div>
                    <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                      Always verify <code style={{ fontFamily: 'monospace', color: '#D97706' }}>X-Webhook-Signature</code> header using HMAC-SHA256 with your webhook secret before processing events.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94A3B8', fontSize: 13 }}>
              Select an endpoint to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
