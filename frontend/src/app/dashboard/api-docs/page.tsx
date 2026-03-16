'use client';
import { useEffect, useState } from 'react';

export default function APICredentialsPage() {
  const [profile, setProfile]     = useState<any>(null);
  const [webhook, setWebhook]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [rotating, setRotating]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [copied, setCopied]       = useState('');
  const [showKey, setShowKey]     = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  useEffect(() => {
    fetch('/api/v1/dashboard/profile', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) { setProfile(d.data); setWebhook(d.data.webhook_url || ''); } })
      .finally(() => setLoading(false));
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleRotate = async () => {
    if (!confirm('Rotate API keys? Your existing integrations will stop working until updated.')) return;
    setRotating(true);
    try {
      const r = await fetch('/api/v1/dashboard/rotate-keys', { method: 'POST', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to rotate keys');
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
      if (!r.ok) throw new Error(d.error || 'Failed to save webhook');
      flash('Webhook URL saved!');
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width: '100%', background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#eef2ff', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32, color: '#eef2ff', fontFamily: 'DM Sans, sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>API Credentials</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>Manage your API keys and webhook configuration.</p>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.18)', borderRadius: 8, padding: '10px 16px', color: '#00e5b0', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 64, color: '#4b5563' }}>Loading...</div>
      ) : (
        <>
          {/* ── API KEY CARD ── */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 28, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>API Key</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Use this key to authenticate API requests.</div>
              </div>
              <span style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.18)', color: '#00e5b0', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}>LIVE</span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#8b9ab5' }}
                readOnly value={showKey ? (profile?.api_key || '') : '••••••••••••••••••••••••••••••••'} />
              <button onClick={() => setShowKey(s => !s)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0 14px', color: '#64748b', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' as const }}>
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => copy(profile?.api_key || '', 'apikey')} style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.18)', borderRadius: 8, padding: '0 14px', color: '#00e5b0', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                {copied === 'apikey' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <button onClick={handleRotate} disabled={rotating} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '9px 18px', color: '#ef4444', cursor: rotating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
              {rotating ? 'Rotating…' : '↻ Rotate API Key'}
            </button>
            <p style={{ fontSize: 12, color: '#4b5563', marginTop: 10 }}>⚠ Rotating will invalidate your current key immediately.</p>
          </div>

          {/* ── MERCHANT ID CARD ── */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 28, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Merchant ID</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Your unique merchant identifier for API requests.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#8b9ab5' }} readOnly value={profile?.id || ''} />
              <button onClick={() => copy(profile?.id || '', 'mid')} style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.18)', borderRadius: 8, padding: '0 14px', color: '#00e5b0', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                {copied === 'mid' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* ── WEBHOOK CARD ── */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 28, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Webhook URL</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>NovaPay will POST payment events to this URL.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...inp, flex: 1 }} value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourdomain.com/webhook/novapay" />
              <button onClick={handleSaveWebhook} disabled={saving} style={{ background: saving ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#00e5b0,#0ea5e9)', border: 'none', borderRadius: 8, padding: '0 18px', color: saving ? '#4b5563' : '#07090f', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' as const }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Example payload</div>
              <pre style={{ fontSize: 11, color: '#8b9ab5', margin: 0, fontFamily: 'monospace', lineHeight: 1.6 }}>{`{
  "event": "payment.success",
  "payment_id": "uuid",
  "order_id": "ORD-123",
  "amount": 49900,
  "status": "paid"
}`}</pre>
            </div>
          </div>

          {/* ── QUICK START ── */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 28 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick start</div>
            <pre style={{ fontSize: 12, color: '#8b9ab5', background: '#0b0f1a', borderRadius: 8, padding: 16, overflow: 'auto', lineHeight: 1.7, margin: 0 }}>{`curl -X POST https://api.novapay.in/v1/payments/create \\
  -H "X-API-KEY: ${showKey ? (profile?.api_key || 'YOUR_API_KEY') : '••••••••••••••'}" \\
  -H "X-TIMESTAMP: $(date +%s)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "${profile?.id || 'YOUR_MERCHANT_ID'}",
    "order_id": "ORD-001",
    "amount": 49900,
    "currency": "INR"
  }'`}</pre>
          </div>
        </>
      )}
    </div>
  );
}