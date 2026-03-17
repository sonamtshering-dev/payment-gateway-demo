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

const PLANS = [
  { name: 'Starter', price: '₹1', period: '/month', desc: 'Perfect for getting started', features: ['100 QR codes/month', '5 payment links', 'Basic analytics', 'Email support'], featured: false, cta: 'Get started free' },
  { name: 'Pro', price: '₹999', period: '/month', desc: 'For growing businesses', features: ['Unlimited QR codes', 'Unlimited payment links', 'Advanced analytics', 'Webhook support', 'Priority support', 'API access'], featured: true, cta: 'Start with Pro' },
];

const STATS = [
  { value: '0%', label: 'Transaction Fee' },
  { value: '< 2s', label: 'Payment Speed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '256-bit', label: 'Encryption' },
];

export default function LandingPage() {
  const checked = useAuthRedirect();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 20); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);
  if (!checked) return <div style={{ minHeight: '100vh', background: '#020817' }} />;

  return (
    <div style={{ background: '#020817', color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        .nav-link { font-size: 14px; color: rgba(255,255,255,0.5); transition: color 0.2s; }
        .nav-link:hover { color: #dbeafe; }
        .feat-card { background: #0f1d35; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px 24px; transition: transform 0.2s, border-color 0.2s; }
        .feat-card:hover { transform: translateY(-4px); border-color: rgba(29,78,216,0.3); }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 200, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6vw', background: scrolled ? 'rgba(2,8,23,0.95)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Syne, sans-serif' }}>N</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#dbeafe' }}>NovaPay</span>
        </div>
        <div style={{ display: 'flex', gap: 36 }}>
          {[['Home','#'],['Features','#features'],['Pricing','#pricing'],['Contact','#contact']].map(([l,h]) => <a key={l} href={h} className="nav-link">{l}</a>)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth/login" style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 20px', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>Login</Link>
          <Link href="/auth/register" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 10, padding: '9px 22px', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 20px rgba(29,78,216,0.3)' }}>Dashboard</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '0 6vw', paddingTop: 66, position: 'relative' as const }}>
        <div style={{ position: 'absolute' as const, inset: 0, background: 'radial-gradient(ellipse 60% 70% at 50% 30%, rgba(29,78,216,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' as const, position: 'relative' as const, zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.25)', borderRadius: 100, padding: '6px 18px', fontSize: 13, color: '#93c5fd', marginBottom: 32 }}>
            ✨ Dynamic QR Payment Service
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 800, lineHeight: 1.05, marginBottom: 24, letterSpacing: -2 }}>
            Accept payments<br />
            <span style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Directly to your Account</span><br />
            at <span style={{ color: '#60a5fa' }}>0%</span> Transaction Fee
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            Revolutionize your payment process with Dynamic QR Codes. No middlemen, no hidden fees — money goes straight to your account.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/auth/register" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 12, padding: '15px 36px', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 24px rgba(29,78,216,0.4)' }}>Get Started Free →</Link>
            <a href="#features" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '15px 36px', color: '#dbeafe', fontSize: 16, fontWeight: 500 }}>See Features</a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '60px 6vw', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
          {STATS.map(s => (
            <div key={s.value} style={{ textAlign: 'center' as const }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, color: '#60a5fa', letterSpacing: -1, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 6vw' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 60 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(30px,4vw,48px)', fontWeight: 800, marginBottom: 14, letterSpacing: -1 }}>Everything you need</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 500, margin: '0 auto' }}>A complete payment infrastructure for modern businesses in India</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
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

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 6vw', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 60 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(30px,4vw,48px)', fontWeight: 800, marginBottom: 14, letterSpacing: -1 }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>No hidden fees. No surprises. Cancel anytime.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {PLANS.map(p => (
              <div key={p.name} style={{ background: p.featured ? 'linear-gradient(135deg,rgba(29,78,216,0.15),rgba(30,64,175,0.08))' : '#0f1d35', border: p.featured ? '2px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 28px', position: 'relative' as const, boxShadow: p.featured ? '0 0 40px rgba(29,78,216,0.15)' : 'none' }}>
                {p.featured && <div style={{ position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' as const }}>MOST POPULAR</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>{p.desc}</div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{p.period}</span>
                </div>
                <Link href="/auth/register" style={{ display: 'block', textAlign: 'center' as const, background: p.featured ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '13px 0', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 24, boxShadow: p.featured ? '0 4px 20px rgba(29,78,216,0.35)' : 'none' }}>{p.cta}</Link>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>Included:</div>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" style={{ padding: '80px 6vw', textAlign: 'center' as const }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: 'linear-gradient(135deg,rgba(29,78,216,0.15),rgba(30,64,175,0.08))', border: '1px solid rgba(29,78,216,0.25)', borderRadius: 24, padding: '60px 40px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, marginBottom: 14, letterSpacing: -1 }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>Join thousands of merchants accepting UPI payments at 0% fee.</p>
          <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 12, padding: '15px 40px', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 24px rgba(29,78,216,0.4)' }}>Create Free Account →</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 6vw', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>NovaPay</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>© 2026 NovaPay. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy','Terms','Contact'].map(l => <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  );
}
