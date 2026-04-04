'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function useAuthRedirect() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('upay_access_token') || localStorage.getItem('novapay_access_token');
    if (token) router.replace('/dashboard');
    else setChecked(true);
  }, [router]);
  return checked;
}

const FEATURES = [
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, bg: 'rgba(59,130,246,0.1)', title: 'Instant UPI Payments', desc: 'Money goes directly to your UPI ID. No intermediary, no delays.' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, bg: 'rgba(34,197,94,0.1)', title: 'Bank-grade Security', desc: 'AES-256 encryption, KYC verification and fraud detection built-in.' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>, bg: 'rgba(139,92,246,0.1)', title: 'Real-time Analytics', desc: 'Live transaction tracking, revenue charts and success rates.' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, bg: 'rgba(245,158,11,0.1)', title: 'Payment Links & QR', desc: 'Generate and share payment links or QR codes in seconds.' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, bg: 'rgba(239,68,68,0.1)', title: 'Webhook Events', desc: 'Instant notifications on all payment events via webhooks and API.' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, bg: 'rgba(20,184,166,0.1)', title: '0% Transaction Fee', desc: 'Keep 100% of every payment. No per-transaction charges, ever.' },
];

const PAYMENTS = [
  { id: '****7823', time: 'just now', method: 'GPay', amount: '₹1,539', color: 'rgba(59,130,246,0.12)', textColor: '#60a5fa' },
  { id: '****4491', time: '1m ago', method: 'Paytm', amount: '₹430', color: 'rgba(139,92,246,0.12)', textColor: '#a78bfa' },
  { id: '****2205', time: '3m ago', method: 'UPI', amount: '₹589', color: 'rgba(34,197,94,0.12)', textColor: '#4ade80' },
  { id: '****9934', time: '5m ago', method: 'GPay', amount: '₹2,100', color: 'rgba(245,158,11,0.12)', textColor: '#fbbf24' },
];

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const Logo = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <path d="M8 24V8l6 10 6-10v16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="24" cy="16" r="3" fill="#93c5fd"/>
  </svg>
);

export default function LandingPage() {
  const checked = useAuthRedirect();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    fetch('/api/v1/public/plans')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setPlans(d.data.map((p: any) => ({
            name: p.name,
            price: p.price === 0 ? 'Free' : '₹' + (p.price / 100).toLocaleString('en-IN'),
            period: p.billing_cycle === 'forever' ? 'forever' : p.billing_cycle,
            features: Array.isArray(p.features) ? p.features : [],
            featured: p.is_featured,
            badge: p.badge,
            cta: p.cta_label || 'Get Started',
          })));
        }
      })
      .catch(() => {});
  }, []);

  if (!checked) return <div style={{ minHeight: '100vh', background: '#0a0f1e' }} />;

  return (
    <div style={{ background: '#0a0f1e', color: '#e2e8f0', fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }
        .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 4px; }
        .hamburger span { display: block; width: 20px; height: 2px; background: rgba(255,255,255,0.6); border-radius: 2px; transition: all 0.3s; }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-menu { display: none; flex-direction: column; position: fixed; top: 60px; left: 0; right: 0; background: rgba(10,15,30,0.98); backdrop-filter: blur(20px); padding: 20px 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.06); z-index: 199; gap: 4px; }
        .mobile-menu.open { display: flex; }
        .mobile-menu a { font-size: 15px; color: rgba(255,255,255,0.6); padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .mobile-menu-btns { display: flex; gap: 10px; margin-top: 12px; }
        .blink { animation: blink 1.5s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .fc:hover { border-color: rgba(59,130,246,0.2) !important; }
        @media (max-width: 900px) {
          .hamburger { display: flex !important; }
          .desktop-nav, .desktop-btns { display: none !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 34px !important; letter-spacing: -1.5px !important; }
          .hero-wrap { padding: 48px 20px 40px !important; padding-top: calc(60px + 48px) !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .stat-item { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; padding: 20px !important; }
          .stat-item:nth-child(3), .stat-item:nth-child(4) { border-bottom: none !important; }
          .stats-bar { padding: 0 20px !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .section-pad { padding: 48px 20px !important; }
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .footer-pad { padding: 20px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', background: scrolled ? 'rgba(10,15,30,0.98)' : 'rgba(10,15,30,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logo />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>Nova<span style={{ color: '#3b82f6' }}>Pay</span></span>
        </div>
        <div className="desktop-nav" style={{ display: 'flex', gap: 28 }}>
          {[['Home','#'],['Features','#features'],['Pricing','#pricing'],['Contact','/contact']].map(([l,h]) => (
            <a key={l} href={h} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{l}</a>
          ))}
        </div>
        <div className="desktop-btns" style={{ display: 'flex', gap: 8 }}>
          <Link href="/auth/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', padding: '7px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7 }}>Login</Link>
          <Link href="/auth/register" style={{ fontSize: 13, color: '#fff', fontWeight: 600, padding: '7px 16px', background: '#2563eb', borderRadius: 7 }}>Get Started →</Link>
        </div>
        <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
      </nav>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {[['Home','#'],['Features','#features'],['Pricing','#pricing'],['Contact','/contact']].map(([l,h]) => (
          <a key={l} href={h} onClick={() => setMenuOpen(false)}>{l}</a>
        ))}
        <div className="mobile-menu-btns">
          <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: 'center' as const, fontSize: 14, color: 'rgba(255,255,255,0.6)', padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>Login</Link>
          <Link href="/auth/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: 'center' as const, fontSize: 14, color: '#fff', fontWeight: 600, padding: '11px 0', background: '#2563eb', borderRadius: 8 }}>Get Started</Link>
        </div>
      </div>

      {/* HERO */}
      <div className="hero-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px 72px', paddingTop: 'calc(60px + 80px)' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#60a5fa', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 4, padding: '4px 10px', marginBottom: 22, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              <div style={{ width: 5, height: 5, background: '#3b82f6', borderRadius: '50%' }}/>
              UPI Payment Gateway
            </div>
            <h1 className="hero-title" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2.5, color: '#f8fafc', marginBottom: 18 }}>
              Payments that go<br />straight to <span style={{ color: '#3b82f6' }}>your bank.</span><br />At zero cost.
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.38)', lineHeight: 1.75, marginBottom: 36, maxWidth: 430 }}>
              NovaPay lets Indian merchants accept UPI payments directly — no middlemen, no hidden charges, no delays.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 36, flexWrap: 'wrap' as const }}>
              <Link href="/auth/register" style={{ background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 22px', borderRadius: 8 }}>Start for free →</Link>
              <a href="#features" style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: '12px 22px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>See features</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                {[['#1e3a8a','#93c5fd','R'],['#1e1b4b','#a5b4fc','P'],['#064e3b','#6ee7b7','A'],['#4c1d95','#c4b5fd','S'],['#1c1917','#d4b483','M']].map(([bg,text,l]) => (
                  <div key={l} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #0a0f1e', marginRight: -7, background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{l}</div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingLeft: 10 }}><b style={{ color: 'rgba(255,255,255,0.55)' }}>500+ merchants</b> trust NovaPay</span>
            </div>
          </div>

          {/* LIVE FEED */}
          <div style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Live payments</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ade80', fontWeight: 600 }}>
                <div className="blink" style={{ width: 5, height: 5, background: '#22c55e', borderRadius: '50%' }}/>Live
              </span>
            </div>
            {PAYMENTS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.color, color: p.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, fontFamily: 'monospace', letterSpacing: 1 }}>{p.id}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 1 }}>{p.time} · {p.method}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{p.amount}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>UPI · Confirmed</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 18px', background: 'rgba(37,99,235,0.06)', borderTop: '1px solid rgba(37,99,235,0.12)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 3 }}>Today's total</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5 }}>₹48,291</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 3 }}>Transactions</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5 }}>127</div>
              </div>
            </div>
            <div style={{ padding: '10px 18px', background: 'rgba(34,197,94,0.04)', borderTop: '1px solid rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', flexShrink: 0 }}/>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>Only showing payments from registered NovaPay merchants</span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-bar" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 48px' }}>
        <div className="stats-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['0%','Transaction Fee'],['<2s','Settlement Speed'],['99.9%','Uptime SLA'],['AES-256','Encryption']].map(([n,l]) => (
            <div key={l} className="stat-item" style={{ textAlign: 'center' as const, padding: '32px 20px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', letterSpacing: -1.5, marginBottom: 4 }}>{n}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" className="section-pad" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 10 }}>Features</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.5, color: '#f1f5f9', marginBottom: 8 }}>Built for serious merchants</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.32)', marginBottom: 44 }}>Everything you need to accept, track and grow your payments.</div>
        <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="fc" style={{ padding: 22, background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, transition: 'border-color 0.2s' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: f.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6, letterSpacing: -0.2 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ background: '#080d1a', padding: '80px 48px' }}>
        <div className="section-pad" style={{ maxWidth: 900, margin: '0 auto', padding: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 10 }}>Pricing</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.5, color: '#f1f5f9', marginBottom: 8 }}>No surprises, ever</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.32)', marginBottom: 44 }}>Start free, scale when ready. Cancel anytime.</div>
          {plans.length > 0 ? (
            <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)},1fr)`, gap: 14 }}>
              {plans.map(p => (
                <div key={p.name} style={{ background: '#0d1426', border: p.featured ? '2px solid rgba(37,99,235,0.45)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '26px 22px', position: 'relative' as const }}>
                  {(p.featured || p.badge) && (
                    <div style={{ position: 'absolute' as const, top: -10, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' as const, letterSpacing: '0.06em' }}>
                      {p.badge || 'MOST POPULAR'}
                    </div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -2, color: '#f1f5f9', lineHeight: 1, marginBottom: 2 }}>{p.price}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginBottom: 18 }}>{p.period}</div>
                  <Link href="/auth/register" style={{ display: 'block', textAlign: 'center' as const, padding: '10px', borderRadius: 7, fontSize: 13, fontWeight: 600, marginBottom: 18, background: p.featured ? '#2563eb' : 'rgba(255,255,255,0.06)', color: '#fff' }}>{p.cta}</Link>
                  {p.features.map((f: string) => (
                    <div key={f} style={{ display: 'flex', gap: 7, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, alignItems: 'flex-start' }}>
                      <span style={{ color: '#3b82f6', flexShrink: 0, fontSize: 13 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center' as const, color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>Loading plans...</div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 48px', textAlign: 'center' as const }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.5, color: '#f1f5f9', marginBottom: 12 }}>Start accepting payments today</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.32)', lineHeight: 1.7, marginBottom: 26 }}>Join hundreds of Indian merchants using NovaPay to accept UPI payments at zero transaction cost.</p>
          <Link href="/auth/register" style={{ background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 26px', borderRadius: 8, display: 'inline-block' }}>Create free account →</Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-pad" style={{ padding: '22px 48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={20} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>NovaPay</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>© 2026 NovaPay. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 18 }}>
            {[['Privacy','/privacy'],['Terms','/terms'],['Refund','/refund'],['Contact','/contact']].map(([l,h]) => (
              <Link key={l} href={h} style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}