'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface PaymentData {
  payment_id: string;
  upi_intent_link: string;
  qr_code_base64: string;
  amount: number;
  currency: string;
  expires_at: string;
  status: string;
  order_id?: string;
  merchant_name?: string;
  merchant_logo?: string;
  merchant_business_name?: string;
}

const UPI_APPS = [
  {
    name: 'GPay',
    scheme: 'gpay://upi/pay?',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M43.6 20.1H24v7.9h11.3c-1.1 5.1-5.5 8.7-11.3 8.7-6.9 0-12.5-5.6-12.5-12.5S17.1 11.7 24 11.7c3.1 0 5.9 1.1 8.1 3l5.6-5.6C34.4 5.9 29.5 3.7 24 3.7 12.9 3.7 3.9 12.7 3.9 23.8s9 20.1 20.1 20.1c11.6 0 19.3-8.1 19.3-19.6 0-1.3-.1-2.6-.4-3.8h.7z" fill="#4285F4"/><path d="M6.3 14.7l6.5 4.8c1.8-4.6 6.2-7.8 11.2-7.8 3.1 0 5.9 1.1 8.1 3l5.6-5.6C34.4 5.9 29.5 3.7 24 3.7c-7.6 0-14.2 4.3-17.7 10.6v.4z" fill="#EA4335"/><path d="M24 43.9c5.4 0 10.2-2 13.8-5.2l-6.4-5.4c-2 1.4-4.6 2.2-7.4 2.2-5.8 0-10.7-3.9-12.4-9.2l-6.4 5c3.5 6.5 10.3 10.6 18.8 10.6z" fill="#34A853"/><path d="M43.6 20.1H24v7.9h11.3c-.5 2.7-2.1 4.9-4.3 6.4l6.4 5.4c3.7-3.4 5.9-8.5 5.9-14.5 0-1.4-.1-2.6-.4-3.8l.7.6z" fill="#FBBC05"/></svg>`,
  },
  {
    name: 'Paytm',
    scheme: 'paytmmp://pay?',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="10" fill="#00BAF2"/><text x="24" y="19" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="10" fill="white">paytm</text><rect x="7" y="23" width="34" height="3.5" rx="1.75" fill="white" opacity="0.95"/><text x="24" y="35" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="8" fill="white">BANK</text></svg>`,
  },
  {
    name: 'Any UPI',
    scheme: '',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="10" fill="#1d4ed8"/><text x="24" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="11" fill="white">UPI</text><path d="M16 30 L24 24 L32 30 M24 24 L24 38" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  },
];

const fmtAmount = (p: number) => (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

export default function PayPage() {
  const params = useParams();
  const paymentId = params?.id as string;
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading'|'pending'|'success'|'expired'|'failed'>('loading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchPayment = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/public/payment/${paymentId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPayment(data.data);
        const s = data.data.status;
        if (s === 'paid' || s === 'completed' || s === 'success') setPageStatus('success');
        else if (s === 'expired') setPageStatus('expired');
        else if (s === 'failed') setPageStatus('failed');
        else setPageStatus('pending');
        const exp = new Date(data.data.expires_at).getTime();
        setTimeLeft(Math.max(0, Math.floor((exp - Date.now()) / 1000)));
      }
    } catch { setPageStatus('failed'); }
  }, [paymentId]);

  useEffect(() => { fetchPayment(); }, [fetchPayment]);

  useEffect(() => {
    if (pageStatus !== 'pending') return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/public/payment/${paymentId}`);
        const data = await res.json();
        if (data.success) {
          const s = data.data.status;
          if (s === 'paid' || s === 'completed' || s === 'success') {
            setPageStatus('success'); setShowSuccess(true); clearInterval(poll);
          } else if (s === 'expired') { setPageStatus('expired'); clearInterval(poll); }
          else if (s === 'failed') { setPageStatus('failed'); clearInterval(poll); }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [pageStatus, paymentId]);

  useEffect(() => {
    if (pageStatus !== 'pending' || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(t); setPageStatus('expired'); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [pageStatus, timeLeft]);

  const downloadQR = () => {
    if (!payment?.qr_code_base64) return;
    const a = document.createElement('a');
    a.href = payment.qr_code_base64;
    a.download = `novapay-qr-${payment.order_id || payment.payment_id}.png`;
    a.click();
  };

  const handleUPI = (app: typeof UPI_APPS[0]) => {
    if (!payment?.upi_intent_link) return;
    const url = app.scheme ? payment.upi_intent_link.replace('upi://', app.scheme) : payment.upi_intent_link;
    window.location.href = url;
  };

  const isUrgent = timeLeft > 0 && timeLeft < 60;
  const merchantDisplay = payment?.merchant_business_name || payment?.merchant_name || 'NovaPay';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #020817; min-height: 100vh; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        body { display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #0f1d35; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; width: 100%; max-width: 400px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(29,78,216,0.1); }
        .prog { height: 3px; background: linear-gradient(90deg, #1d4ed8, #3b82f6); animation: prog 2s linear infinite; background-size: 200% 100%; }
        @keyframes prog { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .hdr { padding: 20px 24px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .merchant { display: flex; align-items: center; gap: 12px; }
        .merchant-logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg,#1d4ed8,#1e40af); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; color: #fff; overflow: hidden; }
        .merchant-logo img { width: 100%; height: 100%; object-fit: contain; }
        .merchant-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: #dbeafe; }
        .merchant-sub { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 1px; }
        .live-pill { display: flex; align-items: center; gap: 5px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); border-radius: 100px; padding: 5px 12px; font-size: 11px; font-weight: 600; color: #34d399; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: blink 1.5s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .body { padding: 24px; }
        .amount-section { text-align: center; margin-bottom: 24px; }
        .amt-label { font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
        .amt-value { font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800; color: #dbeafe; letter-spacing: -2px; line-height: 1; }
        .amt-rupee { font-size: 28px; vertical-align: super; margin-right: 2px; }
        .amt-order { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 6px; font-family: monospace; }
        .qr-outer { display: flex; justify-content: center; margin-bottom: 16px; }
        .qr-wrap { position: relative; }
        .qr-frame { width: 200px; height: 200px; background: #fff; border-radius: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 3px rgba(29,78,216,0.3); }
        .qr-img { width: 184px; height: 184px; object-fit: contain; border-radius: 6px; transition: opacity 0.3s; }
        .qr-shimmer { width: 184px; height: 184px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .scan-beam { position: absolute; left: 8px; right: 8px; height: 2px; background: linear-gradient(90deg,transparent,#3b82f6,transparent); animation: beam 2.5s ease-in-out infinite; border-radius: 2px; box-shadow: 0 0 8px #3b82f6; }
        @keyframes beam { 0%{top:8px;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:192px;opacity:0} }
        .corner { position: absolute; width: 20px; height: 20px; }
        .corner-tl { top:-3px; left:-3px; border-top:3px solid #3b82f6; border-left:3px solid #3b82f6; border-radius:4px 0 0 0; }
        .corner-tr { top:-3px; right:-3px; border-top:3px solid #3b82f6; border-right:3px solid #3b82f6; border-radius:0 4px 0 0; }
        .corner-bl { bottom:-3px; left:-3px; border-bottom:3px solid #3b82f6; border-left:3px solid #3b82f6; border-radius:0 0 0 4px; }
        .corner-br { bottom:-3px; right:-3px; border-bottom:3px solid #3b82f6; border-right:3px solid #3b82f6; border-radius:0 0 4px 0; }
        .scan-hint { text-align: center; font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 20px; }
        .divider { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .dline { flex:1; height:1px; background:rgba(255,255,255,0.07); }
        .dtxt { font-size: 11px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.1em; }
        .upi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 20px; }
        .upi-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
        .upi-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(29,78,216,0.3); transform: translateY(-2px); }
        .upi-btn:active { transform: scale(0.95); }
        .upi-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .upi-icon-wrap { width: 40px; height: 40px; border-radius: 10px; overflow: hidden; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .upi-icon-wrap svg { width: 40px; height: 40px; display: block; }
        .upi-lbl { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 500; }
        .timer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; }
        .timer.urgent { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.06); }
        .timer-left { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.4); }
        .timer-val { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #dbeafe; }
        .timer-val.urgent { color: #ef4444; }
        .footer { padding: 14px 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .footer-txt { font-size: 11px; color: rgba(255,255,255,0.2); }
        .footer-brand { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 500; }
        .nbadge { width: 18px; height: 18px; border-radius: 5px; background: linear-gradient(135deg,#1d4ed8,#1e40af); display: flex; align-items: center; justify-content: center; font-family: 'Syne',sans-serif; font-weight: 800; font-size: 9px; color: #fff; }
        .overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(2,8,23,0.92); backdrop-filter: blur(16px); animation: fadeIn 0.3s; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .overlay-box { background: #0f1d35; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 300px; width: 90%; animation: popUp 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes popUp { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        .ov-circle { width: 72px; height: 72px; border-radius: 50%; background: rgba(16,185,129,0.12); border: 2px solid rgba(16,185,129,0.4); display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px; }
        .ov-circle.fail { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
        .ov-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #dbeafe; margin-bottom: 6px; }
        .ov-sub { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.6; }
        .ov-btn { margin-top: 20px; padding: 11px 24px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #dbeafe; font-size: 14px; cursor: pointer; }
        .spin { animation: spinA 0.8s linear infinite; }
        @keyframes spinA { to{transform:rotate(360deg)} }
      `}</style>

      {showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-circle">✓</div>
            <div className="ov-title">Payment Done!</div>
            <div className="ov-sub">{payment && `₹${fmtAmount(payment.amount)}`} paid successfully</div>
          </div>
        </div>
      )}

      {pageStatus === 'expired' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-circle fail">⏱</div>
            <div className="ov-title">Link Expired</div>
            <div className="ov-sub">This payment link has expired.<br />Please request a new one.</div>
            <button className="ov-btn" onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      )}

      {pageStatus === 'failed' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-circle fail">✕</div>
            <div className="ov-title">Payment Failed</div>
            <div className="ov-sub">Something went wrong.<br />Please try again.</div>
            <button className="ov-btn" onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="prog" />

        <div className="hdr">
          <div className="merchant">
            <div className="merchant-logo">
              {payment?.merchant_logo
                ? <img src={payment.merchant_logo} alt="logo" />
                : merchantDisplay.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="merchant-name">{merchantDisplay}</div>
              <div className="merchant-sub">Secure UPI Payment</div>
            </div>
          </div>
          <div className="live-pill"><div className="live-dot" />Live</div>
        </div>

        <div className="body">
          {pageStatus === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px' }} className="spin" />
              Loading payment…
            </div>
          ) : (
            <>
              <div className="amount-section">
                <div className="amt-label">Amount to Pay</div>
                <div className="amt-value">
                  <span className="amt-rupee">₹</span>
                  {payment ? fmtAmount(payment.amount) : '—'}
                </div>
                {payment?.order_id && <div className="amt-order">{payment.order_id}</div>}
              </div>

              <div className="qr-outer">
                <div className="qr-wrap">
                  <div className="qr-frame">
                    {!qrLoaded && <div className="qr-shimmer" />}
                    {payment?.qr_code_base64 && (
                      <img src={payment.qr_code_base64} alt="UPI QR" className="qr-img"
                        style={{ opacity: qrLoaded ? 1 : 0 }} onLoad={() => setQrLoaded(true)} />
                    )}
                    {qrLoaded && <div className="scan-beam" />}
                  </div>
                  <div className="corner corner-tl" />
                  <div className="corner corner-tr" />
                  <div className="corner corner-bl" />
                  <div className="corner corner-br" />
                </div>
              </div>

              <div className="scan-hint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span>Scan with any UPI app to pay</span>
                <button onClick={downloadQR} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5.5l3 3 3-3M1 10h10" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Save QR
                </button>
              </div>

              <div className="divider">
                <div className="dline" /><div className="dtxt">Or open in</div><div className="dline" />
              </div>

              <div className="upi-grid">
                {UPI_APPS.map(app => (
                  <button key={app.name} className="upi-btn" onClick={() => handleUPI(app)}>
                    <div className="upi-icon-wrap" dangerouslySetInnerHTML={{ __html: app.svg }} />
                    <span className="upi-lbl">{app.name}</span>
                  </button>
                ))}
              </div>

              <div className={`timer ${isUrgent ? 'urgent' : ''}`}>
                <div className="timer-left">⏱ Session expires in</div>
                <span className={`timer-val ${isUrgent ? 'urgent' : ''}`}>
                  {timeLeft > 0 ? fmtTime(timeLeft) : '--:--'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="footer">
          <span className="footer-txt">🔒 256-bit encrypted</span>
          <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>·</span>
          <div className="footer-brand">Powered by <div className="nbadge">N</div> NovaPay</div>
        </div>
      </div>
    </>
  );
}
