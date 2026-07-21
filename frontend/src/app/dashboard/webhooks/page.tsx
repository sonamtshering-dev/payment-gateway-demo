'use client';

import React, { useState } from 'react';
import api from '@/lib/api';

export default function WebhooksPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!webhookUrl.startsWith('https://')) {
      setError('Webhook URL must use HTTPS');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await api.updateWebhook(webhookUrl);
      if (res.success) setMessage('Webhook URL saved');
      else setError(res.error || 'Failed to save');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const card: React.CSSProperties = { background: '#FFFFFF', borderRadius: 14, padding: '24px 28px', border: '1px solid #E2E8F0', marginBottom: 16 };

  return (
    <div style={{ maxWidth: 740, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Webhook Configuration</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>Receive real-time payment event notifications on your server</div>
      </div>

      {message && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#059669' }}>{message}</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>{error}</div>}

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 6px' }}>Endpoint URL</div>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
          We'll send a POST request to this URL when a payment status changes. Must be HTTPS.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://yoursite.com/webhooks/novapay"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'monospace', outline: 'none', color: '#0F172A', background: '#FFFFFF' }} />
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 12px' }}>Payload Format</div>
        <pre style={{
          background: '#0F172A', color: '#93C5FD', padding: 18, borderRadius: 12,
          fontSize: 12, lineHeight: 1.7, overflowX: 'auto' as const, margin: 0,
        }}>{`POST /webhooks/novapay HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: <hmac_sha256>
X-Webhook-Timestamp: 1705312900

{
  "event":      "payment.success",
  "payment_id": "f47ac10b-...",
  "order_id":   "ORD-001",
  "amount":     249900,
  "currency":   "INR",
  "status":     "paid",
  "utr":        "UTR123456789",
  "paid_at":    "2026-07-19T09:15:10Z"
}`}</pre>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 12px' }}>Retry Policy</div>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, margin: 0 }}>
          Failed deliveries are retried with exponential backoff: 5 min, 30 min, 2 hrs, 8 hrs (5 attempts max).
          Return HTTP 2xx to acknowledge. Any other status triggers a retry.
          The <code style={{ background: '#F1F5FB', padding: '2px 6px', borderRadius: 4, fontSize: 12, color: '#2563EB' }}>X-Webhook-Signature</code> header
          contains an HMAC-SHA256 of the raw payload using your webhook secret. Always verify before processing.
        </p>
      </div>
    </div>
  );
}
