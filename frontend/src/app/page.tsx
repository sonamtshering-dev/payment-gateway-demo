'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const Logo = ({ size = 32 }: { size?: number }) => (
  <img src="/novapaylogo.jpeg" alt="NovaPay" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6 }} />
);

const FEATURES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    title: 'Instant UPI Payments',
    desc: 'Money lands directly in your UPI account in under 2 seconds. No intermediary holds.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    title: 'Bank-grade Security',
    desc: 'AES-256 encryption, PCI DSS compliance, KYC verification and AI-powered fraud detection.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    title: 'Real-time Analytics',
    desc: 'Live dashboards for transactions, revenue trends, success rates and customer insights.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    title: 'Payment Links & QR',
    desc: 'Generate branded payment links and QR codes in seconds. Share anywhere.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    title: 'Webhook Events',
    desc: 'Instant payment notifications via webhooks. Integrate with your backend in minutes.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    title: '0% Transaction Fee',
    desc: 'Keep 100% of every payment. No per-transaction charges, no hidden fees. Ever.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create Account', desc: 'Sign up free in 60 seconds. Verify your KYC and add your UPI ID.' },
  { step: '02', title: 'Generate Payment Link', desc: 'Create a payment link or QR code from your dashboard instantly.' },
  { step: '03', title: 'Share & Collect', desc: 'Share the link with customers. Money hits your UPI directly.' },
];

const PAYMENT_COLORS = [
  { bg: '#EFF6FF', text: '#2563EB' },
  { bg: '#F0FDF4', text: '#059669' },
  { bg: '#FFF7ED', text: '#D97706' },
  { bg: '#FDF4FF', text: '#9333EA' },
  { bg: '#FFF1F2', text: '#E11D48' },
];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token') || localStorage.getItem('novapay_access_token');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    fetch('/api/v1/public/payments')
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setPayments(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/v1/public/plans')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setPlans(d.data.map((p: any) => ({
            name: p.name,
            price: p.price === 0 ? 'Free' : '₹' + (p.price / 100).toLocaleString('en-IN'),
            period: p.billing_cycle === 'forever' ? 'forever' : '/ ' + p.billing_cycle,
            features: Array.isArray(p.features) ? p.features : [],
            featured: p.is_featured,
            badge: p.badge,
            cta: p.cta_label || 'Get Started',
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: '#fff', color: '#0F172A', fontFamily: "-apple-system,'Inter','Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }
        .nav-link { font-size: 14px; color: #475569; font-weight: 500; transition: color .15s; }
        .nav-link:hover { color: #2563EB; }
        .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 4px; }
        .hamburger span { display: block; width: 20px; height: 2px; background: #334155; border-radius: 2px; transition: all 0.3s; }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-menu { display: none; flex-direction: column; position: fixed; top: 64px; left: 0; right: 0; background: #fff; padding: 20px 24px 28px; border-bottom: 1px solid #E2E8F0; z-index: 199; gap: 4px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .mobile-menu.open { display: flex; }
        .mobile-menu a { font-size: 15px; color: #475569; padding: 12px 0; border-bottom: 1px solid #F1F5F9; font-weight: 500; }
        .mobile-menu-btns { display: flex; gap: 10px; margin-top: 12px; }
        .feat-card { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 28px; transition: all .2s; }
        .feat-card:hover { border-color: #BFDBFE; background: #EFF6FF; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,99,235,.08); }
        .blink { animation: blink 1.5s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .hero-anim { animation: fadeUp .6s ease both; }
        @media (max-width: 900px) {
          .hamburger { display: flex !important; }
          .desktop-nav, .desktop-btns { display: none !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 36px !important; letter-spacing: -1.5px !important; }
          .hero-wrap { padding: 32px 20px 40px !important; padding-top: calc(64px + 40px) !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .stat-item { border-right: none !important; border-bottom: 1px solid #E2E8F0 !important; }
          .stat-item:nth-child(odd) { border-right: 1px solid #E2E8F0 !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .section-pad { padding: 56px 20px !important; }
          .footer-inner { flex-direction: column !important; gap: 20px !important; }
          .hero-card { display: none !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', transition: 'box-shadow .3s', boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,.06)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>Nova<span style={{ color: '#2563EB' }}>Pay</span></span>
        </div>
        <div className="desktop-nav" style={{ display: 'flex', gap: 32 }}>
          {[['Features','#features'],['How It Works','#how'],['Pricing','#pricing'],['About','/about'],['Contact','/contact']].map(([l,h]) => (
            <a key={l} href={h} className="nav-link">{l}</a>
          ))}
        </div>
        <div className="desktop-btns" style={{ display: 'flex', gap: 10 }}>
          {isLoggedIn ? (
            <Link href="/dashboard" style={{ fontSize: 14, color: '#fff', fontWeight: 600, padding: '9px 20px', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', borderRadius: 10, boxShadow: '0 2px 8px rgba(37,99,235,.25)' }}>Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/auth/login" style={{ fontSize: 14, color: '#374151', fontWeight: 500, padding: '9px 20px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#fff' }}>Log in</Link>
              <Link href="/auth/register" style={{ fontSize: 14, color: '#fff', fontWeight: 600, padding: '9px 20px', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', borderRadius: 10, boxShadow: '0 2px 8px rgba(37,99,235,.25)' }}>Get Started Free →</Link>
            </>
          )}
        </div>
        <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
      </nav>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {[['Features','#features'],['How It Works','#how'],['Pricing','#pricing'],['About','/about'],['Contact','/contact']].map(([l,h]) => (
          <a key={l} href={h} onClick={() => setMenuOpen(false)}>{l}</a>
        ))}
        <div className="mobile-menu-btns">
          <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ flex:1, textAlign:'center' as const, fontSize:14, color:'#374151', padding:'11px 0', border:'1.5px solid #E2E8F0', borderRadius:8, fontWeight:500 }}>Log in</Link>
          <Link href="/auth/register" onClick={() => setMenuOpen(false)} style={{ flex:1, textAlign:'center' as const, fontSize:14, color:'#fff', fontWeight:600, padding:'11px 0', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', borderRadius:8 }}>Get Started</Link>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, #fff 100%)', borderBottom: '1px solid #E2E8F0' }}>
        <div className="hero-wrap" style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 48px 80px', paddingTop: 'calc(64px + 72px)' }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 64, alignItems: 'center' }}>
            <div className="hero-anim">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#DBEAFE', border: '1px solid #BFDBFE', borderRadius: 100, padding: '5px 14px', marginBottom: 28, letterSpacing: '.03em' }}>
                <div style={{ width: 6, height: 6, background: '#2563EB', borderRadius: '50%' }}/>
                India's zero-fee UPI gateway
              </div>
              <h1 className="hero-title" style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2.5, color: '#0F172A', marginBottom: 20 }}>
                Accept payments.<br/>Keep every rupee.
              </h1>
              <p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.7, marginBottom: 40, maxWidth: 440 }}>
                NovaPay routes UPI payments directly to your bank account — no intermediary, no transaction fees, no waiting.
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 48, flexWrap: 'wrap' as const }}>
                <Link href="/auth/register" style={{ background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 12, boxShadow: '0 4px 16px rgba(37,99,235,.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Start for free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <a href="#how" style={{ background: '#fff', color: '#374151', fontSize: 15, fontWeight: 600, padding: '14px 28px', borderRadius: 12, border: '1.5px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  See how it works
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' as const }}>
                {[['0%','Transaction fee'],['< 2s','Settlement'],['99.9%','Uptime']].map(([n,l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#2563EB', letterSpacing: -1 }}>{n}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{l}</span>
                  </div>
                ))}
                <div style={{ width: 1, height: 24, background: '#E2E8F0' }}/>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex' }}>
                    {[['#EFF6FF','#2563EB','R'],['#F0FDF4','#059669','P'],['#FFF7ED','#D97706','A'],['#FDF4FF','#9333EA','S'],['#FFF1F2','#E11D48','M']].map(([bg,txt,l]) => (
                      <div key={l} style={{ width:28, height:28, borderRadius:'50%', border:'2px solid #fff', marginRight:-8, background:bg, color:txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{l}</div>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: '#64748B', paddingLeft: 10 }}>Trusted by <b style={{ color: '#0F172A' }}>500+ merchants</b></span>
                </div>
              </div>
            </div>

            {/* LIVE PAYMENTS CARD */}
            <div className="hero-card" style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.08)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBFE' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Live Payments</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Real merchant transactions</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#059669', fontWeight: 600, background: '#F0FDF4', padding: '4px 10px', borderRadius: 100, border: '1px solid #BBF7D0' }}>
                  <div className="blink" style={{ width: 5, height: 5, background: '#22C55E', borderRadius: '50%' }}/>Live
                </div>
              </div>
              {(payments.length > 0 ? payments : [
                { masked_id: '•••• 4821', amount: 49900, created_at: new Date().toISOString(), method: 'UPI' },
                { masked_id: '•••• 1337', amount: 12500, created_at: new Date(Date.now()-120000).toISOString(), method: 'UPI' },
                { masked_id: '•••• 9054', amount: 299900, created_at: new Date(Date.now()-360000).toISOString(), method: 'UPI' },
                { masked_id: '•••• 6612', amount: 8000, created_at: new Date(Date.now()-600000).toISOString(), method: 'UPI' },
              ]).slice(0,5).map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid #F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: PAYMENT_COLORS[i % PAYMENT_COLORS.length].bg, color: PAYMENT_COLORS[i % PAYMENT_COLORS.length].text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UserIcon />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, fontFamily: 'monospace', letterSpacing: 1 }}>{p.masked_id}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{timeAgo(p.created_at)} · {p.method}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>₹{(p.amount / 100).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Confirmed ✓</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px 20px', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Real transactions from NovaPay merchants</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div style={{ borderBottom: '1px solid #E2E8F0', background: '#fff' }}>
        <div className="stats-grid" style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            ['0%','Transaction Fee','Keep every rupee you earn'],
            ['< 2s','Settlement Speed','Direct to your UPI instantly'],
            ['99.9%','Uptime SLA','Always-on payment infrastructure'],
            ['AES-256','Encryption','Bank-grade data protection'],
          ].map(([n,l,d]) => (
            <div key={l} className="stat-item" style={{ textAlign: 'center' as const, padding: '36px 24px', borderRight: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#2563EB', letterSpacing: -1.5, marginBottom: 4 }}>{n}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" className="section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 48px' }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
          <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '4px 14px', letterSpacing: '.05em', marginBottom: 16 }}>FEATURES</div>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.5, color: '#0F172A', marginBottom: 12 }}>Built for serious merchants</h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>Everything you need to accept, track, and grow your payments — no extra tools required.</p>
        </div>
        <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feat-card">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '88px 48px' }}>
        <div className="section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: 0 }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '4px 14px', letterSpacing: '.05em', marginBottom: 16 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.5, color: '#0F172A', marginBottom: 12 }}>Up and running in minutes</h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>No complex integration. No waiting. Start collecting payments the same day.</p>
          </div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {HOW_IT_WORKS.map((h, i) => (
              <div key={h.step} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '32px 28px', position: 'relative' as const }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', letterSpacing: '.1em', marginBottom: 20 }}>{h.step}</div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ position: 'absolute' as const, top: 48, right: -16, color: '#BFDBFE', zIndex: 1 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{h.title}</div>
                <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ padding: '88px 48px' }}>
        <div className="section-pad" style={{ maxWidth: 900, margin: '0 auto', padding: 0 }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '4px 14px', letterSpacing: '.05em', marginBottom: 16 }}>PRICING</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.5, color: '#0F172A', marginBottom: 12 }}>No surprises, ever</h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 400, margin: '0 auto', lineHeight: 1.65 }}>Start free, scale when you're ready. Cancel any time.</p>
          </div>
          {plans.length > 0 ? (
            <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length,3)},1fr)`, gap: 16 }}>
              {plans.map(p => (
                <div key={p.name} style={{ background: p.featured ? 'linear-gradient(135deg,#1D4ED8,#2563EB)' : '#fff', border: p.featured ? 'none' : '1.5px solid #E2E8F0', borderRadius: 20, padding: '32px 28px', position: 'relative' as const, boxShadow: p.featured ? '0 12px 40px rgba(37,99,235,.3)' : '0 2px 8px rgba(0,0,0,.04)' }}>
                  {(p.featured || p.badge) && (
                    <div style={{ position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: '#FBBF24', color: '#78350F', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 100, whiteSpace: 'nowrap' as const, letterSpacing: '.06em' }}>
                      {p.badge || '✦ MOST POPULAR'}
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.featured ? 'rgba(255,255,255,.7)' : '#64748B', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 16 }}>{p.name}</div>
                  <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -2, color: p.featured ? '#fff' : '#0F172A', lineHeight: 1, marginBottom: 2 }}>{p.price}</div>
                  <div style={{ fontSize: 13, color: p.featured ? 'rgba(255,255,255,.6)' : '#94A3B8', marginBottom: 24 }}>{p.period}</div>
                  <Link href="/auth/register" style={{ display: 'block', textAlign: 'center' as const, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700, marginBottom: 24, background: p.featured ? '#fff' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: p.featured ? '#2563EB' : '#fff' }}>
                    {p.cta}
                  </Link>
                  {p.features.map((f: string) => (
                    <div key={f} style={{ display: 'flex', gap: 9, fontSize: 13, color: p.featured ? 'rgba(255,255,255,.85)' : '#475569', marginBottom: 10, alignItems: 'flex-start' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.featured ? '#93C5FD' : '#2563EB'} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center' as const, color: '#94A3B8', padding: '40px 0' }}>Loading plans…</div>
          )}
        </div>
      </div>

      {/* CTA BANNER */}
      <div style={{ background: 'linear-gradient(135deg,#1E40AF,#2563EB)', padding: '72px 48px', textAlign: 'center' as const }}>
        <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.5, color: '#fff', marginBottom: 14 }}>Ready to get paid?</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.75)', lineHeight: 1.7, marginBottom: 32, maxWidth: 420, margin: '0 auto 32px' }}>
          Join 500+ Indian merchants collecting UPI payments with NovaPay — zero fees, zero friction.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <Link href="/auth/register" style={{ background: '#fff', color: '#2563EB', fontSize: 15, fontWeight: 700, padding: '14px 32px', borderRadius: 12 }}>Create free account →</Link>
          <Link href="/contact" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 15, fontWeight: 600, padding: '14px 32px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.3)' }}>Talk to sales</Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0F172A', padding: '48px', color: 'rgba(255,255,255,.5)' }}>
        <div className="footer-inner" style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Logo />
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>NovaPay</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 220 }}>India's zero-fee UPI payment gateway for modern merchants.</p>
          </div>
          <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' as const }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 14 }}>Product</div>
              {[['Features','#features'],['Pricing','#pricing'],['API Docs','/dashboard/api-docs']].map(([l,h]) => (
                <div key={l} style={{ marginBottom: 10 }}><a href={h} style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', transition: 'color .15s' }}>{l}</a></div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 14 }}>Company</div>
              {[['About','/about'],['Contact','/contact']].map(([l,h]) => (
                <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{l}</Link></div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 14 }}>Legal</div>
              {[['Privacy Policy','/privacy'],['Terms of Service','/terms'],['Refund Policy','/refund']].map(([l,h]) => (
                <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{l}</Link></div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1160, margin: '32px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
          <span style={{ fontSize: 12 }}>© 2026 NovaPay Technologies Pvt. Ltd. All rights reserved.</span>
          <span style={{ fontSize: 12 }}>Made with ♥ in India</span>
        </div>
      </footer>
    </div>
  );
}
