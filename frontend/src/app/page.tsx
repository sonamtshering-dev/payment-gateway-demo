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
  { icon: '⚡', title: 'Instant UPI Payments', desc: 'Accept payments directly to your UPI ID. No intermediary, no delays.' },
  { icon: '🔒', title: 'Bank-grade Security', desc: 'AES-256 encryption, KYC verification, and fraud detection built-in.' },
  { icon: '📊', title: 'Real-time Analytics', desc: 'Track transactions, revenue, and success rates live from your dashboard.' },
  { icon: '🔗', title: 'Payment Links & QR', desc: 'Generate payment links and QR codes instantly. Share anywhere.' },
  { icon: '🪝', title: 'Webhook Events', desc: 'Get instant notifications on payment events via webhooks.' },
  { icon: '🚀', title: '0% Transaction Fee', desc: 'Keep 100% of what you earn. No per-transaction charges, ever.' },
];
// Plans loaded dynamically from API
const STATS = [
  { value: '0%', label: 'Transaction Fee' },
  { value: '< 2s', label: 'Payment Speed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '256-bit', label: 'Encryption' },
];
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
            price: p.price === 0 ? 'Free' : '₹' + (p.price / 100),
            period: p.billing_cycle === 'forever' ? '' : '/' + p.billing_cycle.replace('per ', ''),
            desc: p.description || '',
            features: Array.isArray(p.features) ? p.features : [],
            featured: p.is_featured,
            cta: p.cta_label || 'Get Started',
          })));
        }
      })
      .catch(() => {});
  }, []);
  if (!checked) return <div style={{ minHeight: '100vh', background: '#020817' }} />;
  return (
    <div style={{ background: '#020817', color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }
        .nav-link { font-size: 14px; color: rgba(255,255,255,0.5); transition: color 0.2s; }
        .nav-link:hover { color: #dbeafe; }
        .feat-card { background: #0f1d35; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px 24px; transition: transform 0.2s, border-color 0.2s; }
        .feat-card:hover { transform: translateY(-4px); border-color: rgba(29,78,216,0.3); }
        .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 6px; background: none; border: none; }
        .hamburger span { display: block; width: 22px; height: 2px; background: rgba(255,255,255,0.7); border-radius: 2px; transition: all 0.3s; }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-menu { display: none; flex-direction: column; position: fixed; top: 66px; left: 0; right: 0; background: rgba(2,8,23,0.98); backdrop-filter: blur(20px); padding: 20px 6vw 28px; border-bottom: 1px solid rgba(255,255,255,0.08); z-index: 199; gap: 6px; }
        .mobile-menu.open { display: flex; }
        .mobile-menu a { font-size: 16px; color: rgba(255,255,255,0.6); padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .desktop-nav { display: flex; gap: 36px; }
        .desktop-btns { display: flex; gap: 10px; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-btns { display: none !important; }
          .hamburger { display: flex !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .hero-btns a { text-align: center !important; }
          .cta-box { padding: 40px 24px !important; }
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
        }
      `}</style>
      <nav style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 200, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6vw', background: scrolled ? 'rgba(2,8,23,0.95)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Syne, sans-serif' }}>N</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#dbeafe' }}>NovaPay</span>
        </div>
        <div className="desktop-nav">
          {[['Home','#'],['Features','#features'],['Pricing','#pricing'],['Contact','/contact']].map(([l,h]) => <a key={l} href={h} className="nav-link">{l}</a>)}
        </div>
        <div className="desktop-btns">
          <Link href="/auth/login" style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 20px', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>Login</Link>
          <Link href="/auth/register" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 10, padding: '9px 22px', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Dashboard</Link>
        </div>
        <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {[['Home','#'],['Features','#features'],['Pricing','#pricing'],['Contact','/contact']].map(([l,h]) => (
          <a key={l} href={h} onClick={() => setMenuOpen(false)}>{l}</a>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: 'center' as const, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Login</Link>
          <Link href="/auth/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: 'center' as const, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 10, padding: '11px 0', color: '#fff', fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </div>
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '0 6vw', paddingTop: 66, position: 'relative' as const }}>
        <div style={{ position: 'absolute' as const, inset: 0, background: 'radial-gradient(ellipse 60% 70% at 50% 30%, rgba(29,78,216,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' as const, position: 'relative' as const, zIndex: 1, width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.25)', borderRadius: 100, padding: '6px 18px', fontSize: 13, color: '#93c5fd', marginBottom: 32 }}>✨ Dynamic QR Payment Service</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(36px,7vw,80px)', fontWeight: 800, lineHeight: 1.05, marginBottom: 24, letterSpacing: -2 }}>
            Accept payments<br />
            <span style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Directly to your Account</span><br />
            at <span style={{ color: '#60a5fa' }}>0%</span> Transaction Fee
          </h1>
          <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            Revolutionize your payment process with Dynamic QR Codes. No middlemen, no hidden fees — money goes straight to your account.
          </p>
          <div className="hero-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/auth/register" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 12, padding: '15px 36px', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 24px rgba(29,78,216,0.4)' }}>Get Started Free →</Link>
            <a href="#features" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '15px 36px', color: '#dbeafe', fontSize: 16, fontWeight: 500 }}>See Features</a>
          </div>
        </div>
      </section>
      <section style={{ padding: '60px 6vw', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
          {STATS.map(s => (
            <div key={s.value} style={{ textAlign: 'center' as const }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: '#60a5fa', letterSpacing: -1, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section id="features" style={{ padding: '80px 6vw' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 60 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(26px,4vw,48px)', fontWeight: 800, marginBottom: 14, letterSpacing: -1 }}>Everything you need</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 500, margin: '0 auto' }}>A complete payment infrastructure for modern businesses in India</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feat-card">
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#dbeafe' }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="pricing" style={{ padding: '80px 6vw', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 60 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(26px,4vw,48px)', fontWeight: 800, marginBottom: 14, letterSpacing: -1 }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>No hidden fees. No surprises. Cancel anytime.</p>
          </div>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {plans.map(p => (
              <div key={p.name} style={{ background: p.featured ? 'linear-gradient(135deg,rgba(29,78,216,0.15),rgba(30,64,175,0.08))' : '#0f1d35', border: p.featured ? '2px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 28px', position: 'relative' as const }}>
                {p.featured && <div style={{ position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' as const }}>MOST POPULAR</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>{p.desc}</div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{p.period}</span>
                </div>
                <Link href="/auth/register" style={{ display: 'block', textAlign: 'center' as const, background: p.featured ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '13px 0', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 24 }}>{p.cta}</Link>
                {p.features.map((f: string) => (
                  <div key={f} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '80px 6vw', textAlign: 'center' as const }}>
        <div className="cta-box" style={{ maxWidth: 600, margin: '0 auto', background: 'linear-gradient(135deg,rgba(29,78,216,0.15),rgba(30,64,175,0.08))', border: '1px solid rgba(29,78,216,0.25)', borderRadius: 24, padding: '60px 40px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, marginBottom: 14 }}>Ready to get started?</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>Join thousands of merchants accepting UPI payments at 0% fee.</p>
          <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 12, padding: '15px 40px', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Create Free Account →</Link>
        </div>
      </section>
      <footer style={{ padding: '32px 6vw', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>NovaPay</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>© 2026 NovaPay. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
            <Link href="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Terms</Link>
            <Link href="/refund" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Refund</Link>
            <Link href="/contact" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
