'use client';
import { useEffect, useState } from 'react';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';

const CODE_BLOCK = `curl -X POST ${BASE_URL}/api/v1/payments/create \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "X-TIMESTAMP: $(date +%s)" \\
  -H "X-SIGNATURE: YOUR_HMAC_SIGNATURE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "YOUR_MERCHANT_ID",
    "order_id": "ORD-001",
    "amount": 49900,
    "currency": "INR"
  }'`;

const STATUS_CODE = `{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "upi_intent_link": "upi://pay?...",
    "qr_code_base64": "data:image/png;...",
    "amount": 49900,
    "status": "pending"
  }
}`;

const WEBHOOK_PAYLOAD = `{
  "event": "payment.success",
  "payment_id": "uuid",
  "order_id": "ORD-123",
  "amount": 49900,
  "status": "paid",
  "paid_at": "2026-01-15T10:30:00Z"
}`;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative' as const, marginBottom: 16 }}>
      {label && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <div style={{ background: '#030d1f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
          </div>
          <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: 'none', border: 'none', color: copied ? '#3b82f6' : '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '14px 16px', fontSize: 12, color: '#93c5fd', fontFamily: 'monospace', lineHeight: 1.7, overflow: 'auto' as const }}>{code}</pre>
      </div>
    </div>
  );
}

export default function APIDocsPage() {
  const [profile, setProfile]   = useState<any>(null);
  const [webhook, setWebhook]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [rotating, setRotating] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [copied, setCopied]     = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState<'credentials'|'guide'|'webhook'>('credentials');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  useEffect(() => {
    try {
      const payload = JSON.parse(atob(token?.split('.')[1] || ''));
      setProfile({ id: payload.merchant_id, api_key: '' });
    } catch {}
    fetch('/api/v1/dashboard/profile', { headers }).then(r => r.json())
      .then(d => {
        if (d.success) { setProfile(d.data); setWebhook(d.data.webhook_url || ''); }
      })
      .finally(() => setLoading(false));
    fetch('/api/v1/dashboard/stats', { headers }).then(r => r.json())
      .then(d => { if (d.success && d.data?.api_key) setProfile((p:any) => ({...p, api_key: d.data.api_key})); });
    fetch('/api/v1/dashboard/webhook', { headers }).then(r => r.json())
      .then(d => { if (d.success) setWebhook(d.data?.webhook_url || ''); });
  }, []);

  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); };

  const handleRotate = async () => {
    if (!confirm('Rotate API keys? Your existing integrations will stop working until updated.')) return;
    setRotating(true);
    try {
      const r = await fetch('/api/v1/dashboard/rotate-keys', { method: 'POST', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setProfile((p: any) => ({ ...p, api_key: d.data.api_key }));
      flash('API keys rotated successfully!');
    } catch (e: any) { flash(e.message, true); }
    finally { setRotating(false); }
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
    { key: 'webhook',     label: '🔗 Webhook Config' },
  ];

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 760 }}>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', color: '#3b82f6', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>API Documentation</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Use these credentials to integrate NovaPay into your application</div>
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
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {/* ── CREDENTIALS TAB ── */}
          {activeTab === 'credentials' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

              {/* API Key */}
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>API Key</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Use this key to authenticate API requests</div>
                  </div>
                  <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 100 }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input style={{ ...inp, flex: 1, color: '#8b9ab5' }} readOnly
                    value={showKey ? (profile?.api_key || '') : '••••••••••••••••••••••••••••••••'} />
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
              </div>

              {/* Merchant ID */}
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Merchant ID</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Your unique identifier for API requests</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, color: '#8b9ab5' }} readOnly value={typeof window !== 'undefined' ? (() => { try { return JSON.parse(atob(localStorage.getItem('upay_access_token')?.split('.')[1] || '')).merchant_id || ''; } catch { return ''; } })() : ''} />
                  <button onClick={() => copy(profile?.id || '', 'mid')} style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 10, padding: '0 14px', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif' }}>
                    {copied === 'mid' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Webhook URL preview */}
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Webhook URL</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>NovaPay will POST payment events to this URL</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, fontFamily: 'DM Sans, sans-serif' }} value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourdomain.com/webhook/novapay" />
                  <button onClick={handleSaveWebhook} disabled={saving} style={{ background: saving ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '0 18px', color: saving ? '#4b5563' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' as const }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── INTEGRATION GUIDE TAB ── */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>POST</span>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>1. Create Payment Order</div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Create a new payment order to initiate the payment process.</div>
                <CodeBlock code={`Endpoint: POST ${BASE_URL}/api/v1/payments/create`} label="Endpoint" />
                <CodeBlock code={`{
  "X-API-KEY": "YOUR_API_KEY",
  "X-TIMESTAMP": "UNIX_TIMESTAMP",
  "X-SIGNATURE": "HMAC_SHA256(api_secret + timestamp + body)",
  "Content-Type": "application/json"
}`} label="Headers" />
                <CodeBlock code={`{
  "merchant_id": "YOUR_MERCHANT_ID",
  "order_id": "YOUR_UNIQUE_ORDER_ID",
  "amount": 49900,
  "currency": "INR",
  "customer_reference": "Customer Name"
}`} label="Request Body" />
                <CodeBlock code={STATUS_CODE} label="Success Response" />
              </div>

              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>GET</span>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>2. Check Payment Status</div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Poll this endpoint to check if payment has been completed.</div>
                <CodeBlock code={`Endpoint: GET ${BASE_URL}/api/v1/public/payment/{payment_id}`} label="Endpoint" />
                <CodeBlock code={`{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "order_id": "ORD-001",
    "amount": 49900,
    "status": "paid",
    "paid_at": "2026-01-15T10:30:00Z"
  }
}`} label="Response" />
              </div>

              {/* Payment status codes */}
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Payment Status Codes</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { status: 'pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', desc: 'Payment in progress' },
                    { status: 'paid',    color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  desc: 'Payment completed' },
                    { status: 'failed',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  desc: 'Payment failed' },
                    { status: 'expired', color: '#64748b', bg: 'rgba(100,116,139,0.08)', desc: 'Payment expired' },
                  ].map(s => (
                    <div key={s.status} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: 'monospace' }}>{s.status}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick start */}
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Quick Start (cURL)</div>
                <CodeBlock code={CODE_BLOCK} />
              </div>

              {/* Important notes */}
              <div style={{ background: 'rgba(29,78,216,0.06)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#93c5fd' }}>Important Notes</div>
                {['Amount should be in paise (₹1 = 100 paise)', 'order_id must be unique per transaction', 'Payment URLs expire in 5 minutes', 'Store payment_id for future status checks', 'Webhook URL will receive payment status updates'].map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                    <span style={{ color: '#1d4ed8', flexShrink: 0 }}>•</span>{note}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── WEBHOOK TAB ── */}
          {activeTab === 'webhook' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Webhook Configuration</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>NovaPay sends a POST request to your URL when a payment status changes.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, fontFamily: 'DM Sans, sans-serif' }} value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourdomain.com/webhook/novapay" />
                  <button onClick={handleSaveWebhook} disabled={saving} style={{ background: saving ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '0 20px', color: saving ? '#4b5563' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' as const }}>
                    {saving ? 'Saving…' : 'Save Webhook'}
                  </button>
                </div>
              </div>

              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Webhook Payload</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>We'll send a POST request with this JSON payload:</div>
                <CodeBlock code={WEBHOOK_PAYLOAD} />
              </div>

              <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Field Descriptions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 0 }}>
                  {[['Field','Type','Description'],['event','String','Event type (payment.success, payment.failed)'],['payment_id','String','NovaPay payment ID'],['order_id','String','Your order ID'],['amount','Number','Amount in paise'],['status','String','Payment status'],['paid_at','String','Payment timestamp (ISO 8601)']].map((row, i) => (
                    <React.Fragment key={i}>
                      {row.map((cell, j) => (
                        <div key={j} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: i === 0 ? 11 : 13, color: i === 0 ? 'rgba(255,255,255,0.3)' : j === 0 ? '#93c5fd' : j === 1 ? '#f59e0b' : 'rgba(255,255,255,0.55)', fontFamily: j === 0 || j === 1 ? 'monospace' : 'DM Sans, sans-serif', fontWeight: i === 0 ? 700 : 400, textTransform: i === 0 ? 'uppercase' as const : 'none' as const, letterSpacing: i === 0 ? '0.08em' : 0 }}>
                          {cell}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(29,78,216,0.06)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#93c5fd' }}>Retry Policy</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                  If your endpoint is unreachable or returns a non-200 status, we will retry with exponential backoff. Your endpoint should return HTTP 200 to acknowledge receipt.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React from 'react';
