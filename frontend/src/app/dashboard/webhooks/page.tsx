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

  return (
    <div style={{ maxWidth: 740 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f1d35', margin: '0 0 24px' }}>Webhook configuration</h1>

      {message && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#059669' }}>{message}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>{error}</div>}

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f1d35', margin: '0 0 12px' }}>Endpoint URL</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>
          We'll send a POST request to this URL when a payment status changes. Must be HTTPS.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://yoursite.com/webhooks/upay"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f1d35', margin: '0 0 12px' }}>Payload format</h2>
        <pre style={{
          background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12,
          fontSize: 12.5, lineHeight: 1.6, overflow: 'auto',
        }}>{`POST /webhooks/upay HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: <hmac_sha256>
X-Webhook-Timestamp: 1705312900
User-Agent: UPay-Gateway/1.0

{
  "payment_id": "f47ac10b-...",
  "order_id": "ORD-001",
  "amount": 249900,
  "currency": "INR",
  "status": "paid",
  "utr": "UTR123456789",
  "timestamp": 1705312900,
  "signature": "<hmac>"
}`}</pre>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f1d35', margin: '0 0 12px' }}>Retry policy</h2>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
          Failed deliveries are retried with exponential backoff: 2 min, 4 min, 8 min, 16 min, 32 min (5 attempts max).
          Return HTTP 2xx to acknowledge. Any other status triggers a retry.
          The <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>X-Webhook-Signature</code> header
          contains an HMAC-SHA256 of the payload using your webhook secret. Always verify this before processing.
        </p>
      </div>
    </div>
  );
}
