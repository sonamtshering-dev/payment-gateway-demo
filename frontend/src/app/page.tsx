'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/*
  NovaPay – Root page.tsx
  - If user is already logged in → redirect to /dashboard
  - Otherwise → show the public landing page
  Token key updated from 'upay_access_token' → 'novapay_access_token'
  (update this to match whatever key your auth-context uses)
*/

// ─── Auth redirect wrapper ────────────────────────────────────────────────────
function useAuthRedirect() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Support both old key and new key during transition
    const token =
      localStorage.getItem('novapay_access_token') ||
      localStorage.getItem('upay_access_token') ||
      localStorage.getItem('access_token');

    if (token) {
      router.replace('/dashboard');
    } else {
      setChecked(true);
    }
  }, [router]);

  return checked;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#07090f; --bg2:#0b0f1a; --bg3:#0f1520;
    --surface:#111827; --surface2:#16202e;
    --border:rgba(255,255,255,0.06); --border2:rgba(255,255,255,0.11);
    --accent:#00e5b0; --accent2:#0ea5e9;
    --text:#eef2ff; --muted:#64748b; --muted2:#8b9ab5;
    --font-d:'Syne',sans-serif; --font-b:'DM Sans',sans-serif;
    --r:14px; --rs:8px;
  }
  html { scroll-behavior: smooth; }
  body { background:var(--bg); color:var(--text); font-family:var(--font-b); font-size:16px; line-height:1.6; overflow-x:hidden; -webkit-font-smoothing:antialiased; }

  .np-nav { position:fixed; top:0; left:0; right:0; z-index:200; height:66px; display:flex; align-items:center; justify-content:space-between; padding:0 6vw; background:rgba(7,9,15,0.85); backdrop-filter:blur(24px); border-bottom:1px solid var(--border); }
  .np-logo { display:flex; align-items:center; gap:10px; font-family:var(--font-d); font-size:21px; font-weight:800; color:var(--text); text-decoration:none; letter-spacing:-0.4px; }
  .np-logo-mark { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,var(--accent),var(--accent2)); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:#07090f; }
  .np-nav-links { display:flex; align-items:center; gap:36px; }
  .np-nav-links a { font-size:14px; color:var(--muted2); text-decoration:none; transition:color .18s; }
  .np-nav-links a:hover { color:var(--text); }
  .np-nav-right { display:flex; align-items:center; gap:10px; }
  .btn-ghost { background:none; border:1px solid var(--border2); color:var(--muted2); font-family:var(--font-b); font-size:13px; font-weight:500; padding:8px 18px; border-radius:var(--rs); cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; transition:all .18s; }
  .btn-ghost:hover { border-color:var(--accent); color:var(--accent); }
  .btn-primary { background:linear-gradient(135deg,var(--accent),var(--accent2)); border:none; color:#07090f; font-family:var(--font-b); font-size:13px; font-weight:700; padding:9px 20px; border-radius:var(--rs); cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; transition:all .18s; }
  .btn-primary:hover { opacity:.88; transform:translateY(-1px); }
  .btn-lg { font-size:15px !important; padding:13px 30px !important; border-radius:var(--r) !important; }

  .np-hero { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:140px 6vw 60px; position:relative; overflow:hidden; }
  .hero-grid-bg { position:absolute; inset:0; opacity:.032; background-image:linear-gradient(var(--accent) 1px,transparent 1px),linear-gradient(90deg,var(--accent) 1px,transparent 1px); background-size:56px 56px; animation:gridScroll 24s linear infinite; }
  @keyframes gridScroll { to { transform:translateY(56px); } }
  .hero-orb { position:absolute; top:10%; left:50%; transform:translateX(-50%); width:700px; height:480px; background:radial-gradient(ellipse at center,rgba(0,229,176,.10) 0%,rgba(14,165,233,.05) 40%,transparent 70%); pointer-events:none; }
  .hero-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(0,229,176,.07); border:1px solid rgba(0,229,176,.18); color:var(--accent); font-size:11px; font-weight:600; letter-spacing:.10em; text-transform:uppercase; padding:6px 16px; border-radius:100px; margin-bottom:30px; animation:fadeUp .6s ease both; }
  .hero-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); animation:blink 2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .np-hero h1 { font-family:var(--font-d); font-size:clamp(42px,7.5vw,88px); font-weight:800; line-height:1.02; letter-spacing:-3px; margin-bottom:26px; animation:fadeUp .7s .1s ease both; }
  .grad-text { background:linear-gradient(135deg,var(--accent) 20%,var(--accent2) 80%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .np-hero-sub { font-size:clamp(15px,2vw,19px); color:var(--muted2); font-weight:300; max-width:560px; margin:0 auto 44px; line-height:1.75; animation:fadeUp .7s .2s ease both; }
  .hero-actions { display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; animation:fadeUp .7s .3s ease both; }

  .stats-wrap { padding:0 6vw 80px; animation:fadeUp .7s .45s ease both; }
  .stats-strip { display:grid; grid-template-columns:repeat(4,1fr); background:var(--surface); border:1px solid var(--border2); border-radius:20px; overflow:hidden; }
  .stat-card { padding:28px 24px; border-right:1px solid var(--border); position:relative; overflow:hidden; transition:background .25s; }
  .stat-card:last-child { border-right:none; }
  .stat-card:hover { background:var(--surface2); }
  .stat-card::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--accent),var(--accent2)); transform:scaleX(0); transform-origin:left; transition:transform .35s; }
  .stat-card:hover::after { transform:scaleX(1); }
  .stat-icon-box { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:17px; margin-bottom:14px; }
  .si-teal   { background:rgba(0,229,176,.10); }
  .si-blue   { background:rgba(14,165,233,.10); }
  .si-purple { background:rgba(139,92,246,.10); }
  .si-gold   { background:rgba(245,158,11,.10); }
  .stat-num { font-family:var(--font-d); font-size:clamp(26px,2.8vw,40px); font-weight:800; letter-spacing:-1.5px; line-height:1; margin-bottom:6px; }
  .stat-num .hi { color:var(--accent); }
  .stat-desc { font-size:13px; color:var(--muted2); line-height:1.5; margin-bottom:10px; }
  .live-badge { display:inline-flex; align-items:center; gap:5px; background:rgba(0,229,176,.07); border:1px solid rgba(0,229,176,.15); color:var(--accent); font-size:10px; font-weight:600; padding:3px 9px; border-radius:100px; letter-spacing:.05em; }
  .live-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); animation:blink 2s infinite; }
  @media (max-width:780px) {
    .stats-strip { grid-template-columns:repeat(2,1fr); }
    .stat-card { border-right:none; border-bottom:1px solid var(--border); }
    .stat-card:nth-child(odd) { border-right:1px solid var(--border); }
    .stat-card:nth-last-child(-n+2) { border-bottom:none; }
  }
  @media (max-width:420px) {
    .stats-strip { grid-template-columns:1fr; }
    .stat-card { border-right:none !important; border-bottom:1px solid var(--border) !important; }
    .stat-card:last-child { border-bottom:none !important; }
  }

  .np-section { padding:88px 6vw; }
  .np-section.alt { background:var(--bg2); }
  .section-eyebrow { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:14px; }
  .section-h2 { font-family:var(--font-d); font-size:clamp(28px,4vw,50px); font-weight:800; letter-spacing:-1.5px; line-height:1.08; margin-bottom:18px; }
  .section-sub { font-size:17px; color:var(--muted2); font-weight:300; max-width:500px; line-height:1.75; }

  .uc-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; margin-top:52px; }
  .uc-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:30px 26px; transition:border-color .25s,transform .25s; }
  .uc-card:hover { border-color:rgba(0,229,176,.22); transform:translateY(-5px); }
  .uc-icon-wrap { width:46px; height:46px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:21px; margin-bottom:18px; }
  .ic-teal{background:rgba(0,229,176,.10);} .ic-blue{background:rgba(14,165,233,.10);} .ic-purple{background:rgba(139,92,246,.10);} .ic-gold{background:rgba(245,158,11,.10);}
  .uc-title { font-family:var(--font-d); font-size:17px; font-weight:700; margin-bottom:10px; }
  .uc-desc { font-size:13px; color:var(--muted2); line-height:1.7; margin-bottom:20px; }
  .feature-list { list-style:none; display:flex; flex-direction:column; gap:7px; }
  .feature-list li { display:flex; align-items:flex-start; gap:9px; font-size:13px; color:var(--muted2); }
  .feat-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); margin-top:7px; flex-shrink:0; }

  .how-inner { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
  .how-steps { margin-top:40px; }
  .hw-step { display:flex; gap:18px; padding:22px 0; border-bottom:1px solid var(--border); cursor:pointer; transition:all .2s; }
  .hw-step:last-child { border-bottom:none; }
  .hw-num { width:34px; height:34px; border-radius:9px; flex-shrink:0; background:var(--surface2); border:1px solid var(--border2); display:flex; align-items:center; justify-content:center; font-family:var(--font-d); font-size:13px; font-weight:700; color:var(--muted); transition:all .25s; }
  .hw-step.active .hw-num { background:linear-gradient(135deg,var(--accent),var(--accent2)); border-color:transparent; color:#07090f; }
  .hw-step-title { font-family:var(--font-d); font-size:15px; font-weight:700; color:var(--muted2); margin-bottom:5px; transition:color .2s; }
  .hw-step.active .hw-step-title { color:var(--text); }
  .hw-step-desc { font-size:13px; color:var(--muted); line-height:1.65; }
  .how-visual { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:40px 32px; text-align:center; position:relative; }
  .phone-frame { width:200px; height:360px; border-radius:26px; background:var(--bg3); border:2px solid var(--border2); margin:0 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; position:relative; }
  .phone-amount-lbl { font-size:11px; color:var(--muted); }
  .phone-amount-val { font-family:var(--font-d); font-size:30px; font-weight:800; color:var(--text); letter-spacing:-1px; }
  .qr-box { width:130px; height:130px; background:#fff; border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .qr-pattern { width:110px; height:110px; display:grid; grid-template-columns:repeat(10,1fr); gap:1px; }
  .qr-c{border-radius:1px;} .q1{background:#111;} .q0{background:#fff;}
  .phone-pay-btn { background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#07090f; font-size:12px; font-weight:700; padding:9px 0; border-radius:9px; width:75%; text-align:center; }
  .paid-badge { position:absolute; top:-12px; right:-12px; background:var(--accent); color:#07090f; font-size:10px; font-weight:700; padding:5px 11px; border-radius:7px; animation:floatBadge 3s ease-in-out infinite; }
  @keyframes floatBadge { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-7px) rotate(-3deg)} }
  .notif-pop { position:absolute; bottom:-14px; left:-14px; background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:10px 14px; display:flex; align-items:center; gap:10px; animation:floatBadge 3s 1.5s ease-in-out infinite; }
  .notif-icon { width:28px; height:28px; border-radius:7px; background:rgba(0,229,176,.12); display:flex; align-items:center; justify-content:center; font-size:13px; }
  .notif-title { font-size:11px; font-weight:600; color:var(--text); }
  .notif-sub { font-size:10px; color:var(--muted); margin-top:1px; }

  .int-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-top:52px; }
  .int-card { background:var(--surface); border:1px solid var(--border); border-radius:11px; padding:20px 18px; display:flex; align-items:center; gap:14px; transition:all .2s; }
  .int-card:hover { border-color:var(--border2); background:var(--surface2); }
  .int-logo-box { width:42px; height:42px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:19px; }
  .int-name { font-size:14px; font-weight:500; color:var(--text); }
  .int-type { font-size:11px; color:var(--muted); margin-top:2px; }

  .plans-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:18px; margin-top:52px; }
  .plan-card { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:34px 26px; position:relative; overflow:hidden; transition:transform .25s; }
  .plan-card:hover { transform:translateY(-5px); }
  .plan-card.featured { border-color:rgba(0,229,176,.30); }
  .plan-card.featured::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,229,176,.04),rgba(14,165,233,.03)); pointer-events:none; }
  .plan-popular { position:absolute; top:18px; right:18px; background:var(--accent); color:#07090f; font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; padding:4px 10px; border-radius:5px; }
  .plan-name { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--muted2); margin-bottom:16px; }
  .plan-price { font-family:var(--font-d); font-size:42px; font-weight:800; letter-spacing:-2px; line-height:1; margin-bottom:6px; }
  .plan-price-sub { font-size:14px; color:var(--muted); margin-bottom:20px; }
  .plan-divider { border:none; border-top:1px solid var(--border); margin:20px 0; }
  .plan-feat-list { list-style:none; display:flex; flex-direction:column; gap:10px; }
  .plan-feat-list li { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--muted2); }
  .pf-check { color:var(--accent); font-weight:700; flex-shrink:0; }
  .plan-cta { display:block; width:100%; text-align:center; margin-top:28px; padding:12px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; text-decoration:none; border:none; font-family:var(--font-b); }
  .plan-cta.outline { background:none; border:1px solid var(--border2); color:var(--muted2); }
  .plan-cta.outline:hover { border-color:var(--accent); color:var(--accent); }
  .plan-cta.solid { background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#07090f; }
  .plan-cta.solid:hover { opacity:.88; }
  .plans-skeleton { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:34px 26px; animation:shimmer 1.5s infinite; }
  @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
  .skel-line { background:var(--surface2); border-radius:6px; margin-bottom:12px; }

  .cta-banner { padding:96px 6vw; text-align:center; background:var(--bg); position:relative; overflow:hidden; }
  .cta-orb { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:600px; height:400px; border-radius:50%; background:radial-gradient(ellipse,rgba(0,229,176,.07) 0%,transparent 70%); pointer-events:none; }
  .cta-banner h2 { font-family:var(--font-d); font-size:clamp(30px,5vw,62px); font-weight:800; letter-spacing:-2px; margin-bottom:18px; position:relative; }
  .cta-banner p { font-size:18px; color:var(--muted2); font-weight:300; margin-bottom:40px; position:relative; }
  .cta-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; position:relative; }

  .np-footer { padding:40px 6vw; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:18px; }
  .footer-links { display:flex; gap:22px; flex-wrap:wrap; }
  .footer-links a { font-size:13px; color:var(--muted); text-decoration:none; transition:color .18s; }
  .footer-links a:hover { color:var(--text); }
  .footer-copy { font-size:13px; color:var(--muted); }

  @media (max-width:900px) { .np-nav-links { display:none; } .how-inner { grid-template-columns:1fr; } .how-visual { display:none; } }
  @media (max-width:600px) { .np-hero { padding:120px 4vw 50px; } .np-section { padding:64px 4vw; } .stats-wrap { padding:0 4vw 64px; } .cta-banner { padding:64px 4vw; } .np-footer { padding:32px 4vw; } .np-nav { padding:0 4vw; } }
`;

const USE_CASES = [
  { icon:'🏪', cls:'ic-teal',   title:'In-Store POS',         desc:'Accept payments at physical stores with dynamic QR codes on POS terminals.', features:['Dynamic QR per transaction','Instant payment confirmation','Real-time updates','Multi-UPI support'] },
  { icon:'🤖', cls:'ic-blue',   title:'Self-Serve Kiosks',    desc:'Power restaurant kiosks, vending machines, and parking systems.', features:['Auto-refreshing QR','Payment auto-detection','Zero staff needed','Hardware compatible'] },
  { icon:'🌐', cls:'ic-purple', title:'Websites & eCommerce', desc:'Integrate NovaPay into any site with our clean REST API and webhooks.', features:['Dynamic QR checkout','Payment link generation','Webhook notifications','Simple REST API'] },
  { icon:'📺', cls:'ic-gold',   title:'OTT & Smart TV',       desc:'Users scan QR on TV screen, pay on phone, and content unlocks instantly.', features:['QR on TV screen','Phone-based payment','Subscription auto-unlock','SDK support'] },
];

const HOW_STEPS = [
  { n:'01', title:'Connect your UPI',  desc:'Register your business UPI in the NovaPay dashboard — encrypted and stored securely.' },
  { n:'02', title:'Generate payment',  desc:'A dynamic QR or payment link is created instantly per order or transaction.' },
  { n:'03', title:'Customer pays',     desc:'Customer scans with any UPI app — PhonePe, GPay, Paytm — and confirms.' },
  { n:'04', title:'Instant webhook',   desc:'NovaPay confirms the payment in real-time and fires your configured webhook.' },
];

const INTEGRATIONS = [
  { icon:'📱', color:'rgba(88,196,220,.12)',  name:'PhonePe Business', type:'UPI Provider' },
  { icon:'💳', color:'rgba(0,147,255,.10)',   name:'Google Pay',       type:'UPI Provider' },
  { icon:'🅿️', color:'rgba(0,185,255,.10)',   name:'Paytm Business',   type:'UPI Provider' },
  { icon:'🇮🇳', color:'rgba(255,153,0,.10)', name:'BharatPe',         type:'UPI Provider' },
  { icon:'🔗', color:'rgba(124,58,237,.10)',  name:'REST API',         type:'Integration'  },
  { icon:'📦', color:'rgba(0,229,176,.10)',   name:'Webhooks',         type:'Integration'  },
];

const QR_PATTERN = [1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,0,1,0,0,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,1,0,1,1,0,0,0,0,0,1,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,0,1,0,0,0,1,0,1,1,0,1,0,1,1,1,0,1,0,0,1,1,0,0,1,0,1];

const STAT_DATA = [
  { icon:'💸', cls:'si-teal',   raw:50,   display:(n:number)=>`₹${n}Cr+`, desc:'Processed monthly',    badge:'40% MoM growth' },
  { icon:'🏪', cls:'si-blue',   raw:2400, display:(n:number)=>`${n.toLocaleString('en-IN')}+`, desc:'Active merchants', badge:'Across India' },
  { icon:'⚡', cls:'si-purple', raw:999,  display:()=>'99.9%',            desc:'Uptime SLA',           badge:'Live status' },
  { icon:'🚀', cls:'si-gold',   raw:2,    display:(n:number)=>`<${n}s`,   desc:'Payment confirmation', badge:'Real-time' },
];

function useCounter(target: number, active: boolean, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(e * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return val;
}

function StatCard({ data, delay }: { data: typeof STAT_DATA[0]; delay: number }) {
  const [started, setStarted] = useState(false);
  const count = useCounter(data.raw, started);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className="stat-card">
      <div className={`stat-icon-box ${data.cls}`}>{data.icon}</div>
      <div className="stat-num"><span className="hi">{data.display(count)}</span></div>
      <div className="stat-desc">{data.desc}</div>
      <div className="live-badge"><span className="live-dot" />{data.badge}</div>
    </div>
  );
}

function PricingSection() {
  const [plans, setPlans] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/v1/public/plans')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.data)) setPlans(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="plans-grid">
      {[1,2,3].map(i => (
        <div key={i} className="plans-skeleton">
          <div className="skel-line" style={{width:'40%',height:11}} />
          <div className="skel-line" style={{width:'55%',height:36,marginTop:8}} />
          <div className="skel-line" style={{width:'75%',height:11,marginTop:20}} />
          <div className="skel-line" style={{width:'65%',height:11}} />
          <div className="skel-line" style={{width:'70%',height:11}} />
          <div className="skel-line" style={{width:'80%',height:36,marginTop:24,borderRadius:10}} />
        </div>
      ))}
    </div>
  );

  // Fallback static plans if API not ready yet
  const fallback = [
    { id:'1', name:'Starter', price:0, billing_cycle:'forever', badge:null, is_featured:false, cta_label:'Get started', features:['100 QR codes / month','5 payment links','Basic analytics','Email support'] },
    { id:'2', name:'Pro', price:99900, billing_cycle:'per month', badge:'Most popular', is_featured:true, cta_label:'Start free trial', features:['Unlimited QR codes','Unlimited payment links','Advanced analytics','Webhook support','Priority support'] },
    { id:'3', name:'Enterprise', price:0, billing_cycle:'contact us', badge:null, is_featured:false, cta_label:'Contact sales', features:['Everything in Pro','Dedicated infrastructure','Custom rate limits','SLA guarantee','White-label option'] },
  ];

  const displayPlans = (error || !plans?.length) ? fallback : plans;

  return (
    <div className="plans-grid">
      {displayPlans.map(plan => (
        <div key={plan.id} className={`plan-card ${plan.is_featured ? 'featured' : ''}`}>
          {plan.badge && <div className="plan-popular">{plan.badge}</div>}
          <div className="plan-name">{plan.name}</div>
          <div className="plan-price">
            {plan.price === 0 ? (plan.billing_cycle === 'contact us' ? 'Custom' : 'Free') : `₹${(plan.price/100).toLocaleString('en-IN')}`}
          </div>
          <div className="plan-price-sub">{plan.billing_cycle}</div>
          <hr className="plan-divider" />
          <ul className="plan-feat-list">
            {(plan.features||[]).map((f: string, i: number) => (
              <li key={i}><span className="pf-check">✓</span>{f}</li>
            ))}
          </ul>
          <a href="/auth/login" className={`plan-cta ${plan.is_featured ? 'solid' : 'outline'}`}>
            {plan.cta_label || 'Get started'}
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Main landing page component ──────────────────────────────────────────────
function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % HOW_STEPS.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{STYLES}</style>

      {/* NAV */}
      <nav className="np-nav">
        <a href="/" className="np-logo">
          <div className="np-logo-mark">N</div>NovaPay
        </a>
        <div className="np-nav-links">
          <a href="#solutions">Solutions</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="/docs">Docs</a>
        </div>
        <div className="np-nav-right">
          <a href="/auth/login" className="btn-ghost">Log in</a>
          <a href="/auth/login" className="btn-primary">Get started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="np-hero">
        <div className="hero-grid-bg" />
        <div className="hero-orb" />
        <div className="hero-badge"><div className="hero-dot" /> India's smartest UPI gateway</div>
        <h1>Accept UPI payments<br /><span className="grad-text">everywhere you sell.</span></h1>
        <p className="np-hero-sub">NovaPay lets merchants collect payments via dynamic QR codes, payment links, and UPI intent — across stores, kiosks, websites, and smart TVs.</p>
        <div className="hero-actions">
          <a href="/auth/login" className="btn-primary btn-lg">Start for free →</a>
          <a href="#how" className="btn-ghost btn-lg">See how it works</a>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-wrap">
        <div className="stats-strip">
          {STAT_DATA.map((d, i) => <StatCard key={i} data={d} delay={i * 120} />)}
        </div>
      </div>

      {/* USE CASES */}
      <section className="np-section" id="solutions">
        <div className="section-eyebrow">Solutions</div>
        <h2 className="section-h2">One gateway.<br />Every channel.</h2>
        <p className="section-sub">Whether you sell in a store, run a kiosk, or build apps — NovaPay plugs in seamlessly.</p>
        <div className="uc-grid">
          {USE_CASES.map(uc => (
            <div className="uc-card" key={uc.title}>
              <div className={`uc-icon-wrap ${uc.cls}`}>{uc.icon}</div>
              <div className="uc-title">{uc.title}</div>
              <div className="uc-desc">{uc.desc}</div>
              <ul className="feature-list">
                {uc.features.map(f => <li key={f}><span className="feat-dot" />{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="np-section alt" id="how">
        <div className="how-inner">
          <div>
            <div className="section-eyebrow">How it works</div>
            <h2 className="section-h2">Payment in 4 simple steps.</h2>
            <div className="how-steps">
              {HOW_STEPS.map((s, i) => (
                <div key={s.n} className={`hw-step ${activeStep===i?'active':''}`} onClick={() => setActiveStep(i)}>
                  <div className="hw-num">{s.n}</div>
                  <div>
                    <div className="hw-step-title">{s.title}</div>
                    <div className="hw-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="how-visual">
            <div className="phone-frame">
              <div className="paid-badge">✓ PAID</div>
              <div className="notif-pop">
                <div className="notif-icon">💸</div>
                <div><div className="notif-title">Payment received</div><div className="notif-sub">₹1,499.00 · just now</div></div>
              </div>
              <div className="phone-amount-lbl">Amount due</div>
              <div className="phone-amount-val">₹1,499</div>
              <div className="qr-box">
                <div className="qr-pattern">
                  {QR_PATTERN.map((c,i) => <div key={i} className={`qr-c ${c?'q1':'q0'}`} />)}
                </div>
              </div>
              <div className="phone-amount-lbl">Scan with any UPI app</div>
              <div className="phone-pay-btn">Pay with UPI →</div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="np-section" id="integrations">
        <div className="section-eyebrow">Integrations</div>
        <h2 className="section-h2">Works with every UPI app.</h2>
        <p className="section-sub">NovaPay supports all major Indian UPI providers and integrates via a clean REST API.</p>
        <div className="int-grid">
          {INTEGRATIONS.map(p => (
            <div className="int-card" key={p.name}>
              <div className="int-logo-box" style={{background:p.color}}>{p.icon}</div>
              <div><div className="int-name">{p.name}</div><div className="int-type">{p.type}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="np-section alt" id="pricing">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-h2">Simple, transparent plans.</h2>
        <p className="section-sub">Start free, scale when you're ready. No hidden fees.</p>
        <PricingSection />
      </section>

      {/* CTA */}
      <section className="cta-banner">
        <div className="cta-orb" />
        <h2>Ready to accept payments?</h2>
        <p>Join thousands of merchants using NovaPay across India.</p>
        <div className="cta-actions">
          <a href="/auth/login" className="btn-primary btn-lg">Create free account →</a>
          <a href="/docs" className="btn-ghost btn-lg">Read the docs</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="np-footer">
        <a href="/" className="np-logo" style={{fontSize:17}}>
          <div className="np-logo-mark" style={{width:28,height:28,fontSize:12}}>N</div>NovaPay
        </a>
        <div className="footer-links">
          <a href="/docs">Docs</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:support@novapay.in">Support</a>
        </div>
        <div className="footer-copy">© 2025 NovaPay. All rights reserved.</div>
      </footer>
    </>
  );
}

// ─── Root export — smart wrapper ──────────────────────────────────────────────
export default function HomePage() {
  const ready = useAuthRedirect();

  // While checking auth, show a minimal NovaPay loader (not the old UPay one)
  if (!ready) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#07090f'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:44,height:44,borderRadius:11,background:'linear-gradient(135deg,#00e5b0,#0ea5e9)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#07090f',fontWeight:800,fontSize:20,marginBottom:16,fontFamily:'Syne,sans-serif'}}>N</div>
          <p style={{color:'#4b5563',fontSize:13,fontFamily:'DM Sans,sans-serif'}}>Loading...</p>
        </div>
      </div>
    );
  }

  return <LandingPage />;
}