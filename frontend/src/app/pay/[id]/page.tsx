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
  utr?: string;
  redirect_url?: string; // ✅ ADDED
}

const UPI_APPS = [
  {
    name: 'GPay',
    scheme: 'gpay://upi/pay?',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#fff"/><path d="M40.5 22H24v7h10.2c-1 4.6-4.9 7.8-10.2 7.8-6.2 0-11.3-5-11.3-11.3s5-11.2 11.3-11.2c2.8 0 5.3 1 7.3 2.7l5-5A18 18 0 0024 7C14.6 7 7 14.6 7 24s7.6 17 17 17c9.8 0 16.3-6.9 16.3-16.6 0-1.1-.1-2.2-.3-3.3h.5z" fill="#4285F4"/><path d="M8.6 16l5.8 4.3a11.2 11.2 0 0110.6-7.5c2.8 0 5.3 1 7.3 2.7l5-5A18 18 0 0024 7c-6.7 0-12.5 3.8-15.4 9.4v-.4z" fill="#EA4335"/><path d="M24 41c4.8 0 9-1.7 12.2-4.6l-5.7-4.8c-1.7 1.2-4 1.9-6.5 1.9a11.2 11.2 0 01-10.6-7.5L7.4 30c3 6 9.2 11 16.6 11z" fill="#34A853"/><path d="M40.5 22H24v7h10.2c-.5 2.4-1.9 4.4-3.9 5.7l5.7 4.8c3.3-3 5.3-7.6 5.3-12.8 0-1.1-.1-2.2-.3-3.3l.5.6z" fill="#FBBC05"/></svg>`,
  },
 {
  name: 'Paytm',
  scheme: 'paytmmp://pay?',
  svg: `<img src="/channels4_profile.jpg" style="width:42px;height:42px;border-radius:11px;object-fit:cover" alt="Paytm"/>`,
},
  {
    name: 'Any UPI',
    scheme: '',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#6C47FF"/><text x="24" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="12" fill="white">UPI</text><path d="M16 32l8-7 8 7M24 25v10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  },
];

const fmtAmount = (p: number) => (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const fmtDateTime = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function PayPage() {
  const params = useParams();
  const paymentId = params?.id as string;
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading'|'pending'|'success'|'expired'|'failed'>('loading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [utrCopied, setUtrCopied] = useState(false);
  const [paidAt, setPaidAt] = useState('');

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
            setPayment(data.data);
            setPageStatus('success');
            setShowSuccess(true);
            setPaidAt(fmtDateTime());
            clearInterval(poll);
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

  const copyUTR = () => {
    if (!payment?.utr) return;
    navigator.clipboard?.writeText(payment.utr);
    setUtrCopied(true);
    setTimeout(() => setUtrCopied(false), 2000);
  };

  // ✅ ADDED: redirect helper
  const handleDone = () => {
    if (payment?.redirect_url) {
      window.location.href = `${payment.redirect_url}?order_id=${payment.order_id || ''}&status=paid`;
    } else {
      setShowSuccess(false);
    }
  };

  const isUrgent = timeLeft > 0 && timeLeft < 60;
  const merchantDisplay = payment?.merchant_business_name || payment?.merchant_name || 'NovaPay';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #F0F2F8; min-height: 100vh; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        body { display: flex; align-items: center; justify-content: center; padding: 20px; }

        .card { background: #fff; border-radius: 24px; width: 100%; max-width: 390px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 48px rgba(0,0,0,0.1); }
        .prog { height: 3px; background: linear-gradient(90deg, #6C47FF, #9b7dff, #6C47FF); background-size: 200% 100%; animation: prog 2s linear infinite; }
        @keyframes prog { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .hdr { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F5; }
        .merchant { display: flex; align-items: center; gap: 10px; }
        .merchant-logo { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg,#6C47FF,#4F35CC); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px; color: #fff; overflow: hidden; flex-shrink: 0; }
        .merchant-logo img { width: 100%; height: 100%; object-fit: contain; }
        .merchant-name { font-weight: 700; font-size: 14px; color: #0A0A0F; }
        .merchant-sub { font-size: 11px; color: #9B9BB0; margin-top: 1px; }
        .secure-badge { display: flex; align-items: center; gap: 4px; background: #F0FDF6; border: 1px solid #BBF7D0; border-radius: 100px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #16A34A; }
        .secure-dot { width: 5px; height: 5px; border-radius: 50%; background: #22C55E; animation: blink 1.5s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .body { padding: 20px; }
        .amt-wrap { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #F5F5FA; }
        .amt-label { font-size: 11px; color: #9B9BB0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
        .amt { font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800; color: #0A0A0F; letter-spacing: -1.5px; line-height: 1; }
        .amt sup { font-size: 22px; vertical-align: super; font-weight: 700; }
        .order-pill { font-size: 11px; color: #C0C0CF; margin-top: 8px; font-family: monospace; background: #F8F8FC; display: inline-block; padding: 3px 10px; border-radius: 100px; }

        .qr-wrap { display: flex; justify-content: center; margin-bottom: 14px; }
        .qr-outer { position: relative; }
        .qr-frame { width: 196px; height: 196px; background: #fff; border-radius: 18px; border: 2px solid #F0F0F5; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 4px 20px rgba(108,71,255,0.08); }
        .qr-img { width: 180px; height: 180px; object-fit: contain; border-radius: 8px; transition: opacity 0.3s; }
        .qr-shimmer { width: 180px; height: 180px; background: linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .scan-beam { position: absolute; left: 4px; right: 4px; height: 2px; background: linear-gradient(90deg,transparent,#6C47FF,transparent); animation: beam 2.5s ease-in-out infinite; border-radius: 2px; box-shadow: 0 0 8px rgba(108,71,255,0.5); }
        @keyframes beam { 0%{top:4px;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:188px;opacity:0} }
        .corner { position: absolute; width: 16px; height: 16px; }
        .c-tl { top:-2px; left:-2px; border-top:3px solid #6C47FF; border-left:3px solid #6C47FF; border-radius:5px 0 0 0; }
        .c-tr { top:-2px; right:-2px; border-top:3px solid #6C47FF; border-right:3px solid #6C47FF; border-radius:0 5px 0 0; }
        .c-bl { bottom:-2px; left:-2px; border-bottom:3px solid #6C47FF; border-left:3px solid #6C47FF; border-radius:0 0 0 5px; }
        .c-br { bottom:-2px; right:-2px; border-bottom:3px solid #6C47FF; border-right:3px solid #6C47FF; border-radius:0 0 5px 0; }

        .scan-hint { text-align: center; font-size: 12px; color: #9B9BB0; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .save-btn { padding: 4px 12px; border-radius: 100px; background: #F4F1FF; border: none; color: #6C47FF; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .save-btn:hover { background: #EAE4FF; }

        .divider { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .dline { flex: 1; height: 1px; background: #F0F0F5; }
        .dtxt { font-size: 11px; color: #C0C0CF; font-weight: 500; }

        .upi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
        .upi-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px; border-radius: 14px; border: 1.5px solid #F0F0F5; background: #fff; cursor: pointer; transition: all 0.18s; font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
        .upi-btn:hover { border-color: #6C47FF; background: #F8F6FF; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(108,71,255,0.1); }
        .upi-btn:active { transform: scale(0.95); }
        .upi-icon { width: 42px; height: 42px; border-radius: 11px; overflow: hidden; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .upi-icon svg { width: 42px; height: 42px; display: block; }
        .upi-lbl { font-size: 10px; color: #9B9BB0; font-weight: 500; }

        .timer { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: #FAFAFA; border-radius: 12px; border: 1px solid #F0F0F5; }
        .timer.urgent { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
        .timer-left { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #9B9BB0; font-weight: 500; }
        .timer-icon { width: 26px; height: 26px; border-radius: 8px; background: #F0F0F5; display: flex; align-items: center; justify-content: center; font-size: 13px; }
        .timer-val { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #0A0A0F; letter-spacing: -0.5px; }
        .timer-val.urgent { color: #ef4444; }

        .footer { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 12px 20px; border-top: 1px solid #F5F5FA; }
        .ftxt { font-size: 11px; color: #C0C0CF; font-weight: 500; display: flex; align-items: center; gap: 4px; }

        .spin { animation: spinA 0.8s linear infinite; }
        @keyframes spinA { to{transform:rotate(360deg)} }

        /* Success overlay */
        .success-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; justify-content: center; background: rgba(10,10,15,0.5); backdrop-filter: blur(8px); animation: fadeIn 0.3s; }
        @media (min-width: 480px) { .success-overlay { align-items: center; } }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .success-box { background: #fff; border-radius: 28px 28px 0 0; padding: 36px 24px 40px; text-align: center; width: 100%; max-width: 480px; animation: slideUpSheet 0.4s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden; }
        @media (min-width: 480px) { .success-box { border-radius: 28px; max-width: 360px; padding: 36px 28px 28px; animation: popUp 0.5s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 24px 64px rgba(0,0,0,0.15); } }
        @keyframes slideUpSheet { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes popUp { from{opacity:0;transform:scale(0.8) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .check-wrap { position: relative; width: 88px; height: 88px; margin: 0 auto 20px; }
        .ripple-ring { position: absolute; inset: -8px; border-radius: 50%; border: 2px solid #22c55e; animation: ripple 1.8s ease-out infinite; }
        .ripple-ring-2 { animation-delay: 0.6s; }
        @keyframes ripple { 0%{transform:scale(0.8);opacity:0.5} 100%{transform:scale(2.4);opacity:0} }
        .check-circle { width: 88px; height: 88px; border-radius: 50%; background: #16a34a; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
        .check-path { stroke: #fff; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke-dasharray: 100; stroke-dashoffset: 100; animation: checkDraw 0.6s ease forwards 0.3s; }
        @keyframes checkDraw { from{stroke-dashoffset:100} to{stroke-dashoffset:0} }
        .s-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #0A0A0F; margin-bottom: 4px; animation: slideUp 0.4s ease forwards 0.2s; opacity: 0; }
        .s-sub { font-size: 13px; color: #9B9BB0; margin-bottom: 22px; animation: slideUp 0.4s ease forwards 0.3s; opacity: 0; }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .s-amount { background: #F0FDF6; border: 1px solid #BBF7D0; border-radius: 16px; padding: 16px 20px; margin-bottom: 14px; animation: slideUp 0.4s ease forwards 0.35s; opacity: 0; }
        .s-amount-label { font-size: 11px; color: #86EFAC; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px; }
        .s-amount-value { font-family: 'Syne', sans-serif; font-size: 34px; font-weight: 800; color: #16A34A; letter-spacing: -1px; }
        .s-details { background: #FAFAFA; border: 1px solid #F0F0F5; border-radius: 14px; padding: 14px 16px; margin-bottom: 18px; animation: slideUp 0.4s ease forwards 0.4s; opacity: 0; }
        .s-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
        .s-row + .s-row { border-top: 1px solid #F0F0F5; }
        .s-row-label { font-size: 12px; color: #9B9BB0; }
        .s-row-val { font-size: 12px; color: #0A0A0F; font-weight: 500; }
        .utr-btn { display: inline-flex; align-items: center; gap: 5px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 3px 10px; font-size: 12px; color: #2563EB; font-family: monospace; cursor: pointer; transition: all 0.15s; }
        .utr-btn.copied { color: #16A34A; border-color: #BBF7D0; background: #F0FDF6; }
        .s-btn { width: 100%; padding: 14px; border-radius: 14px; background: #16a34a; border: none; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; animation: slideUp 0.4s ease forwards 0.45s; opacity: 0; }
        .s-btn:hover { background: #15803d; }
        .s-powered { font-size: 11px; color: #C0C0CF; margin-top: 14px; animation: slideUp 0.4s ease forwards 0.5s; opacity: 0; }

        /* Expired/Failed */
        .overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(10,10,15,0.7); backdrop-filter: blur(16px); animation: fadeIn 0.3s; }
        .overlay-box { background: #fff; border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 300px; width: 90%; animation: popUp 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
        .ov-circle { width: 72px; height: 72px; border-radius: 50%; background: #FEF2F2; border: 2px solid #FECACA; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px; }
        .ov-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #0A0A0F; margin-bottom: 6px; }
        .ov-sub { font-size: 13px; color: #9B9BB0; line-height: 1.6; }
        .ov-btn { margin-top: 20px; padding: 12px 24px; border-radius: 12px; background: #F5F5FA; border: none; color: #0A0A0F; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .ov-btn:hover { background: #EBEBF5; }
      `}</style>

      {/* Success */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-box">
            <div className="check-wrap">
              <div className="ripple-ring" />
              <div className="ripple-ring ripple-ring-2" />
              <div className="check-circle">
                <svg width="42" height="42" viewBox="0 0 42 42">
                  <path className="check-path" d="M10 21 L18 30 L32 13" />
                </svg>
              </div>
            </div>
            <div className="s-title">Payment Successful!</div>
            <div className="s-sub">Transaction confirmed</div>
            <div className="s-amount">
              <div className="s-amount-label">Amount Paid</div>
              <div className="s-amount-value">₹{payment ? fmtAmount(payment.amount) : '—'}</div>
            </div>
            <div className="s-details">
              {payment?.order_id && (
                <div className="s-row">
                  <span className="s-row-label">Order ID</span>
                  <span className="s-row-val" style={{ fontFamily: 'monospace', fontSize: 11 }}>{payment.order_id}</span>
                </div>
              )}
              <div className="s-row">
                <span className="s-row-label">Paid to</span>
                <span className="s-row-val">{merchantDisplay}</span>
              </div>
              {paidAt && (
                <div className="s-row">
                  <span className="s-row-label">Date & time</span>
                  <span className="s-row-val">{paidAt}</span>
                </div>
              )}
              {payment?.utr && (
                <div className="s-row">
                  <span className="s-row-label">UTR</span>
                  <button className={`utr-btn ${utrCopied ? 'copied' : ''}`} onClick={copyUTR}>
                    {utrCopied ? '✓ Copied!' : `📋 ${payment.utr}`}
                  </button>
                </div>
              )}
            </div>
            {/* ✅ CHANGED: Done button now redirects to merchant's return URL */}
            <button className="s-btn" onClick={handleDone}>Done</button>
            <div className="s-powered">🔒 Secured by NovaPay</div>
          </div>
        </div>
      )}

      {/* Expired */}
      {pageStatus === 'expired' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-circle">⏱</div>
            <div className="ov-title">Link Expired</div>
            <div className="ov-sub">This payment link has expired.<br />Please request a new one.</div>
            <button className="ov-btn" onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      )}

      {/* Failed */}
      {pageStatus === 'failed' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-circle">✕</div>
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
          <div className="secure-badge">
            <div className="secure-dot" />
            Secure
          </div>
        </div>

        <div className="body">
          {pageStatus === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9B9BB0' }}>
              <div style={{ width: 28, height: 28, border: '2px solid #F0F0F5', borderTopColor: '#6C47FF', borderRadius: '50%', margin: '0 auto 12px' }} className="spin" />
              Loading payment…
            </div>
          ) : (
            <>
              <div className="amt-wrap">
                <div className="amt-label">Total Amount</div>
                <div className="amt">
                  <sup>₹</sup>{payment ? fmtAmount(payment.amount) : '—'}
                </div>
                {payment?.order_id && <div className="order-pill">{payment.order_id}</div>}
              </div>

              <div className="qr-wrap">
                <div className="qr-outer">
                  <div className="qr-frame">
                    {!qrLoaded && <div className="qr-shimmer" />}
                    {payment?.qr_code_base64 && (
                      <img src={payment.qr_code_base64} alt="UPI QR" className="qr-img"
                        style={{ opacity: qrLoaded ? 1 : 0 }} onLoad={() => setQrLoaded(true)} />
                    )}
                    {qrLoaded && <div className="scan-beam" />}
                  </div>
                  <div className="corner c-tl" />
                  <div className="corner c-tr" />
                  <div className="corner c-bl" />
                  <div className="corner c-br" />
                </div>
              </div>

              <div className="scan-hint">
                <span>Scan with any UPI app to pay</span>
                <button onClick={downloadQR} className="save-btn">⬇ Save QR</button>
              </div>

              <div className="divider">
                <div className="dline" /><div className="dtxt">or pay with</div><div className="dline" />
              </div>

              <div className="upi-row">
                {UPI_APPS.map(app => (
                  <button key={app.name} className="upi-btn" onClick={() => handleUPI(app)}>
                    <div className="upi-icon" dangerouslySetInnerHTML={{ __html: app.svg }} />
                    <span className="upi-lbl">{app.name}</span>
                  </button>
                ))}
              </div>

              <div className={`timer ${isUrgent ? 'urgent' : ''}`}>
                <div className="timer-left">
                  <div className="timer-icon">⏱</div>
                  <span>Expires in</span>
                </div>
                <span className={`timer-val ${isUrgent ? 'urgent' : ''}`}>
                  {timeLeft > 0 ? fmtTime(timeLeft) : '--:--'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="footer">
          <div className="ftxt">🔒 256-bit SSL</div>
          <div className="ftxt">✓ RBI regulated</div>
          <div className="ftxt" style={{ color: '#6C47FF', fontWeight: 600 }}>N NovaPay</div>
        </div>
      </div>
    </>
  );
}