import Link from 'next/link';

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: `By registering for or using NovaPay, you confirm that you are at least 18 years of age, have the legal capacity to enter into this agreement, and agree to comply with these Terms. If you are using NovaPay on behalf of a business, you confirm you have the authority to bind that business to these Terms.` },
  { title: '2. Description of Service', body: `NovaPay provides a UPI-based payment gateway that allows merchants to accept payments via dynamic QR codes, payment links, and a developer API. All payments are routed directly to the merchant's registered UPI account. NovaPay does not hold or escrow merchant funds.` },
  { title: '3. Merchant Obligations', list: ['Provide accurate and complete registration information', 'Maintain the security of your account credentials and API keys', 'Use the platform only for lawful business purposes', 'Comply with all applicable Indian laws, RBI guidelines, and NPCI policies', 'Complete KYC (Know Your Customer) verification as required', 'Not resell, sublicense, or transfer your NovaPay account', 'Notify us immediately of any unauthorized use of your account'] },
  { title: '4. Zero-Fee Commitment', body: `NovaPay charges no per-transaction fees. We may charge subscription fees for premium plan features, which are clearly disclosed at signup. Transaction amounts are passed through entirely to the merchant's UPI account. NovaPay reserves the right to introduce new paid features with advance notice.` },
  { title: '5. Prohibited Activities', list: ['Using NovaPay for illegal transactions or money laundering', 'Accepting payments for prohibited goods or services under Indian law', 'Attempting to reverse-engineer, hack, or disrupt the platform', 'Creating false accounts or misrepresenting your identity', 'Processing payments in violation of RBI or NPCI guidelines'] },
  { title: '6. KYC and Compliance', body: `We are required by law to collect and verify identity documents. Failure to complete KYC may result in suspension of payment collection features. By using NovaPay, you consent to identity verification checks and the sharing of necessary data with our regulated partners.` },
  { title: '7. Limitation of Liability', body: `NovaPay provides its services "as is." To the maximum extent permitted by law, NovaPay shall not be liable for indirect, incidental, or consequential damages arising from your use of the platform. Our total liability to you shall not exceed the subscription fees paid in the three months prior to the claim.` },
  { title: '8. Termination', body: `Either party may terminate this agreement at any time. We may suspend or terminate your account immediately for violations of these Terms, suspected fraud, or regulatory requirements. Upon termination, you retain access to your transaction history for 90 days.` },
  { title: '9. Governing Law', body: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.` },
  { title: '10. Changes to Terms', body: `We may update these Terms from time to time. We will notify you via email and in-app notice. Your continued use of NovaPay after the effective date constitutes acceptance of the revised Terms.` },
  { title: '11. Contact', body: `For questions about these Terms, contact us at legal@novapay.in or visit our contact page.` },
];

export default function TermsPage() {
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
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: '#0F172A', marginBottom: 10 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>Last updated: March 20, 2026</p>
      </div>

      <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto', padding: '64px 48px 80px' }}>
        <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75, marginBottom: 40, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
          Please read these Terms of Service carefully before using NovaPay. By using our platform, you agree to be bound by these terms.
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>Questions? Email <a href="mailto:legal@novapay.in" style={{ color: '#2563EB', fontWeight: 600 }}>legal@novapay.in</a> or visit our <Link href="/contact" style={{ color: '#2563EB', fontWeight: 600 }}>Contact page</Link>.</span>
        </div>
      </div>

      <footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>© 2026 NovaPay Technologies Pvt. Ltd.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Home','/'],['Privacy','/privacy'],['Refund','/refund'],['Contact','/contact']].map(([l,h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: '#94A3B8' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
