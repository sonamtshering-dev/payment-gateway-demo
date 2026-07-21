'use client';
import { useState } from 'react';
import Link from 'next/link';

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CHANNELS = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label: 'Email Support', value: 'support@novapay.in', sub: 'Response within 24 hours' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.37 10.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>, label: 'Phone', value: '+91 11 4567 8900', sub: 'Mon–Fri, 10am–6pm IST' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Office', value: 'New Delhi, India', sub: 'NovaPay Technologies Pvt. Ltd.' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ background: '#fff', color: '#0F172A', fontFamily: "-apple-system,'Inter','Helvetica Neue',sans-serif", minHeight: '100vh' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; color: inherit; }
        .ci:focus { border-color: #2563EB !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(37,99,235,.08) !important; outline: none; }
        ::placeholder { color: #CBD5E1; }
        @media (max-width: 768px) { nav { padding: 0 20px !important; } .hero-pad { padding: 48px 20px !important; } .grid-2 { grid-template-columns: 1fr !important; } .section-pad { padding: 48px 20px !important; } }
      `}</style>
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

      <div className="hero-pad" style={{ background: 'linear-gradient(180deg,#EFF6FF,#fff)', borderBottom: '1px solid #E2E8F0', padding: '56px 48px', textAlign: 'center' as const }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '3px 12px', letterSpacing: '.05em', marginBottom: 14 }}>CONTACT US</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: '#0F172A', marginBottom: 12 }}>We'd love to hear from you</h1>
        <p style={{ fontSize: 16, color: '#64748B', maxWidth: 420, margin: '0 auto', lineHeight: 1.65 }}>Questions, feedback, or partnership enquiries — our team typically responds within one business day.</p>
      </div>

      <div className="section-pad" style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 48px' }}>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 40, alignItems: 'start' }}>

          {/* CHANNELS */}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 24, letterSpacing: -0.5 }}>Get in touch</h2>
            {CHANNELS.map(ch => (
              <div key={ch.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ch.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 4 }}>{ch.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{ch.value}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{ch.sub}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 28, padding: '18px 20px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 6 }}>Fast response guarantee</div>
              <div style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>All support emails are responded to within 24 hours on business days. Urgent payment issues are escalated within 2 hours.</div>
            </div>
          </div>

          {/* FORM */}
          <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 20, padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,.05)' }}>
            {sent ? (
              <div style={{ textAlign: 'center' as const, padding: '40px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Message sent!</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65, marginBottom: 24 }}>We've received your message and will get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setForm({ name:'', email:'', subject:'', message:'' }); }} style={{ padding: '10px 22px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>Send another message</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 24, letterSpacing: -0.3 }}>Send us a message</h2>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    {[['name','Full Name','Your name'],['email','Email Address','your@email.com']].map(([key, label, ph]) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
                        <input className="ci" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FAFAFA', color: '#0F172A', fontSize: 14, fontFamily: 'inherit', transition: 'all .15s' }} type={key === 'email' ? 'email' : 'text'} placeholder={ph} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Subject</label>
                    <input className="ci" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FAFAFA', color: '#0F172A', fontSize: 14, fontFamily: 'inherit' }} type="text" placeholder="What is this about?" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                  </div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Message</label>
                    <textarea className="ci" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FAFAFA', color: '#0F172A', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' as const, minHeight: 120 }} placeholder="Tell us how we can help..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
                  </div>
                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: loading ? '#93C5FD' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                    {loading ? 'Sending…' : 'Send Message →'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <footer style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>© 2026 NovaPay Technologies Pvt. Ltd.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Home','/'],['Privacy','/privacy'],['Terms','/terms'],['Refund','/refund']].map(([l,h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: '#94A3B8' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
