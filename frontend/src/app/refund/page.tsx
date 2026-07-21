import Link from 'next/link';

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SECTIONS = [
  { title: '1. Scope of This Policy', body: "This Refund Policy applies to subscription fees charged by NovaPay. It does not govern payments made by end-customers to merchants — those are the merchant's responsibility. NovaPay does not process, hold, or refund end-customer payments." },
  { title: '2. Subscription Fees', body: 'NovaPay subscription fees (e.g., Standard, Pro plans) are charged monthly or annually as selected at the time of purchase. All subscription amounts are stated in Indian Rupees (INR) and include applicable taxes.' },
  { title: '3. Refund Eligibility', list: ['You are eligible for a full refund if you cancel within 7 days of your first paid subscription and have not used paid features', 'Mid-cycle cancellations are not eligible for pro-rated refunds unless NovaPay is at fault', 'If NovaPay is unable to provide the subscribed service due to our failure, a full refund will be issued for the affected period', 'Refunds will not be issued for: change of mind after 7 days, violation of our Terms of Service, or misuse of the platform'] },
  { title: '4. How to Request a Refund', body: 'To request a refund, email support@novapay.in with your account email, the reason for refund, and your transaction reference. We will acknowledge your request within 2 business days and process eligible refunds within 7–10 business days to the original payment method.' },
  { title: '5. Cancellations', body: 'You may cancel your subscription at any time from your dashboard under Settings → Subscription. Cancellation takes effect at the end of the current billing period. You retain full access to your paid plan until the end of the paid period.' },
  { title: '6. Disputes', body: 'If you believe a charge was made in error, contact us at support@novapay.in within 30 days of the charge. We will investigate and resolve billing disputes within 10 business days.' },
  { title: '7. Changes to This Policy', body: 'NovaPay reserves the right to modify this Refund Policy at any time. Material changes will be notified via email. Continued use of NovaPay after changes constitutes acceptance of the updated policy.' },
];

export default function RefundPage() {
  return (
    <div style={{ background: '#fff', color: '#0F172A', fontFamily: "-apple-system,'Inter','Helvetica Neue',sans-serif", minHeight: '100vh' }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } a { text-decoration: none; color: inherit; } @media (max-width: 768px) { nav { padding: 0 20px !important; } .page-pad { padding: 48px 20px !important; } }`}</style>
      <nav style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>Nova<span style={{ color: '#2563EB' }}>Pay</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: '#374151', padding: '8px 18px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontWeight: 500 }}>Log in</Link>
          <Link href="/auth/register" style={{ fontSize: 14, color: '#fff', fontWeight: 600, padding: '8px 18px', background: '#2563EB', borderRadius: 9 }}>Get Started</Link>
        </div>
      </nav>

      <div style={{ background: 'linear-gradient(180deg,#EFF6FF,#fff)', borderBottom: '1px solid #E2E8F0', padding: '56px 48px', textAlign: 'center' as const }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '3px 12px', letterSpacing: '.05em', marginBottom: 14 }}>LEGAL</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: '#0F172A', marginBottom: 10 }}>Refund Policy</h1>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>Last updated: March 20, 2026</p>
      </div>

      <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto', padding: '64px 48px 80px' }}>
        <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75, marginBottom: 40, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '16px 20px' }}>
          <strong style={{ color: '#C2410C' }}>Important:</strong> This policy covers NovaPay subscription fees only. End-customer payment refunds are the merchant's sole responsibility.
        </p>
        {SECTIONS.map(s => (
          <div key={s.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 10, letterSpacing: -0.3 }}>{s.title}</h2>
            {s.body && <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8 }}>{s.body}</p>}
            {s.list && (
              <ul style={{ paddingLeft: 20, listStyleType: 'disc' }}>
                {s.list.map(item => <li key={item} style={{ fontSize: 15, color: '#475569', lineHeight: 2 }}>{item}</li>)}
              </ul>
            )}
          </div>
        ))}
        <div style={{ marginTop: 56, padding: '20px 24px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.37 10.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>Refund requests? Email <a href="mailto:support@novapay.in" style={{ color: '#2563EB', fontWeight: 600 }}>support@novapay.in</a></span>
        </div>
      </div>

      <footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>© 2026 NovaPay Technologies Pvt. Ltd.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Home','/'],['Privacy','/privacy'],['Terms','/terms'],['Contact','/contact']].map(([l,h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: '#94A3B8' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
