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
  merchant_business_name?: string;
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

// Same logo assets as the Connect Merchant page. Scheme rewrites the generic
// upi:// intent into the app-specific deep link; empty scheme opens the
// system chooser via the plain upi:// link.
const UPI_APPS = [
  {
    name: 'GPay',
    scheme: 'gpay://upi/pay?',
    svg: `<img src="/payment-logos/gpay.png" style="width:48px;height:48px;border-radius:11px;object-fit:contain;background:#fff" alt="Google Pay"/>`,
  },
  {
    name: 'PhonePe',
    scheme: 'phonepe://pay?',
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

export default function PayPage() {
  const params = useParams();
  const paymentId = params?.id as string;
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading' | 'pending' | 'success' | 'expired' | 'failed'>('loading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [utrCopied, setUtrCopied] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [paidAt, setPaidAt] = useState('');

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

  const downloadQR = () => {
    if (!payment?.qr_code_base64) return;
    const a = document.createElement('a'); a.href = payment.qr_code_base64; a.download = `novapay-qr-${payment.order_id || payment.payment_id}.png`; a.click();
  };

  const handleUPI = (app: typeof UPI_APPS[0]) => {
    if (!payment?.upi_intent_link) return;
    // upi://pay?pa=... -> gpay://upi/pay?pa=... (replace the full upi://pay? prefix,
    // otherwise the app link ends up with a duplicated "pay?" and fails to open)
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
  const merchantDisplay = payment?.merchant_business_name || payment?.merchant_name || 'NovaPay';
  const upiId = extractUPIId(payment?.upi_intent_link);

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
        html, body { background: #EEF2F7; min-height: 100vh; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        body { padding: 0; }

        .pay-page { min-height: 100vh; background: #EEF2F7; padding: 28px 16px 48px; }
        .pay-inner { max-width: 500px; margin: 0 auto; }

        /* Header */
        .pay-header { text-align: center; margin-bottom: 28px; }
        .pay-logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .pay-logo-icon { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%); display: flex; align-items: center; justify-content: center; }
        .pay-logo-n { font-size: 26px; font-weight: 900; color: #fff; font-family: 'DM Sans', sans-serif; letter-spacing: -1px; }
        .pay-logo-text { font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
        .pay-secure-line { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: #2563EB; font-weight: 500; }
        .pay-secure-dot { color: #CBD5E1; }

        /* Cards */
        .pay-card { background: #fff; border-radius: 18px; padding: 20px 22px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05); }

        /* Payment details */
        .pay-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .pay-detail-col { padding: 4px 0; }
        .pay-detail-col + .pay-detail-col { padding-left: 16px; border-left: 1px solid #F1F5F9; }
        .pay-detail-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
        .pay-detail-value { font-size: 15px; font-weight: 700; color: '#0F172A'; margin-bottom: 14px; }
        .pay-detail-value:last-child { margin-bottom: 0; }
        .pay-amount-value { font-size: 30px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .pay-copy-btn { background: #F1F5F9; border: none; border-radius: 6px; padding: 4px 6px; color: #64748B; cursor: pointer; display: inline-flex; align-items: center; font-size: 11px; font-family: inherit; transition: all 0.15s; flex-shrink: 0; }
        .pay-copy-btn:hover { background: #E2E8F0; color: #0F172A; }
        .pay-copy-btn.copied { background: #DCFCE7; color: #16A34A; }
        .pay-order-value { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; font-family: 'DM Mono', monospace; }
        .pay-merchant-desc { font-size: 13px; color: #64748B; margin-top: -10px; margin-bottom: 0; font-weight: 400; }

        /* Scan section */
        .scan-section { text-align: center; }
        .scan-title { font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 6px; }
        .scan-sub { font-size: 13px; color: #64748B; margin-bottom: 22px; line-height: 1.5; }
        .qr-container { display: inline-flex; background: #fff; border-radius: 16px; border: 1px solid #E2E8F0; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.07); position: relative; margin-bottom: 14px; }
        .qr-shimmer { width: 220px; height: 220px; background: linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .qr-img { width: 220px; height: 220px; object-fit: contain; border-radius: 8px; display: block; }
        .qr-actions { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 2px; }
        .upi-id-row { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: #475569; font-weight: 500; }
        .upi-id-mono { font-family: 'DM Mono', monospace; color: #0F172A; font-weight: 600; }

        /* OR divider */
        .or-divider { display: flex; align-items: center; gap: 14px; margin: 14px 0; }
        .or-line { flex: 1; height: 1px; background: #E2E8F0; }
        .or-text { font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

        /* UPI apps */
        .upi-title { font-size: 14px; font-weight: 700; color: '#0F172A'; text-align: center; margin-bottom: 16px; }
        .upi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        .upi-app-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px 8px; border-radius: 12px; border: 1.5px solid #F1F5F9; background: #fff; cursor: pointer; transition: all 0.18s; font-family: inherit; -webkit-tap-highlight-color: transparent; }
        .upi-app-btn:hover { border-color: #BFDBFE; background: #EFF6FF; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.1); }
        .upi-app-btn:active { transform: scale(0.95); }
        .upi-app-icon { width: 42px; height: 42px; border-radius: 11px; overflow: hidden; flex-shrink: 0; }
        .upi-app-icon svg { width: 42px; height: 42px; display: block; }
        .upi-app-name { font-size: 10px; color: #64748B; font-weight: 500; text-align: center; line-height: 1.2; }
        @media (max-width: 420px) { .upi-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; } .upi-app-btn { padding: 12px 4px 10px; } }

        /* Timer */
        .timer-row { display: flex; align-items: center; justify-content: space-between; }
        .timer-left-col { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; font-weight: 500; }
        .timer-clock { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #E2E8F0; display: flex; align-items: center; justify-content: center; background: #F8FAFC; }
        .timer-val { font-size: 22px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
        .timer-val.urgent { color: #DC2626; }
        .help-link { font-size: 12px; color: #94A3B8; text-align: right; }
        .help-link a { color: #2563EB; font-weight: 600; text-decoration: none; cursor: pointer; }
        .help-link a:hover { text-decoration: underline; }

        /* Instructions */
        .inst-label { font-size: 11px; font-weight: 700; color: '#94A3B8'; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 18px; }
        .inst-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .inst-step { text-align: center; padding: 4px; }
        .inst-num { width: 24px; height: 24px; border-radius: 50%; background: #2563EB; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
        .inst-icon-wrap { width: 44px; height: 44px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: #F8FAFC; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
        .inst-step-title { font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 3px; line-height: 1.3; }
        .inst-step-desc { font-size: 11px; color: #94A3B8; line-height: 1.4; }

        /* Footer */
        .pay-footer { text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }
        .pay-footer-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: '#94A3B8'; font-weight: 500; }

        /* Loading spinner */
        .spin { animation: spinA 0.8s linear infinite; }
        @keyframes spinA { to{transform:rotate(360deg)} }

        /* Success full-page layout */
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ripple { 0%{transform:scale(0.85);opacity:1} 100%{transform:scale(2.4);opacity:0} }
        @keyframes checkDraw { from{stroke-dashoffset:100} to{stroke-dashoffset:0} }
        .suc-hero { text-align: center; padding: 32px 0 20px; animation: fadeIn 0.4s ease; }
        .suc-check-outer { position: relative; display: inline-block; margin-bottom: 18px; }
        .suc-ring { position: absolute; inset: -12px; border-radius: 50%; border: 2px solid rgba(22,163,74,.22); animation: ripple 2.2s ease-out infinite; }
        .suc-ring2 { animation-delay: .9s; border-color: rgba(22,163,74,.12); }
        .suc-check-circle { width: 96px; height: 96px; border-radius: 50%; background: #DCFCE7; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
        .suc-check-path { stroke: #16A34A; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke-dasharray: 100; stroke-dashoffset: 100; animation: checkDraw 0.6s ease forwards 0.25s; }
        .suc-title { font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 6px; letter-spacing: -.03em; }
        .suc-sub { font-size: 14px; color: #64748B; line-height: 1.6; }

        /* Summary card */
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

        /* Payment Details card */
        .det-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #F1F5F9; }
        .det-head-icon { width: 32px; height: 32px; border-radius: 9px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .det-head-title { font-size: 14px; font-weight: 700; color: #0F172A; }
        .det-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; gap: 12px; }
        .det-row + .det-row { border-top: 1px solid #F8FAFC; }
        .det-row-l { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .det-icon { width: 28px; height: 28px; border-radius: 7px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .det-lbl { font-size: 13px; color: #64748B; font-weight: 500; }
        .det-val { font-size: 13px; color: #0F172A; font-weight: 600; text-align: right; word-break: break-all; }

        /* Thank you card */
        .ty-card { background: linear-gradient(120deg, #EFF6FF 0%, #F0FDF4 100%); border: 1px solid #DBEAFE; border-radius: 16px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .ty-illo { width: 50px; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ty-title { font-size: 13.5px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .ty-sub { font-size: 12px; color: #475569; line-height: 1.5; }

        /* Download receipt row */
        .dl-row { display: flex; align-items: center; justify-content: space-between; padding: 15px 18px; cursor: pointer; transition: background .12s; }
        .dl-row:hover { background: #F8FAFC; }
        .dl-row-l { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #2563EB; }
        .dl-icon { width: 32px; height: 32px; border-radius: 8px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* Action buttons */
        .act-label { font-size: 13px; color: #64748B; text-align: center; margin-bottom: 12px; font-weight: 500; }
        .act-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 24px; }
        .act-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 6px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; cursor: pointer; font-family: inherit; transition: all .15s; text-decoration: none; -webkit-tap-highlight-color: transparent; }
        .act-btn:hover { border-color: #BFDBFE; background: #EFF6FF; }
        .act-btn:active { transform: scale(.97); }
        .act-btn-icon { width: 36px; height: 36px; border-radius: 10px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; transition: background .15s; }
        .act-btn:hover .act-btn-icon { background: #DBEAFE; }
        .act-btn-lbl { font-size: 11.5px; font-weight: 600; color: #475569; text-align: center; line-height: 1.4; }

        /* Redirect CTA */
        .redirect-cta { width: 100%; padding: 14px; border-radius: 12px; background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; margin-bottom: 14px; transition: opacity .15s; }
        .redirect-cta:hover { opacity: .9; }

        /* Expired/Failed overlay */
        .overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.7); backdrop-filter: blur(16px); animation: fadeIn 0.3s; }
        .overlay-box { background: #fff; border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 300px; width: 90%; animation: popUp 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
        .ov-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .ov-title { font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px; }
        .ov-sub { font-size: 13px; color: '#94A3B8'; line-height: 1.6; }
        .ov-btn { margin-top: 20px; padding: 12px 24px; border-radius: 12px; background: #F1F5F9; border: none; color: '#0F172A'; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .ov-btn:hover { background: #E2E8F0; }

      `}</style>

      {/* confetti layer – fires when showSuccess is true (live detection) */}
      <div ref={confettiRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }} />

      {/* ─── Expired overlay ─── */}
      {pageStatus === 'expired' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-icon" style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="ov-title">Link Expired</div>
            <div className="ov-sub" style={{ color: '#94A3B8' }}>This payment link has expired.<br />Please request a new one.</div>
            <button className="ov-btn" onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      )}

      {/* ─── Failed overlay ─── */}
      {pageStatus === 'failed' && !showSuccess && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="ov-icon" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="ov-title">Payment Failed</div>
            <div className="ov-sub" style={{ color: '#94A3B8' }}>Something went wrong.<br />Please try again.</div>
            <button className="ov-btn" onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      )}

      {/* ─── Main page ─── */}
      <div className="pay-page">
        <div className="pay-inner">

          {/* Header */}
          <div className="pay-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
              <div className="pay-logo-icon">
                <span className="pay-logo-n">N</span>
              </div>
              <span className="pay-logo-text">NovaPay</span>
            </div>
            <div className="pay-secure-line">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Secure Payment
              <span className="pay-secure-dot">•</span>
              Powered by <strong>NovaPay</strong>
            </div>
          </div>

          {/* Loading */}
          {pageStatus === 'loading' && (
            <div className="pay-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', margin: '0 auto 14px' }} className="spin" />
              <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>Loading payment…</div>
            </div>
          )}

          {/* ─── Success full-page ─── */}
          {pageStatus === 'success' && (
            <>
              {/* Hero */}
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

              {/* Summary card */}
              <div className="pay-card" style={{ marginBottom: 14 }}>
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

              {/* Payment Details card */}
              <div className="pay-card" style={{ padding: 0, marginBottom: 14 }}>
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

              {/* Thank you card */}
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

              {/* Download Receipt */}
              <div className="pay-card" style={{ padding: 0, marginBottom: 14 }}>
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

              {/* Merchant redirect CTA */}
              {payment?.redirect_url && (
                <button className="redirect-cta" onClick={() => window.location.href = `${payment.redirect_url}?order_id=${payment.order_id || ''}&status=paid`}>
                  Back to Merchant →
                </button>
              )}

              {/* Action buttons */}
              <div className="act-label">What would you like to do next?</div>
              <div className="act-grid">
                {([
                  { icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, label: 'Make Another\nPayment', href: '/' },
                  { icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label: 'Go to\nDashboard', href: '/dashboard' },
                  { icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Back to\nHome', href: '/' },
                ] as {icon:React.ReactNode;label:string;href:string}[]).map((btn, i) => (
                  <button key={i} className="act-btn" onClick={() => window.location.href = btn.href}>
                    <div className="act-btn-icon">{btn.icon}</div>
                    <span className="act-btn-lbl">{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* Footer */}
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

          {/* Main pending UI */}
          {pageStatus === 'pending' && (
            <>
              {/* Payment details card */}
              <div className="pay-card">
                <div className="pay-details-grid">
                  <div className="pay-detail-col">
                    <div className="pay-detail-label">Payment to</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: payment?.customer_reference ? 12 : 0 }}>{merchantDisplay}</div>
                    {payment?.customer_reference && (
                      <>
                        <div className="pay-detail-label" style={{ marginTop: 0 }}>Payment for</div>
                        <div style={{ fontSize: 13, color: '#64748B' }}>{payment.customer_reference}</div>
                      </>
                    )}
                  </div>
                  <div className="pay-detail-col">
                    <div className="pay-detail-label">Amount</div>
                    <div className="pay-amount-value">
                      ₹{payment ? fmtAmount(payment.amount) : '—'}
                      <button className="pay-copy-btn" onClick={() => payment && copyText((payment.amount / 100).toFixed(2), setUpiCopied)} title="Copy amount">
                        <CopyIcon />
                      </button>
                    </div>
                    {payment?.order_id && (
                      <>
                        <div className="pay-detail-label">Order ID</div>
                        <div className="pay-order-value">
                          <span style={{ fontSize: 12, color: '#475569' }}>{payment.order_id}</span>
                          <button className="pay-copy-btn" onClick={() => payment.order_id && copyText(payment.order_id, setOrderCopied)} title="Copy order ID">
                            {orderCopied ? <span style={{ fontSize: 11 }}>✓</span> : <CopyIcon />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment method toggle (shown only if merchant enabled USDT) */}
              {payment?.usdt_enabled && (payment?.crypto_networks?.length ?? 0) > 0 && (
                <div className="pay-card" style={{ padding: 6, display: 'flex', gap: 6 }}>
                  {([['upi', 'UPI / INR'], ['usdt', 'USDT']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setMethod(m)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 13.5, fontWeight: 700, transition: 'all .15s',
                        background: method === m ? (m === 'usdt' ? '#26A17B' : '#2563EB') : 'transparent',
                        color: method === m ? '#fff' : '#64748B' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── USDT PANEL ── */}
              {method === 'usdt' && (
                <div className="pay-card">
                  {/* Network selector */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Select network</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: cryptoData ? 18 : 0 }}>
                    {payment?.crypto_networks?.map(n => (
                      <button key={n.id} onClick={() => initCrypto(n.id)} disabled={cryptoLoading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 11,
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          border: `1.5px solid ${cryptoNetwork === n.id ? '#26A17B' : '#E2E8F0'}`,
                          background: cryptoNetwork === n.id ? '#F0FDF9' : '#fff' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{n.label}</span>
                        {cryptoLoading && cryptoNetwork === n.id
                          ? <span style={{ width: 14, height: 14, border: '2px solid #A7F3D0', borderTopColor: '#26A17B', borderRadius: '50%', display: 'inline-block', animation: 'pp-spin .7s linear infinite' }} />
                          : <span style={{ fontSize: 18, color: '#26A17B' }}>›</span>}
                      </button>
                    ))}
                  </div>

                  {cryptoErr && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 9, fontSize: 12.5, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>{cryptoErr}</div>}

                  {cryptoData && (
                    <>
                      {/* Amount to send */}
                      <div style={{ background: '#F0FDF9', border: '1px solid #A7F3D0', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Send exactly</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 26, fontWeight: 800, color: '#065F46', letterSpacing: '-.5px' }}>{cryptoData.expected_usdt} <span style={{ fontSize: 15 }}>USDT</span></div>
                          <button onClick={() => copyText(cryptoData.expected_usdt, setAmtCopied)}
                            style={{ background: '#26A17B', border: 'none', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {amtCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#047857', marginTop: 6 }}>
                          ₹{fmtAmount(cryptoData.inr_amount)} · rate ₹{cryptoData.exchange_rate.toFixed(2)}/USDT · send the exact amount incl. decimals
                        </div>
                      </div>

                      {/* Wallet QR */}
                      <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Scan or copy the {cryptoData.network_label} address</div>
                        {cryptoData.qr_code_base64 && <img src={cryptoData.qr_code_base64} alt="Wallet QR" style={{ width: 168, height: 168, borderRadius: 12, border: '1px solid #E2E8F0' }} />}
                      </div>

                      {/* Wallet address */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
                        <span style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: '#334155', wordBreak: 'break-all' }}>{cryptoData.merchant_wallet}</span>
                        <button onClick={() => copyText(cryptoData.merchant_wallet, setWalletCopied)}
                          style={{ background: '#26A17B', border: 'none', borderRadius: 7, padding: '6px 11px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                          {walletCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      {/* Paste TxID + verify */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>After sending, paste your transaction hash</div>
                      <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Transaction hash (TxID)"
                        style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 12.5, fontFamily: 'monospace', color: '#0F172A', outline: 'none', marginBottom: 10 }} />
                      <button onClick={verifyCrypto} disabled={verifying || !txHash.trim()}
                        style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                          cursor: verifying || !txHash.trim() ? 'not-allowed' : 'pointer',
                          background: verifying || !txHash.trim() ? '#94D3BF' : '#26A17B', color: '#fff' }}>
                        {verifying ? 'Verifying…' : 'Verify Payment'}
                      </button>

                      {verifyMsg && (
                        <div style={{ marginTop: 12, padding: '11px 14px', borderRadius: 9, fontSize: 13, fontWeight: 500,
                          background: verifyMsg.ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${verifyMsg.ok ? '#BBF7D0' : '#FECACA'}`,
                          color: verifyMsg.ok ? '#059669' : '#DC2626' }}>
                          {verifyMsg.text}
                        </div>
                      )}

                      <div style={{ marginTop: 12, fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
                        Send only <strong>USDT on {cryptoData.network_label}</strong> to this address. Sending a different token or network will result in loss of funds.
                      </div>
                    </>
                  )}
                </div>
              )}

              {method === 'upi' && (<>
              {/* Scan & Pay card */}
              <div className="pay-card scan-section">
                <div className="scan-title">Scan &amp; Pay</div>
                <div className="scan-sub">Scan the QR code using any UPI app to make the payment</div>

                <div className="qr-container">
                  {!qrLoaded && <div className="qr-shimmer" />}
                  {payment?.qr_code_base64 && (
                    <img src={payment.qr_code_base64} alt="UPI QR Code" className="qr-img"
                      style={{ opacity: qrLoaded ? 1 : 0, position: qrLoaded ? 'static' : 'absolute' }}
                      onLoad={() => setQrLoaded(true)} />
                  )}
                </div>

                {upiId && (
                  <div className="upi-id-row">
                    UPI ID: <span className="upi-id-mono">{upiId}</span>
                    <button className={`pay-copy-btn ${upiCopied ? 'copied' : ''}`} onClick={() => upiId && copyText(upiId, setUpiCopied)} title="Copy UPI ID">
                      {upiCopied ? <span style={{ fontSize: 11 }}>✓</span> : <CopyIcon />}
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                  <button onClick={downloadQR} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Save QR
                  </button>
                </div>
              </div>

              {/* OR divider */}
              <div className="or-divider">
                <div className="or-line" /><span className="or-text">or pay using</span><div className="or-line" />
              </div>

              {/* UPI apps card */}
              <div className="pay-card">
                <div className="upi-title" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', textAlign: 'center', marginBottom: 16 }}>Pay using UPI Apps</div>
                <div className="upi-grid">
                  {UPI_APPS.map(app => (
                    <button key={app.name} className="upi-app-btn" onClick={() => handleUPI(app)}>
                      <div className="upi-app-icon" dangerouslySetInnerHTML={{ __html: app.svg }} />
                      <span className="upi-app-name">{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              </>)}

              {/* Timer card */}
              <div className="pay-card" style={{ padding: '14px 20px' }}>
                <div className="timer-row">
                  <div className="timer-left-col">
                    <div className="timer-clock">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <span>This QR code will expire in</span>
                  </div>
                  <span className={`timer-val ${isUrgent ? 'urgent' : ''}`}>{timeLeft > 0 ? fmtTime(timeLeft) : '--:--'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 14, paddingRight: 4 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Need help? <a style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Contact Support</a></span>
              </div>

              {/* Payment instructions card (UPI only) */}
              {method === 'upi' && (
              <div className="pay-card">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 18 }}>Payment Instructions</div>
                <div className="inst-grid">
                  {[
                    {
                      title: 'Open any UPI app',
                      desc: 'Launch your preferred UPI application',
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
                    },
                    {
                      title: 'Scan QR code',
                      desc: 'Scan this QR code or enter UPI ID',
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/><rect x="7" y="13" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/></svg>,
                    },
                    {
                      title: 'Enter amount & pay',
                      desc: 'Verify details and complete the payment',
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
                    },
                  ].map((step, i) => (
                    <div key={i} className="inst-step">
                      <div className="inst-num">{i + 1}</div>
                      <div className="inst-icon-wrap">{step.icon}</div>
                      <div className="inst-step-title">{step.title}</div>
                      <div className="inst-step-desc">{step.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="pay-footer">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94A3B8' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Your payment is secured with industry-standard encryption
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16A34A', fontWeight: 600 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              PCI DSS Compliant
            </span>
          </div>

        </div>
      </div>
    </>
  );
}
