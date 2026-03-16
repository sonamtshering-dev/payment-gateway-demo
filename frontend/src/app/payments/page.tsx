'use client';
import { useState, useEffect } from 'react';

const S: Record<string, any> = {
  wrap: { padding: '32px 24px', maxWidth: 720, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, letterSpacing: '-0.5px' },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 28 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },
  input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  btn: { background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)', border: 'none', borderRadius: 10, padding: '13px 24px', color: '#0a0f1a', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 8 },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginTop: 24 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 },
  linkBox: { background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  linkText: { flex: 1, color: '#00e5b0', fontSize: 13, wordBreak: 'break-all' as const, fontFamily: 'monospace' },
  copyBtn: { background: 'rgba(0,229,176,0.15)', border: '1px solid rgba(0,229,176,0.3)', borderRadius: 8, padding: '7px 14px', color: '#00e5b0', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  qrWrap: { background: '#fff', borderRadius: 12, padding: 12, display: 'inline-block', marginBottom: 16 },
  qrImg: { width: 160, height: 160, display: 'block' },
  tag: (s: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s === 'paid' ? 'rgba(0,229,176,0.1)' : s === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: s === 'paid' ? '#00e5b0' : s === 'failed' ? '#ef4444' : '#f59e0b' }),
  error: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginTop: 12 },
  history: { display: 'flex', flexDirection: 'column' as const, gap: 10, marginTop: 16 },
  histItem: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  histInfo: { flex: 1 },
  histAmount: { fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  histOrder: { fontSize: 12, color: '#475569', marginTop: 2 },
};

function formatAmount(paise: number) {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function PaymentsPage() {
  const [form, setForm]       = useState({ title: '', amount: '', order_id: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') || '' : '';
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  useEffect(() => {
    // Load recent payments
    fetch('/api/v1/dashboard/transactions?limit=5', { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d.success && d.data?.transactions) setHistory(d.data.transactions); })
      .catch(() => {});
  }, []);

  const generate = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Please enter a valid amount'); return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const body: any = {
        amount: Math.round(Number(form.amount) * 100),
        currency: 'INR',
        order_id: form.order_id || `ORDER-${Date.now()}`,
        customer_reference: form.note || form.title || 'Payment',
      };
      const r = await fetch('/api/v1/dashboard/payments/create', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) {
        setResult(d.data);
        setForm({ title: '', amount: '', order_id: '', note: '' });
      } else {
        // Show specific gating errors nicely
        const msg = d.error || 'Failed to create payment';
        if (msg.includes('KYC_REQUIRED')) setError('⚠️ Complete your KYC verification before creating payments.');
        else if (msg.includes('SUBSCRIPTION_REQUIRED')) setError('⚠️ Purchase a subscription plan to start accepting payments.');
        else if (msg.includes('UPI_REQUIRED')) setError('⚠️ Add a UPI ID in Connect Merchant before creating payments.');
        else setError(msg);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payLink = result ? `${window.location.origin}/pay/${result.payment_id}` : '';

  return (
    <div style={S.wrap}>
      <div style={S.title}>Payment Link Generator</div>
      <div style={S.sub}>Create a UPI payment link to share with your customers</div>

      <div style={S.grid}>
        <div style={S.field}>
          <label style={S.label}>Amount (₹) *</label>
          <input style={S.input} placeholder="e.g. 499.00" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} type="number" min="1" />
        </div>
        <div style={S.field}>
          <label style={S.label}>Order ID (optional)</label>
          <input style={S.input} placeholder="Auto-generated if empty" value={form.order_id}
            onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} />
        </div>
      </div>

      <div style={{ ...S.field, marginBottom: 8 }}>
        <label style={S.label}>Note / Description (optional)</label>
        <input style={S.input} placeholder="e.g. Invoice #123, Product purchase" value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
      </div>

      <button style={S.btn} onClick={generate} disabled={loading}>
        {loading ? 'Generating…' : '⚡ Generate Payment Link'}
      </button>

      {error && <div style={S.error}>{error}</div>}

      {result && (
        <div style={S.card}>
          <div style={S.cardTitle}>✅ Payment Link Created</div>

          <div style={S.linkBox}>
            <span style={S.linkText}>{payLink}</span>
            <button style={S.copyBtn} onClick={() => copy(payLink)}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          {result.qr_code_base64 && (
            <div style={S.qrWrap}>
              <img src={`data:image/png;base64,${result.qr_code_base64}`} style={S.qrImg} alt="QR Code" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            <button style={{ ...S.copyBtn, padding: '9px 16px', fontSize: 13 }}
              onClick={() => copy(result.upi_intent_link || '')}>
              Copy UPI Link
            </button>
            <button style={{ ...S.copyBtn, padding: '9px 16px', fontSize: 13 }}
              onClick={() => window.open(payLink, '_blank')}>
              Open Payment Page ↗
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>
            Payment ID: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{result.payment_id}</span>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Recent Payments</div>
          <div style={S.history}>
            {history.map((p: any) => (
              <div key={p.id} style={S.histItem}>
                <div style={S.histInfo}>
                  <div style={S.histAmount}>₹{formatAmount(p.amount)}</div>
                  <div style={S.histOrder}>{p.order_id}</div>
                </div>
                <span style={S.tag(p.status)}>{p.status}</span>
                <button style={{ ...S.copyBtn, fontSize: 11 }}
                  onClick={() => window.open(`/pay/${p.id}`, '_blank')}>
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}