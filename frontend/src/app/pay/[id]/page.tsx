'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  business_name?: string;
  primary_color?: string;
  customer_reference?: string;
  utr?: string;
  redirect_url?: string;
  usdt_enabled?: boolean;
  crypto_networks?: { id: string; label: string }[];
}

interface CryptoInit {
  crypto_payment_id: string;
  network: string;
  network_label: string;
  merchant_wallet: string;
  expected_usdt: string;
  exchange_rate: number;
  inr_amount: number;
  qr_code_base64: string;
  expires_at: string;
}

const UPI_APPS = [
  {
    name: 'GPay',
    scheme: 'tez://upi/pay?',
    svg: `<img src="/payment-logos/gpay.png" style="width:48px;height:48px;border-radius:11px;object-fit:contain;background:#fff" alt="Google Pay"/>`,
  },
  {
    name: 'PhonePe',
    scheme: 'phonepe://upi/pay?',
    svg: `<img src="/payment-logos/phonepe.jpeg" style="width:48px;height:48px;border-radius:11px;object-fit:cover" alt="PhonePe"/>`,
  },
  {
    name: 'Paytm',
    scheme: 'paytmmp://pay?',
    svg: `<img src="/payment-logos/paytm.jpeg" style="width:48px;height:48px;border-radius:11px;object-fit:cover" alt="Paytm"/>`,
  },
];

const fmtAmount = (p: number) => (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const fmtDateTime = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const extractUPIId = (link?: string): string | null => {
  if (!link) return null;
  try { return new URL(link.replace('upi://', 'https://')).searchParams.get('pa'); } catch { return null; }
};

const goBack = (redirectUrl?: string | null) => {
  if (redirectUrl) { window.location.href = redirectUrl; return; }
  if (window.history.length > 1) { window.history.back(); return; }
  window.location.href = '/';
};

export default function PayPage() {
  const params = useParams();
  const paymentId = params?.id as string;
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading' | 'pending' | 'success' | 'expired' | 'failed'>('loading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [utrCopied, setUtrCopied] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [paidAt, setPaidAt] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Crypto / USDT flow
  const [method, setMethod] = useState<'upi' | 'usdt'>('upi');
  const [cryptoNetwork, setCryptoNetwork] = useState<string>('');
  const [cryptoData, setCryptoData] = useState<CryptoInit | null>(null);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoErr, setCryptoErr] = useState('');
  const [walletCopied, setWalletCopied] = useState(false);
  const [amtCopied, setAmtCopied] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const initCrypto = useCallback(async (network: string) => {
    setCryptoLoading(true); setCryptoErr(''); setCryptoData(null);
    try {
      const res = await fetch(`/api/v1/public/payment/${paymentId}/crypto/init`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network }),
      });
      const data = await res.json();
      if (data.success) { setCryptoData(data.data); setCryptoNetwork(network); }
      else setCryptoErr(data.error || 'Could not start USDT payment');
    } catch { setCryptoErr('Network error, please try again'); }
    finally { setCryptoLoading(false); }
  }, [paymentId]);

  const verifyCrypto = async () => {
    if (!cryptoData || !txHash.trim()) return;
    setVerifying(true); setVerifyMsg(null);
    try {
      const res = await fetch('/api/v1/public/crypto/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crypto_payment_id: cryptoData.crypto_payment_id, tx_hash: txHash.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data?.status === 'paid') {
        setVerifyMsg({ ok: true, text: 'Payment confirmed!' });
        setTimeout(() => fetchPayment(), 600);
      } else {
        setVerifyMsg({ ok: false, text: data.error || 'Verification failed' });
      }
    } catch { setVerifyMsg({ ok: false, text: 'Network error, please try again' }); }
    finally { setVerifying(false); }
  };

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
        const t = Math.max(0, Math.floor((exp - Date.now()) / 1000));
        setTimeLeft(t);
        setInitialTime(prev => prev === 0 ? t : prev);
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
            setPayment(data.data); setPageStatus('success'); setShowSuccess(true); setPaidAt(fmtDateTime()); clearInterval(poll);
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

  // Auto-redirect countdown after successful payment (only when redirect_url is present)
  useEffect(() => {
    if (pageStatus !== 'success' || !payment?.redirect_url) return;
    setRedirectCountdown(5);
    const t = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(t);
          window.location.href = `${payment.redirect_url}?order_id=${payment.order_id || ''}&status=paid`;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pageStatus, payment?.redirect_url]);

  const downloadQR = () => {
    if (!payment?.qr_code_base64) return;
    const a = document.createElement('a'); a.href = payment.qr_code_base64; a.download = `novapay-qr-${payment.order_id || payment.payment_id}.png`; a.click();
  };

  const handleUPI = (app: typeof UPI_APPS[0]) => {
    if (!payment?.upi_intent_link) return;
    const url = app.scheme ? payment.upi_intent_link.replace('upi://pay?', app.scheme) : payment.upi_intent_link;
    window.location.href = url;
  };

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard?.writeText(text); setter(true); setTimeout(() => setter(false), 2000);
  };

  const confettiRef = useRef<HTMLDivElement>(null);

  const playDigitalPop = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
      o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.22);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.45);
      ([[1760, 0.15], [2093, 0.22]] as [number, number][]).forEach(([freq, start]) => {
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine'; o2.frequency.value = freq;
        const t = ctx.currentTime + start;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.09, t + 0.015);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o2.start(t); o2.stop(t + 0.25);
      });
    } catch {}
  };

  const launchConfetti = () => {
    const container = confettiRef.current;
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#2563EB','#7C3AED','#059669','#F59E0B','#EC4899','#06B6D4'];
    const cx = container.offsetWidth / 2;
    for (let i = 0; i < 52; i++) {
      const el = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 5 + Math.random() * 7;
      const shape = Math.random() > 0.5 ? '50%' : '1px';
      el.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};border-radius:${shape};left:${cx}px;top:50px;pointer-events:none`;
      container.appendChild(el);
      const angle = (Math.random() * 340 - 170) * Math.PI / 180;
      const speed = 70 + Math.random() * 160;
      const dx = Math.sin(angle) * speed;
      const dy = -Math.abs(Math.cos(angle) * speed) - 40;
      el.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy + 180}px) rotate(${Math.random()*540}deg)`, opacity: 0 },
      ], { duration: 800 + Math.random()*600, easing: 'cubic-bezier(0,.9,.57,1)', delay: Math.random()*250, fill: 'forwards' });
    }
  };

  useEffect(() => {
    if (!showSuccess) return;
    setTimeout(() => { playDigitalPop(); launchConfetti(); }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuccess]);

  const downloadReceipt = () => {
    const lines: string[] = [];
    lines.push(`<html><head><title>Receipt – NovaPay</title>`);
    lines.push(`<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;max-width:420px;margin:40px auto;padding:24px;color:#0F172A}`);
    lines.push(`.h{font-size:22px;font-weight:800;margin-bottom:4px}.s{font-size:13px;color:#64748B;margin-bottom:24px}`);
    lines.push(`.r{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F1F5F9}`);
    lines.push(`.l{font-size:13px;color:#64748B}.v{font-size:13px;font-weight:600}.a{font-size:26px;font-weight:800;color:#16A34A}`);
    lines.push(`.f{margin-top:28px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #F1F5F9;padding-top:16px}</style></head><body>`);
    lines.push(`<div class="h">Payment Receipt</div><div class="s">NovaPay Payment Gateway</div>`);
    if (payment) {
      lines.push(`<div class="r"><span class="l">Amount Paid</span><span class="a">₹${fmtAmount(payment.amount)}</span></div>`);
      lines.push(`<div class="r"><span class="l">Paid To</span><span class="v">${merchantDisplay}</span></div>`);
      if (payment.customer_reference) lines.push(`<div class="r"><span class="l">Payment For</span><span class="v">${payment.customer_reference}</span></div>`);
      if (payment.order_id) lines.push(`<div class="r"><span class="l">Order ID</span><span class="v" style="font-family:monospace">${payment.order_id}</span></div>`);
      if (payment.utr) lines.push(`<div class="r"><span class="l">Transaction Ref</span><span class="v" style="font-family:monospace">${payment.utr}</span></div>`);
      if (paidAt) lines.push(`<div class="r"><span class="l">Payment Time</span><span class="v">${paidAt}</span></div>`);
    }
    lines.push(`<div class="f">System-generated receipt &bull; Powered by NovaPay</div></body></html>`);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(lines.join(''));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const isUrgent = timeLeft > 0 && timeLeft < 60;
  const brandColor = payment?.primary_color || '#2563EB';
  const merchantDisplay = payment?.business_name || payment?.merchant_name || 'NovaPay';
  const upiId = extractUPIId(payment?.upi_intent_link);
  const timerPct = initialTime > 0 ? Math.max(0, Math.min(100, (timeLeft / initialTime) * 100)) : 60;
  const fmtUsdt = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    return n.toFixed(6).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  };

  const CopyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #F0F4FF; min-height: 100vh; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        /* ── keyframes ── */
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spinA { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ripple { 0%{transform:scale(0.85);opacity:1} 100%{transform:scale(2.4);opacity:0} }
        @keyframes checkDraw { from{stroke-dashoffset:100} to{stroke-dashoffset:0} }
        @keyframes floatQR { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes scanLine { 0%{top:10px;opacity:.8} 100%{top:calc(100% - 10px);opacity:.8} }
        @keyframes barShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .pay-page { min-height: 100vh; background: #F0F4FF; padding: 20px 16px 56px; }
        .pay-inner { max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }

        /* ── Banner ── */
        .banner {
          background: linear-gradient(135deg, ${brandColor}dd 0%, ${brandColor} 100%);
          border-radius: 22px;
          padding: 20px 20px 18px;
          position: relative;
          overflow: hidden;
        }
        .banner::before {
          content: '';
          position: absolute;
          right: -30px; top: -30px;
          width: 130px; height: 130px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
        }
        .banner::after {
          content: '';
          position: absolute;
          right: 20px; bottom: -50px;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }
        .banner-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; position: relative; z-index: 1; }
        .banner-merchant { display: flex; align-items: center; gap: 10px; }
        .banner-logo { width: 36px; height: 36px; border-radius: 11px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; flex-shrink: 0; overflow: hidden; }
        .banner-logo img { width: 36px; height: 36px; object-fit: cover; }
        .banner-mname { font-size: 14px; font-weight: 700; color: #fff; line-height: 1.2; }
        .banner-msub { font-size: 10px; color: rgba(255,255,255,0.6); }
        .banner-secure { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.9); flex-shrink: 0; }

        .banner-amount-section { position: relative; z-index: 1; margin-bottom: 16px; }
        .banner-amt-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
        .banner-amt { font-size: 36px; font-weight: 800; color: #fff; letter-spacing: -1.5px; line-height: 1; }
        .banner-amt-dec { font-size: 20px; opacity: 0.6; }
        .banner-ref { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 5px; }

        .banner-timer { position: relative; z-index: 1; }
        .banner-bar-bg { height: 4px; border-radius: 3px; background: rgba(255,255,255,0.15); overflow: hidden; margin-bottom: 6px; }
        .banner-bar-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, rgba(255,255,255,0.7), rgba(255,255,255,0.9), rgba(255,255,255,0.7));
          background-size: 200% 100%;
          animation: barShimmer 2s linear infinite;
          transition: width 1s linear;
        }
        .banner-timer-row { display: flex; align-items: center; justify-content: space-between; }
        .banner-timer-label { font-size: 11px; color: rgba(255,255,255,0.55); }
        .banner-timer-val { font-size: 13px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
        .banner-timer-val.urgent { color: #FCA5A5; }

        /* ── White content card ── */
        .content-card { background: #fff; border-radius: 18px; box-shadow: 0 2px 20px rgba(37,99,235,0.08); overflow: hidden; }

        /* ── Tabs ── */
        .tabs-row { padding: 5px; display: flex; gap: 4px; background: #F8FAFC; }
        .tab-btn {
          flex: 1; padding: 9px; border-radius: 11px; border: none; cursor: pointer;
          font-family: inherit; font-size: 13px; font-weight: 700; transition: all 0.2s;
        }
        .tab-btn.active {
          background: #fff;
          color: #1D4ED8;
          border: 1.5px solid #BFDBFE;
          box-shadow: 0 1px 8px rgba(37,99,235,0.12);
        }
        .tab-btn.inactive { background: transparent; color: #94A3B8; border: 1.5px solid transparent; }

        /* ── UPI content ── */
        .upi-body { padding: 20px; }
        .qr-float-wrap { display: flex; justify-content: center; margin-bottom: 16px; animation: floatQR 3.5s ease-in-out infinite; }
        .qr-outer {
          position: relative;
          padding: 16px;
          background: #fff;
          border-radius: 22px;
          border: 1.5px solid #DBEAFE;
          box-shadow: 0 8px 40px rgba(37,99,235,0.14), 0 2px 8px rgba(0,0,0,0.06);
        }
        .qr-outer::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 23px;
          background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(79,70,229,0.08), transparent 60%);
          pointer-events: none;
          z-index: 0;
        }
        .qr-scan-line {
          position: absolute;
          left: 16px; right: 16px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3B82F6 30%, #6366F1 70%, transparent);
          top: 16px;
          animation: scanLine 2s ease-in-out infinite;
          border-radius: 2px;
          z-index: 3;
          opacity: 0.9;
        }
        .qr-shimmer { width: 200px; height: 200px; background: linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
        .qr-img { width: 200px; height: 200px; object-fit: contain; border-radius: 8px; display: block; }

        .upi-id-row { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500; margin-bottom: 8px; }
        .upi-id-mono { font-family: 'DM Mono', monospace; color: #1D4ED8; font-weight: 700; }
        .save-qr-btn { display: flex; align-items: center; gap: 5px; background: #F1F5F9; border: none; border-radius: 8px; padding: 6px 14px; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; margin: 0 auto 4px; }
        .save-qr-btn:hover { background: #E2E8F0; }

        .or-divider { display: flex; align-items: center; gap: 14px; margin: 16px 0; }
        .or-line { flex: 1; height: 1px; background: #F1F5F9; }
        .or-text { font-size: 11px; color: #94A3B8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }

        .upi-apps-label { font-size: 11px; font-weight: 700; color: #94A3B8; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
        .upi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .upi-app-btn {
          display: flex; flex-direction: column; align-items: center; gap: 7px;
          padding: 12px 4px 10px; border-radius: 14px; border: 1.5px solid #F1F5F9;
          background: #FAFAFA; cursor: pointer; transition: all 0.18s; font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .upi-app-btn:hover { border-color: #BFDBFE; background: #EFF6FF; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.1); }
        .upi-app-btn:active { transform: scale(0.95); }
        .upi-app-icon { width: 48px; height: 48px; border-radius: 12px; overflow: hidden; }
        .upi-app-name { font-size: 10.5px; color: #64748B; font-weight: 600; }

        /* ── USDT content (blue) ── */
        .usdt-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

        .net-btn {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 15px; border-radius: 12px; cursor: pointer;
          font-family: inherit; text-align: left; transition: all 0.15s;
        }
        .net-btn.net-active { border: 1.5px solid #2563EB; background: #EFF6FF; }
        .net-btn.net-inactive { border: 1.5px solid #E2E8F0; background: #FAFAFA; }
        .net-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .net-icon.net-active { background: #DBEAFE; }
        .net-icon.net-inactive { background: #F1F5F9; }
        .net-label { font-size: 13.5px; font-weight: 700; }
        .net-label.net-active { color: #1D4ED8; }
        .net-label.net-inactive { color: #0F172A; }
        .net-sub { font-size: 11px; color: #94A3B8; margin-top: 1px; }

        .send-box {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border: 1.5px solid #BFDBFE;
          border-radius: 16px;
          padding: 16px 18px;
        }
        .send-box-label { font-size: 10px; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        .send-box-amt { font-size: 30px; font-weight: 800; color: #1D4ED8; letter-spacing: -1px; line-height: 1; }
        .send-box-unit { font-size: 14px; font-weight: 700; color: #2563EB; margin-left: 6px; }
        .send-box-meta { font-size: 11.5px; color: #3B82F6; margin-top: 8px; display: flex; align-items: center; gap: 6px; }
        .copy-btn-blue {
          background: ${brandColor}; border: none; border-radius: 10px;
          padding: 9px 18px; color: #fff; font-size: 12.5px; font-weight: 700;
          cursor: pointer; font-family: inherit; flex-shrink: 0; transition: background 0.15s;
        }
        .copy-btn-blue:hover { background: ${brandColor}cc; }
        .copy-btn-blue.copied { background: #16A34A; }

        .qr-addr-row { display: flex; gap: 12px; align-items: center; }
        .qr-sm-box { padding: 8px; background: #fff; border-radius: 12px; border: 1.5px solid #E2E8F0; flex-shrink: 0; }
        .addr-block { flex: 1; }
        .addr-block-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .addr-block-val {
          font-size: 11px; font-family: monospace; color: #334155; word-break: break-all;
          line-height: 1.5; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 8px 10px; display: flex; align-items: flex-start; gap: 8px;
        }
        .addr-copy { background: #EFF6FF; border: none; border-radius: 7px; padding: 5px 10px; color: #2563EB; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; flex-shrink: 0; white-space: nowrap; margin-top: 2px; }
        .addr-copy.copied { background: #DCFCE7; color: #16A34A; }

        .after-divider { display: flex; align-items: center; gap: 10px; }
        .after-line { flex: 1; height: 1px; background: #F1F5F9; }
        .after-text { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; }

        .txid-input {
          width: 100%; padding: 12px 14px;
          border: 1.5px solid #E2E8F0; border-radius: 12px;
          font-size: 12px; font-family: monospace; color: #0F172A;
          outline: none; background: #FAFAFA; transition: border 0.15s;
        }
        .txid-input:focus { border-color: #2563EB; background: #fff; }
        .txid-input.has-value { border-color: #2563EB; }

        .verify-btn {
          width: 100%; padding: 14px; border-radius: 12px; border: none;
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: all 0.15s;
          background: linear-gradient(135deg, ${brandColor}dd, ${brandColor});
          color: #fff; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 16px ${brandColor}40;
        }
        .verify-btn:hover { opacity: 0.92; }
        .verify-btn:disabled { background: #93C5FD; cursor: not-allowed; box-shadow: none; }

        .warn-box {
          padding: 11px 13px; background: #FFFBEB; border: 1px solid #FDE68A;
          border-radius: 10px; display: flex; align-items: flex-start; gap: 8px;
          font-size: 11.5px; color: #92400E; line-height: 1.6;
        }

        /* ── Instructions card ── */
        .inst-card { background: #fff; border-radius: 18px; box-shadow: 0 2px 20px rgba(37,99,235,0.06); padding: 18px 20px; }
        .inst-label { font-size: 10.5px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
        .inst-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .inst-step { text-align: center; }
        .inst-num { width: 24px; height: 24px; border-radius: 50%; background: #2563EB; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
        .inst-icon-wrap { width: 44px; height: 44px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: #F8FAFC; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
        .inst-step-title { font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 3px; line-height: 1.3; }
        .inst-step-desc { font-size: 10.5px; color: #94A3B8; line-height: 1.4; }

        /* ── Copy btn generic ── */
        .pay-copy-btn { background: #F1F5F9; border: none; border-radius: 6px; padding: 4px 6px; color: #64748B; cursor: pointer; display: inline-flex; align-items: center; font-size: 11px; font-family: inherit; transition: all 0.15s; flex-shrink: 0; }
        .pay-copy-btn:hover { background: #E2E8F0; color: #0F172A; }
        .pay-copy-btn.copied { background: #DCFCE7; color: #16A34A; }

        /* ── Footer ── */
        .pay-footer { text-align: center; padding: 8px 0; display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }
        .pay-footer-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #94A3B8; font-weight: 500; }

        /* ── Overlay ── */
        .overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.7); backdrop-filter: blur(16px); animation: fadeIn 0.3s; }
        .overlay-box { background: #fff; border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 300px; width: 90%; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
        .ov-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .ov-title { font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px; }
        .ov-sub { font-size: 13px; color: #94A3B8; line-height: 1.6; }
        .ov-btn { margin-top: 24px; padding: 14px 32px; border-radius: 14px; background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; width: 100%; box-shadow: 0 4px 14px rgba(37,99,235,0.35); transition: opacity 0.15s, transform 0.15s; }
        .ov-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .ov-btn:active { transform: translateY(0); opacity: 1; }

        /* ── Success ── */
        @keyframes popUp { from{opacity:0;transform:scale(.9) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .suc-hero { text-align: center; padding: 32px 0 20px; animation: fadeIn 0.4s ease; }
        .suc-check-outer { position: relative; display: inline-block; margin-bottom: 18px; }
        .suc-ring { position: absolute; inset: -12px; border-radius: 50%; border: 2px solid rgba(22,163,74,.22); animation: ripple 2.2s ease-out infinite; }
        .suc-ring2 { animation-delay: .9s; border-color: rgba(22,163,74,.12); }
        .suc-check-circle { width: 96px; height: 96px; border-radius: 50%; background: #DCFCE7; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
        .suc-check-path { stroke: #16A34A; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke-dasharray: 100; stroke-dashoffset: 100; animation: checkDraw 0.6s ease forwards 0.25s; }
        .suc-title { font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 6px; letter-spacing: -.03em; }
        .suc-sub { font-size: 14px; color: #64748B; line-height: 1.6; }

        .pay-card { background: #fff; border-radius: 18px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05); }
        .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .sum-left { padding-right: 16px; border-right: 1px solid #F1F5F9; }
        .sum-right { padding-left: 16px; }
        .sum-lbl { font-size: 10.5px; color: #94A3B8; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; margin-bottom: 6px; }
        .sum-amount { font-size: 26px; font-weight: 800; color: #16A34A; letter-spacing: -.5px; line-height: 1; margin-bottom: 10px; }
        .sum-pill { display: inline-flex; align-items: center; gap: 5px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 20px; padding: 4px 11px; font-size: 11.5px; color: #059669; font-weight: 700; }
        .sum-txn { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
        .sum-txn-val { font-size: 12px; color: #0F172A; font-weight: 700; font-family: monospace; }
        .sum-copy { background: #F1F5F9; border: none; border-radius: 5px; padding: 3px 6px; cursor: pointer; color: #64748B; display: inline-flex; align-items: center; transition: all .12s; flex-shrink: 0; }
        .sum-copy:hover { background: #E2E8F0; color: #0F172A; }
        .sum-copy.ok { background: #DCFCE7; color: #16A34A; }
        .sum-time { font-size: 12.5px; color: #0F172A; font-weight: 600; }
        .det-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #F1F5F9; }
        .det-head-icon { width: 32px; height: 32px; border-radius: 9px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .det-head-title { font-size: 14px; font-weight: 700; color: #0F172A; }
        .det-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; gap: 12px; }
        .det-row + .det-row { border-top: 1px solid #F8FAFC; }
        .det-row-l { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .det-icon { width: 28px; height: 28px; border-radius: 7px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .det-lbl { font-size: 13px; color: #64748B; font-weight: 500; }
        .det-val { font-size: 13px; color: #0F172A; font-weight: 600; text-align: right; word-break: break-all; }
        .ty-card { background: linear-gradient(120deg, #EFF6FF 0%, #F0FDF4 100%); border: 1px solid #DBEAFE; border-radius: 16px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
        .ty-illo { width: 50px; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ty-title { font-size: 13.5px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .ty-sub { font-size: 12px; color: #475569; line-height: 1.5; }
        .dl-row { display: flex; align-items: center; justify-content: space-between; padding: 15px 18px; cursor: pointer; transition: background .12s; }
        .dl-row:hover { background: #F8FAFC; }
        .dl-row-l { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #2563EB; }
        .dl-icon { width: 32px; height: 32px; border-radius: 8px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .act-label { font-size: 13px; color: #64748B; text-align: center; margin-bottom: 12px; font-weight: 500; }
        .act-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .act-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 6px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; cursor: pointer; font-family: inherit; transition: all .15s; }
        .act-btn:hover { border-color: #BFDBFE; background: #EFF6FF; }
        .act-btn:active { transform: scale(.97); }
        .act-btn-icon { width: 36px; height: 36px; border-radius: 10px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; }
        .act-btn:hover .act-btn-icon { background: #DBEAFE; }
        .act-btn-lbl { font-size: 11.5px; font-weight: 600; color: #475569; text-align: center; line-height: 1.4; }
        .redirect-cta { width: 100%; padding: 14px; border-radius: 12px; background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity .15s; }
        .redirect-cta:hover { opacity: .9; }

        /* ── Sticky redirect bar ── */
        .sticky-redirect-bar {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(240,244,255,0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          z-index: 50;
          animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .sticky-redirect-inner { max-width: 480px; margin: 0 auto; }
        .sticky-redirect-btn {
          width: 100%;
          display: flex; align-items: center;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          border: none; border-radius: 18px;
          padding: 14px 18px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 6px 24px rgba(37,99,235,0.35);
          transition: opacity 0.15s, transform 0.15s;
          gap: 14px;
        }
        .sticky-redirect-btn:hover { opacity: 0.93; transform: translateY(-1px); }
        .sticky-redirect-btn:active { transform: translateY(0); opacity: 1; }
        .sticky-timer-circle {
          width: 46px; height: 46px; border-radius: 50%;
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 18px; font-weight: 800; color: #2563EB;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .sticky-btn-text { flex: 1; text-align: left; }
        .sticky-btn-title { font-size: 15px; font-weight: 800; color: #fff; line-height: 1.2; }
        .sticky-btn-sub { font-size: 11.5px; color: rgba(255,255,255,0.72); margin-top: 2px; font-weight: 500; }
        .sticky-chevron { flex-shrink: 0; opacity: 0.7; }

        .spin { animation: spinA 0.8s linear infinite; }
      `}</style>

      <div ref={confettiRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }} />

      {/* Expired overlay */}
      {pageStatus === 'expired' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-icon" style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="ov-title">Link Expired</div>
            <div className="ov-sub">This payment link has expired.<br />Please request a new one from the merchant.</div>
            <button className="ov-btn" onClick={() => goBack(payment?.redirect_url)}>← Go Back</button>
          </div>
        </div>
      )}

      {/* Failed overlay */}
      {pageStatus === 'failed' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-icon" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="ov-title">Payment Failed</div>
            <div className="ov-sub">Something went wrong.<br />Please try again or contact the merchant.</div>
            <button className="ov-btn" onClick={() => goBack(payment?.redirect_url)}>← Go Back</button>
          </div>
        </div>
      )}

      <div className="pay-page">
        <div className="pay-inner">

          {/* Loading */}
          {pageStatus === 'loading' && (
            <div className="pay-card" style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 18 }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', margin: '0 auto 14px' }} className="spin" />
              <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>Loading payment…</div>
            </div>
          )}

          {/* ── Success ── */}
          {pageStatus === 'success' && (
            <>
              <div className="suc-hero">
                <div className="suc-check-outer">
                  <div className="suc-ring" /><div className="suc-ring suc-ring2" />
                  <div className="suc-check-circle">
                    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
                      <path className="suc-check-path" d="M12 23 L20 32 L34 15" />
                    </svg>
                  </div>
                </div>
                <div className="suc-title">Payment Successful!</div>
                <div className="suc-sub">Your payment has been completed successfully.</div>
              </div>

              <div className="pay-card">
                <div className="sum-grid">
                  <div className="sum-left">
                    <div className="sum-lbl">Amount Paid</div>
                    <div className="sum-amount">₹{payment ? fmtAmount(payment.amount) : '—'}</div>
                    <div className="sum-pill">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Paid Successfully
                    </div>
                  </div>
                  <div className="sum-right">
                    <div className="sum-lbl">Transaction ID</div>
                    <div className="sum-txn">
                      <span className="sum-txn-val">{payment?.order_id || payment?.payment_id || '—'}</span>
                      {payment?.order_id && (
                        <button className={`sum-copy ${orderCopied ? 'ok' : ''}`} onClick={() => payment.order_id && copyText(payment.order_id, setOrderCopied)}>
                          {orderCopied
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                        </button>
                      )}
                    </div>
                    {paidAt && <>
                      <div className="sum-lbl" style={{ marginTop: 8 }}>Payment Time</div>
                      <div className="sum-time">{paidAt}</div>
                    </>}
                  </div>
                </div>
              </div>

              <div className="pay-card" style={{ padding: 0 }}>
                <div className="det-head">
                  <div className="det-head-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <span className="det-head-title">Payment Details</span>
                </div>
                {([
                  { svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Paid To', value: merchantDisplay },
                  ...(payment?.customer_reference ? [{ svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'Payment For', value: payment.customer_reference }] : []),
                  { svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, label: 'Amount', value: `₹${payment ? fmtAmount(payment.amount) : '—'}` },
                  ...(payment?.order_id ? [{ svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1" fill="#2563EB"/></svg>, label: 'Order ID', value: payment.order_id }] : []),
                  ...(payment?.utr ? [{ svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>, label: 'Transaction Ref', value: payment.utr }] : []),
                ] as {svg:React.ReactNode;label:string;value:string}[]).map((row, i) => (
                  <div key={i} className="det-row">
                    <div className="det-row-l">
                      <div className="det-icon">{row.svg}</div>
                      <span className="det-lbl">{row.label}</span>
                    </div>
                    <span className="det-val">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="ty-card">
                <div className="ty-illo">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <div>
                  <div className="ty-title">Thank you for choosing NovaPay!</div>
                  <div className="ty-sub">Your payment is secure and processed via NovaPay Payment Gateway.</div>
                </div>
              </div>

              <div className="pay-card" style={{ padding: 0 }}>
                <div className="dl-row" onClick={downloadReceipt}>
                  <div className="dl-row-l">
                    <div className="dl-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="12" x2="12" y2="18"/><polyline points="9 15 12 18 15 15"/>
                      </svg>
                    </div>
                    Download Receipt
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
              </div>

              {/* Extra bottom padding so sticky bar doesn't overlap footer when redirect_url present */}
              {payment?.redirect_url && <div style={{ height: 84 }} />}

              <div style={{ textAlign: 'center', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 12, color: '#94A3B8', fontWeight: 500, marginBottom: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  Secure <span style={{ color: '#E2E8F0' }}>•</span> Encrypted <span style={{ color: '#E2E8F0' }}>•</span> Trusted
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>
                  Need help? <a style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }} href="mailto:support@nova-pay.in">Contact Support</a>
                </div>
              </div>
            </>
          )}

          {/* ── Pending ── */}
          {pageStatus === 'pending' && (
            <>
              {/* Blue gradient banner */}
              <div className="banner">
                <div className="banner-top">
                  <div className="banner-merchant">
                    <div className="banner-logo">
                      {payment?.merchant_logo
                        ? <img src={payment.merchant_logo} alt={merchantDisplay} />
                        : <span>{merchantDisplay.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div className="banner-mname">{merchantDisplay}</div>
                      <div className="banner-msub">via NovaPay</div>
                    </div>
                  </div>
                  <div className="banner-secure">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Secure
                  </div>
                </div>

                <div className="banner-amount-section">
                  <div className="banner-amt-label">Amount Due</div>
                  <div className="banner-amt">
                    ₹{payment ? fmtAmount(payment.amount) : '—'}
                  </div>
                  {(payment?.customer_reference || payment?.order_id) && (
                    <div className="banner-ref">
                      {payment?.customer_reference || ''}{payment?.customer_reference && payment?.order_id ? ' · ' : ''}{payment?.order_id || ''}
                    </div>
                  )}
                </div>

                <div className="banner-timer">
                  <div className="banner-bar-bg">
                    <div className="banner-bar-fill" style={{ width: `${timerPct}%` }} />
                  </div>
                  <div className="banner-timer-row">
                    <span className="banner-timer-label">Time remaining</span>
                    <span className={`banner-timer-val ${isUrgent ? 'urgent' : ''}`}>
                      {timeLeft > 0 ? fmtTime(timeLeft) : '--:--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* White content card with tabs */}
              <div className="content-card">
                {/* Tabs — only shown if USDT is enabled */}
                {payment?.usdt_enabled && (payment?.crypto_networks?.length ?? 0) > 0 && (
                  <div className="tabs-row">
                    {(['upi', 'usdt'] as const).map(m => (
                      <button key={m} className={`tab-btn ${method === m ? 'active' : 'inactive'}`} onClick={() => setMethod(m)}>
                        {m === 'upi' ? 'UPI / INR' : 'USDT'}
                      </button>
                    ))}
                  </div>
                )}

                {/* UPI tab */}
                {method === 'upi' && (
                  <div className="upi-body">
                    {/* Floating QR */}
                    <div className="qr-float-wrap">
                      <div className="qr-outer">
                        <div className="qr-scan-line" />
                        {!qrLoaded && <div className="qr-shimmer" />}
                        {payment?.qr_code_base64 && (
                          <img src={payment.qr_code_base64} alt="UPI QR Code" className="qr-img"
                            style={{ opacity: qrLoaded ? 1 : 0, position: qrLoaded ? 'static' : 'absolute' }}
                            onLoad={() => setQrLoaded(true)} />
                        )}
                      </div>
                    </div>

                    {upiId && (
                      <div className="upi-id-row" style={{ cursor: 'default', userSelect: 'none' }}>
                        UPI ID: <span className="upi-id-mono">{upiId}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button className="save-qr-btn" onClick={downloadQR}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Save QR
                      </button>
                    </div>

                    <div className="or-divider">
                      <div className="or-line" /><span className="or-text">or pay using</span><div className="or-line" />
                    </div>

                    <div className="upi-apps-label">UPI Apps</div>
                    <div className="upi-grid">
                      {UPI_APPS.map(app => (
                        <button key={app.name} className="upi-app-btn" onClick={() => handleUPI(app)}>
                          <div className="upi-app-icon" dangerouslySetInnerHTML={{ __html: app.svg }} />
                          <span className="upi-app-name">{app.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* USDT tab */}
                {method === 'usdt' && (
                  <div className="usdt-body">
                    {/* Network selector */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Select network</div>
                    {payment?.crypto_networks?.map(n => {
                      const active = cryptoNetwork === n.id;
                      return (
                        <button key={n.id} className={`net-btn ${active ? 'net-active' : 'net-inactive'}`} onClick={() => initCrypto(n.id)} disabled={cryptoLoading}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className={`net-icon ${active ? 'net-active' : 'net-inactive'}`}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563EB' : '#94A3B8'} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                            </div>
                            <div>
                              <div className={`net-label ${active ? 'net-active' : 'net-inactive'}`}>{n.label}</div>
                              <div className="net-sub">Tap to load address & QR</div>
                            </div>
                          </div>
                          {cryptoLoading && active
                            ? <span style={{ width: 16, height: 16, border: '2px solid #BFDBFE', borderTopColor: '#2563EB', borderRadius: '50%', display: 'inline-block', animation: 'spinA .7s linear infinite', flexShrink: 0 }} />
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563EB' : '#CBD5E1'} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
                        </button>
                      );
                    })}

                    {cryptoErr && (
                      <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12.5, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>{cryptoErr}</div>
                    )}

                    {cryptoData && (
                      <>
                        {/* Send exactly — blue */}
                        <div className="send-box">
                          <div className="send-box-label">Send Exactly</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span className="send-box-amt" style={{ fontSize: fmtUsdt(cryptoData.expected_usdt).length > 10 ? 22 : 30 }}>{fmtUsdt(cryptoData.expected_usdt)}</span>
                              <span className="send-box-unit">USDT</span>
                            </div>
                            <button className={`copy-btn-blue ${amtCopied ? 'copied' : ''}`} onClick={() => copyText(cryptoData.expected_usdt, setAmtCopied)} style={{ flexShrink: 0 }}>
                              {amtCopied ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                          <div className="send-box-meta">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            ₹{fmtAmount(cryptoData.inr_amount)} · rate ₹{cryptoData.exchange_rate.toFixed(2)}/USDT · send exact incl. decimals
                          </div>
                        </div>

                        {/* QR + address */}
                        <div className="qr-addr-row">
                          {cryptoData.qr_code_base64 && (
                            <div className="qr-sm-box">
                              <img src={cryptoData.qr_code_base64} alt="Wallet QR" style={{ width: 72, height: 72, borderRadius: 6, display: 'block' }} />
                            </div>
                          )}
                          <div className="addr-block">
                            <div className="addr-block-label">Wallet Address</div>
                            <div className="addr-block-val">
                              <span style={{ flex: 1 }}>{cryptoData.merchant_wallet}</span>
                              <button className={`addr-copy ${walletCopied ? 'copied' : ''}`} onClick={() => copyText(cryptoData.merchant_wallet, setWalletCopied)}>
                                {walletCopied ? '✓' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* After sending divider */}
                        <div className="after-divider">
                          <div className="after-line" />
                          <span className="after-text">After Sending</span>
                          <div className="after-line" />
                        </div>

                        {/* TxID */}
                        <input
                          value={txHash}
                          onChange={e => setTxHash(e.target.value)}
                          placeholder="Paste transaction hash (TxID)"
                          className={`txid-input ${txHash ? 'has-value' : ''}`}
                        />

                        {/* Verify */}
                        <button className="verify-btn" onClick={verifyCrypto} disabled={verifying || !txHash.trim()}>
                          {verifying
                            ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spinA .7s linear infinite' }} /> Verifying…</>
                            : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Verify Payment</>}
                        </button>

                        {verifyMsg && (
                          <div style={{ padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                            background: verifyMsg.ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${verifyMsg.ok ? '#BBF7D0' : '#FECACA'}`,
                            color: verifyMsg.ok ? '#059669' : '#DC2626' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              {verifyMsg.ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                            </svg>
                            {verifyMsg.text}
                          </div>
                        )}

                        {/* Warning */}
                        <div className="warn-box">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <div>Send only <strong>USDT on {cryptoData.network_label}</strong> to this address. A different token or network will result in permanent loss of funds.</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  Need help? <a style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Contact Support</a>
                </span>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pay-footer">
            <span className="pay-footer-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              SSL Encrypted
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16A34A', fontWeight: 600 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              PCI DSS Compliant
            </span>
            <span className="pay-footer-item">Powered by <strong>NovaPay</strong></span>
          </div>

        </div>
      </div>

      {/* ── Sticky redirect bar — always visible above bottom edge ── */}
      {pageStatus === 'success' && payment?.redirect_url && (
        <div className="sticky-redirect-bar">
          <div className="sticky-redirect-inner">
            <button
              className="sticky-redirect-btn"
              onClick={() => { window.location.href = `${payment.redirect_url}?order_id=${payment.order_id || ''}&status=paid`; }}
            >
              <div className="sticky-timer-circle">{Math.max(0, redirectCountdown)}</div>
              <div className="sticky-btn-text">
                <div className="sticky-btn-title">Back to Merchant</div>
                <div className="sticky-btn-sub">You will be redirected shortly</div>
              </div>
              <svg className="sticky-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
