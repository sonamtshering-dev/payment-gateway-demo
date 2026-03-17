'use client';
import { useState, useEffect } from 'react';

const fmt = (p: number) => `₹${(p/100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const STATUS: Record<string, { bg: string; color: string }> = {
  paid:    { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
  pending: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
  failed:  { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  expired: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

export default function PaymentsPage() {
  const [form, setForm]       = useState({ amount: '', order_id: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') || '' : '';
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  const genOrderId = () => `TXN_${Date.now()}`;

  useEffect(() => {
    setForm(f => ({ ...f, order_id: genOrderId() }));
    fetch('/api/v1/dashboard/transactions?limit=5', { headers: headers() })
      .then(r => r.json()).then(d => { if (d.success) setHistory(d.data?.data || d.data?.transactions || []); }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { setError('Please enter a valid amount'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch('/api/v1/dashboard/payments/create', { method: 'POST', headers: headers(), body: JSON.stringify({ amount: Math.round(Number(form.amount) * 100), currency: 'INR', order_id: form.order_id || genOrderId(), customer_reference: form.note || 'Payment' }) });
      const d = await r.json();
      if (d.success) { setResult(d.data); setForm({ amount: '', order_id: genOrderId(), note: '' }); }
      else {
        const msg = d.error || 'Failed';
        if (msg.includes('KYC_REQUIRED')) setError('Complete KYC verification before creating payments.');
        else if (msg.includes('SUBSCRIPTION_REQUIRED')) setError('Purchase a subscription plan to start accepting payments.');
        else if (msg.includes('UPI_REQUIRED')) setError('Add a UPI ID in Connect Merchant before creating payments.');
        else setError(msg);
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); };
  const payLink = result && typeof window !== 'undefined' ? `${window.location.origin}/pay/${result.payment_id}` : '';

  const inp: React.CSSProperties = { background: '#030d1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', color: '#dbeafe', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 700 }}>

      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Generate Payment Link</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>Create a UPI payment link to share with your customers</div>

      <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 28px' }}>

        {/* Transaction ID */}
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>Transaction ID *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} placeholder="TXN_..." />
            <button onClick={() => setForm(f => ({ ...f, order_id: genOrderId() }))} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 16px', color: '#dbeafe', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>Generate</button>
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>Amount (₹) *</label>
          <input style={inp} placeholder="100.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} type="number" min="1" />
        </div>

        {/* Note */}
        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Payment Purpose</label>
          <input style={inp} placeholder="e.g. Invoice #123, Product purchase" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 18 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={generate} disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '13px 0', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Generating…' : 'Generate Payment Link'}
          </button>
          <button onClick={() => { setForm({ amount: '', order_id: genOrderId(), note: '' }); setResult(null); setError(''); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '13px 20px', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Reset</button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: '#0f1d35', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16, padding: '24px 28px', marginTop: 16 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#3b82f6', marginBottom: 18 }}>✅ Payment Link Created</div>

          {/* Payment link */}
          <label style={lbl}>Payment Link</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: '#3b82f6', fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{payLink}</div>
            <button onClick={() => copy(payLink, 'link')} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '11px 16px', color: '#3b82f6', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>{copied === 'link' ? '✓ Copied!' : 'Copy'}</button>
          </div>

          {/* QR */}
          {result.qr_code_base64 && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' as const }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 10 }}>
                <img src={`data:image/png;base64,${result.qr_code_base64}`} style={{ width: 140, height: 140, display: 'block' }} alt="QR" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Share this QR code or link with your customer to collect payment.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  <button onClick={() => copy(result.upi_intent_link || '', 'upi')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#dbeafe', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{copied === 'upi' ? '✓ Copied!' : 'Copy UPI Link'}</button>
                  <button onClick={() => window.open(payLink, '_blank')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#dbeafe', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Open Page ↗</button>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#4b5563' }}>
                  Payment ID: <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{result.payment_id}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent payments */}
      {history.length > 0 && (
        <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', marginTop: 16 }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>Recent Payments</div>
          {history.map((p: any, i: number) => {
            const s = STATUS[p.status] || STATUS.pending;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 22px', borderBottom: i < history.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background='transparent')}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>₹{(p.amount/100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2, fontFamily: 'monospace' }}>{p.order_id}</div>
                </div>
                <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>{p.status}</span>
                <button onClick={() => window.open(`/pay/${p.id}`, '_blank')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 12px', color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>View</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
