'use client';
import { useEffect, useState, useCallback } from 'react';

const S: Record<string, any> = {
  root: { minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" },
  card: { background: 'linear-gradient(135deg, #111827 0%, #1a2332 100%)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' },
  logoIcon: { width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#0a0f1a' },
  logoText: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  merchant: { textAlign: 'center' as const, marginBottom: 24 },
  merchantName: { fontSize: 15, color: '#94a3b8', marginBottom: 6 },
  amount: { fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-2px', lineHeight: 1 },
  currency: { fontSize: 20, fontWeight: 500, color: '#64748b', marginRight: 4 },
  orderId: { fontSize: 12, color: '#475569', marginTop: 6 },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' },
  qrWrap: { background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  qrImg: { width: 200, height: 200, display: 'block' },
  orText: { textAlign: 'center' as const, color: '#475569', fontSize: 13, marginBottom: 16, position: 'relative' as const },
  apps: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  appBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#e2e8f0', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' },
  upiInput: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 },
  payBtn: { width: '100%', background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)', border: 'none', borderRadius: 12, padding: '15px', color: '#0a0f1a', fontWeight: 700, fontSize: 15, cursor: 'pointer', letterSpacing: '-0.3px' },
  status: (s: string) => ({ textAlign: 'center' as const, padding: '20px 0', color: s === 'paid' ? '#00e5b0' : s === 'failed' ? '#ef4444' : '#f59e0b' }),
  statusIcon: { fontSize: 48, marginBottom: 12 },
  statusText: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  statusSub: { fontSize: 14, color: '#64748b' },
  loader: { textAlign: 'center' as const, padding: '40px 0', color: '#64748b' },
  spin: { display: 'inline-block', width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#00e5b0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 },
  polling: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#475569', fontSize: 13, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#00e5b0', animation: 'blink 1.5s infinite' },
  footer: { textAlign: 'center' as const, marginTop: 24, color: '#334155', fontSize: 12 },
};

const UPI_APPS = [
  { icon: '🟢', label: 'PhonePe',   scheme: 'phonepe://' },
  { icon: '🔵', label: 'Google Pay', scheme: 'gpay://'    },
  { icon: '💙', label: 'Paytm',     scheme: 'paytmmp://' },
  { icon: '🏦', label: 'BHIM',      scheme: 'upi://'     },
];

function formatAmount(paise: number) {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function PayPage({ params }: { params: { id: string } }) {
  const paymentId = params?.id;
  const [data, setData]     = useState<any>(null);
  const [status, setStatus] = useState<string>('loading');
  const [upiId, setUpiId]   = useState('');
  const [paying, setPaying] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/public/payment/${paymentId}`);
      const j = await r.json();
      if (j.success && j.data) {
        setData(j.data);
        setStatus(j.data.status || 'pending');
      } else {
        setStatus('not_found');
      }
    } catch {
      setStatus('error');
    }
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) return;
    fetchStatus();
  }, [paymentId, fetchStatus]);

  useEffect(() => {
    if (status !== 'pending') return;
    const t = setInterval(fetchStatus, 4000);
    return () => clearInterval(t);
  }, [status, fetchStatus]);

  const openApp = (scheme: string) => {
    if (!data?.upi_intent_link) return;
    const url = data.upi_intent_link.replace('upi://', scheme);
    window.location.href = url;
  };

  const payWithUPI = () => {
    if (!upiId.includes('@')) return;
    if (!data?.upi_intent_link) return;
    const url = `${data.upi_intent_link}&pn=${encodeURIComponent(data.merchant_name || 'Merchant')}&cu=INR&pa=${upiId}`;
    window.location.href = url;
    setPaying(true);
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        button:hover { opacity: 0.85 }
      `}</style>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>N</div>
          <span style={S.logoText}>NovaPay</span>
        </div>

        {status === 'loading' && (
          <div style={S.loader}>
            <div style={S.spin} />
            <div>Loading payment…</div>
          </div>
        )}

        {(status === 'not_found' || status === 'error') && (
          <div style={S.status('failed')}>
            <div style={S.statusIcon}>❌</div>
            <div style={S.statusText}>Payment not found</div>
            <div style={S.statusSub}>This link may be invalid or expired.</div>
          </div>
        )}

        {status === 'paid' && (
          <div style={S.status('paid')}>
            <div style={S.statusIcon}>✅</div>
            <div style={S.statusText}>Payment Successful!</div>
            <div style={S.statusSub}>₹{formatAmount(data?.amount || 0)} paid successfully</div>
            {data?.utr && <div style={{ ...S.statusSub, marginTop: 8 }}>UTR: {data.utr}</div>}
          </div>
        )}

        {status === 'failed' && (
          <div style={S.status('failed')}>
            <div style={S.statusIcon}>❌</div>
            <div style={S.statusText}>Payment Failed</div>
            <div style={S.statusSub}>Please request a new payment link.</div>
          </div>
        )}

        {status === 'pending' && data && (
          <>
            <div style={S.merchant}>
              <div style={S.merchantName}>{data.merchant_name || 'Merchant'}</div>
              <div style={S.amount}>
                <span style={S.currency}>₹</span>
                {formatAmount(data.amount)}
              </div>
              {data.order_id && <div style={S.orderId}>Order: {data.order_id}</div>}
              {data.customer_reference && <div style={{ ...S.orderId, marginTop: 2 }}>{data.customer_reference}</div>}
            </div>

            <div style={S.divider} />

            {data.qr_code_base64 && (
              <div style={S.qrWrap}>
                <img src={`data:image/png;base64,${data.qr_code_base64}`} style={S.qrImg} alt="UPI QR Code" />
              </div>
            )}

            <div style={S.orText}>— or pay with UPI app —</div>

            <div style={S.apps}>
              {UPI_APPS.map(app => (
                <button key={app.label} style={S.appBtn} onClick={() => openApp(app.scheme)}>
                  <span style={{ fontSize: 20 }}>{app.icon}</span>
                  {app.label}
                </button>
              ))}
            </div>

            <div style={S.divider} />

            <input
              style={S.upiInput}
              placeholder="Enter UPI ID (e.g. name@okicici)"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
            />
            <button style={S.payBtn} onClick={payWithUPI} disabled={paying}>
              {paying ? 'Opening UPI App…' : `Pay ₹${formatAmount(data.amount)}`}
            </button>

            <div style={S.polling}>
              <div style={S.dot} />
              Waiting for payment confirmation…
            </div>
          </>
        )}

        <div style={S.footer}>Secured by NovaPay · UPI certified</div>
      </div>
    </div>
  );
}