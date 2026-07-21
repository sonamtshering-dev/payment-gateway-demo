'use client';
import Link from 'next/link';

const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NAV_LINKS = [['Features','/#features'],['Pricing','/#pricing'],['Contact','/contact']];

const VALUES = [
  { icon: '⚡', title: 'Speed First', desc: 'Payments should settle in seconds, not days. We engineered NovaPay around sub-2-second UPI settlements from day one.' },
  { icon: '🔒', title: 'Security by Default', desc: 'AES-256 encryption, IP whitelisting, KYC verification, and AI fraud detection — not add-ons, but foundations.' },
  { icon: '₹', title: 'Zero Fees', desc: "We believe India's merchants deserve to keep every rupee they earn. No per-transaction cuts, ever." },
  { icon: '🌐', title: 'Built for Bharat', desc: 'UPI-native from day one, designed around the workflows of Indian businesses — from freelancers to enterprises.' },
];

const TIMELINE = [
  { year: '2024', title: 'Founded', desc: 'NovaPay was started with a single mission: let Indian merchants collect UPI payments without losing a cut to intermediaries.' },
  { year: '2025', title: 'First 100 Merchants', desc: 'We onboarded our first 100 merchants across e-commerce, services, and education verticals.' },
  { year: '2025', title: 'Zero-Fee Model', desc: 'We launched the industry-first zero transaction-fee model, passing full payment amounts directly to merchants.' },
  { year: '2026', title: '500+ Merchants', desc: 'Today NovaPay powers payments for over 500 merchants across India with 99.9% uptime.' },
];

export default function AboutPage() {
  return (
    <div style={{ background: '#fff', color: '#0F172A', fontFamily: "-apple-system,'Inter','Helvetica Neue',sans-serif", minHeight: '100vh' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; color: inherit; }
        @media (max-width: 768px) {
          .hero-pad { padding: 60px 20px 56px !important; }
          .section-pad { padding: 56px 20px !important; }
          .values-grid { grid-template-columns: 1fr !important; }
          .footer-inner { flex-direction: column !important; gap: 16px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>Nova<span style={{ color: '#2563EB' }}>Pay</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 28 }}>
          {NAV_LINKS.map(([l,h]) => (
            <Link key={l} href={h} style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>{l}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: '#374151', fontWeight: 500, padding: '9px 20px', border: '1.5px solid #E2E8F0', borderRadius: 10 }}>Log in</Link>
          <Link href="/auth/register" style={{ fontSize: 14, color: '#fff', fontWeight: 600, padding: '9px 20px', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', borderRadius: 10 }}>Get Started →</Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-pad" style={{ background: 'linear-gradient(180deg,#EFF6FF,#fff)', borderBottom: '1px solid #E2E8F0', padding: '80px 48px 72px', textAlign: 'center' as const }}>
        <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '4px 14px', letterSpacing: '.05em', marginBottom: 20 }}>ABOUT NOVAPAY</div>
        <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2.5, color: '#0F172A', marginBottom: 18, lineHeight: 1.06 }}>
          Payments that put<br />merchants first.
        </h1>
        <p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
          NovaPay was built to solve a simple problem: why should Indian merchants pay a fee every time a customer pays them? We built a better way.
        </p>
        <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 12, boxShadow: '0 4px 16px rgba(37,99,235,.3)' }}>
          Start for free
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>

      {/* MISSION */}
      <div className="section-pad" style={{ maxWidth: 800, margin: '0 auto', padding: '80px 48px', textAlign: 'center' as const }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', letterSpacing: '.05em', marginBottom: 16 }}>OUR MISSION</div>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', lineHeight: 1.5, letterSpacing: -0.5 }}>
          "To empower every Indian merchant — from a solo freelancer to a growing enterprise — to collect UPI payments instantly, securely, and at absolutely zero cost."
        </p>
      </div>

      {/* VALUES */}
      <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '80px 48px' }}>
        <div className="section-pad" style={{ maxWidth: 1100, margin: '0 auto', padding: 0 }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', letterSpacing: '.05em', marginBottom: 12 }}>WHAT WE STAND FOR</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5, color: '#0F172A' }}>Our core values</h2>
          </div>
          <div className="values-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {VALUES.map(v => (
              <div key={v.title} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '28px 24px' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{v.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{v.title}</div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="section-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 52 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', letterSpacing: '.05em', marginBottom: 12 }}>OUR STORY</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5, color: '#0F172A' }}>How we got here</h2>
        </div>
        <div style={{ position: 'relative' as const }}>
          <div style={{ position: 'absolute' as const, left: 52, top: 0, bottom: 0, width: 2, background: '#E2E8F0' }}/>
          {TIMELINE.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 24, marginBottom: i < TIMELINE.length - 1 ? 40 : 0 }}>
              <div style={{ flexShrink: 0, width: 104, textAlign: 'right' as const }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{t.year}</span>
              </div>
              <div style={{ position: 'relative' as const }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563EB', border: '3px solid #fff', boxShadow: '0 0 0 2px #2563EB', position: 'absolute' as const, left: -5, top: 4 }}/>
                <div style={{ paddingLeft: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{t.title}</div>
                  <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{t.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: 'linear-gradient(135deg,#1E40AF,#2563EB)', padding: '64px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' as const }}>
          {[['500+','Active merchants'],['₹0','Transaction fees'],['99.9%','Platform uptime'],['< 2s','Settlement speed']].map(([n,l]) => (
            <div key={l}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: -1.5, marginBottom: 6 }}>{n}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '72px 48px', textAlign: 'center' as const }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.5, color: '#0F172A', marginBottom: 12 }}>Join us on the mission</h2>
        <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
          Start accepting UPI payments today — free forever, no catch.
        </p>
        <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 12, boxShadow: '0 4px 16px rgba(37,99,235,.25)' }}>
          Create free account →
        </Link>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0F172A', padding: '28px 48px' }}>
        <div className="footer-inner" style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>NovaPay</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>© 2026 NovaPay Technologies Pvt. Ltd.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Privacy','/privacy'],['Terms','/terms'],['Refund','/refund'],['Contact','/contact']].map(([l,h]) => (
              <Link key={l} href={h} style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
