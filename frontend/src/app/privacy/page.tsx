import Link from 'next/link';

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SECTIONS = [
  { title: '1. Information We Collect', list: ['Account information: name, email, phone number, business details', 'KYC documents: PAN, Aadhaar, GST certificate (as required by law)', 'UPI ID and bank account details for payment routing', 'Transaction data: payment amounts, timestamps, customer references', 'Technical data: IP address, browser type, device information', 'Communications: support tickets, emails, and feedback'] },
  { title: '2. How We Use Your Information', list: ['To operate, maintain, and improve the NovaPay platform', 'To process and route UPI payments to your account', 'To verify your identity and comply with KYC/AML regulations', 'To send transactional notifications and account alerts', 'To detect, prevent, and investigate fraud or abuse', 'To comply with legal obligations and regulatory requirements'] },
  { title: '3. Data Sharing', body: 'We do not sell your personal data. We may share data with: (a) regulated payment processors and UPI partners as required to process transactions; (b) government authorities when required by law; (c) third-party service providers (email, hosting, analytics) bound by strict data processing agreements. All third parties are vetted for data security compliance.' },
  { title: '4. Data Security', body: 'We protect your data using AES-256 encryption at rest and TLS 1.3 in transit. Access to sensitive data is restricted to authorized personnel on a need-to-know basis. We perform regular security audits and penetration testing. KYC documents are stored in encrypted, access-controlled storage.' },
  { title: '5. Data Retention', body: 'We retain your account data for the duration of your account plus 7 years as required by Indian financial regulations. KYC documents are retained for 5 years after account closure. Transaction logs are retained for 5 years. You may request deletion of non-regulatory data by contacting us.' },
  { title: '6. Your Rights', list: ['Access: request a copy of the personal data we hold about you', 'Correction: update inaccurate or incomplete information', 'Deletion: request deletion of data not required for regulatory compliance', 'Portability: receive your data in a machine-readable format', 'Objection: opt out of marketing communications at any time'] },
  { title: '7. Cookies', body: 'We use essential cookies to maintain your session and security. We use analytics cookies (with your consent) to understand how the platform is used and improve it. You can control cookie settings through your browser. We do not use third-party advertising cookies.' },
  { title: "8. Children's Privacy", body: "NovaPay is not intended for use by anyone under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided data to us, contact us immediately at privacy@novapay.in." },
  { title: '9. International Transfers', body: 'NovaPay stores data on servers located in India. If any data is processed outside India (e.g., by a cloud provider), we ensure adequate safeguards are in place consistent with applicable Indian data protection laws.' },
  { title: '10. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you via email and in-app notice of material changes. Your continued use of NovaPay after the effective date constitutes acceptance of the revised policy.' },
  { title: '11. Contact & Grievances', body: 'For privacy-related questions or to exercise your rights, contact our Data Protection Officer at privacy@novapay.in. For grievances, you may also write to: NovaPay Technologies Pvt. Ltd., New Delhi, India.' },
];

export default function PrivacyPage() {
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
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: '#0F172A', marginBottom: 10 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>Last updated: March 20, 2026</p>
      </div>

      <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto', padding: '64px 48px 80px' }}>
        <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75, marginBottom: 40, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
          Your privacy matters to us. This Policy explains what data we collect, how we use it, and what rights you have. NovaPay is committed to handling your data with transparency and care.
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>Privacy questions? Email <a href="mailto:privacy@novapay.in" style={{ color: '#2563EB', fontWeight: 600 }}>privacy@novapay.in</a></span>
        </div>
      </div>

      <footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>© 2026 NovaPay Technologies Pvt. Ltd.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Home','/'],['Terms','/terms'],['Refund','/refund'],['Contact','/contact']].map(([l,h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: '#94A3B8' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
