'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const NLogo = () => (
  <img src="/np-logo.jpg" alt="NovaPay" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} />
);

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

function pwStrength(pw: string): { label: string; color: string; width: number } {
  if (pw.length === 0) return { label: '', color: '#E2E8F0', width: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: '#EF4444', width: 25 };
  if (score === 2) return { label: 'Fair', color: '#F59E0B', width: 50 };
  if (score === 3) return { label: 'Good', color: '#3B82F6', width: 75 };
  return { label: 'Strong', color: '#10B981', width: 100 };
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const strength = pwStrength(form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) { setError('Please accept the Terms of Service and Privacy Policy'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Registration failed');
      router.push('/auth/login?registered=1');
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', background: '#FAFAFA',
    color: '#0F172A', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "-apple-system,'Inter','SF Pro Display',sans-serif" }}>
      <style>{`
        ::placeholder { color: #CBD5E1; }
        .auth-inp:focus { border-color: #2563EB !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(37,99,235,.08); outline: none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .reg-wrap { animation: fadeIn .35s ease; }
        @media (max-width: 900px) { .reg-right { display: none !important; } }
      `}</style>

      {/* Nav */}
      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <NLogo />
          <span style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: -.4 }}>NovaPay</span>
        </Link>
        <Link href="/auth/login" style={{ fontSize: 13, color: '#2563EB', fontWeight: 700, padding: '7px 16px', border: '1.5px solid #BFDBFE', borderRadius: 8, background: '#EFF6FF', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>Sign in</Link>
      </nav>

      {/* Body */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: '#F8FAFC' }}>

        {/* Form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 20px 60px' }}>
          <div className="reg-wrap" style={{ width: '100%', maxWidth: 460 }}>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 6, letterSpacing: -.5 }}>
              Create Your <span style={{ color: '#2563EB' }}>Account</span>
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Join NovaPay and start accepting payments for free</p>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px 14px', color: '#DC2626', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft: 42 }} type="text" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft: 42 }} type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone Number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#FAFAFA', flexShrink: 0, fontSize: 14, color: '#0F172A', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                    🇮🇳 +91
                  </div>
                  <input className="auth-inp" style={{ ...inp, flex: 1 }} type="tel" placeholder="10-digit number" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} maxLength={10} />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft: 42, paddingRight: 46 }} type={showPw ? 'text' : 'password'} placeholder="Create a strong password" value={form.password} onChange={e => set('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 3, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${strength.width}%`, background: strength.color, borderRadius: 4, transition: 'width .3s,background .3s' }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: strength.color, textAlign: 'right' as const }}>{strength.label}</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><polyline points="20 6 9 17 4 12"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft: 42, paddingRight: 46, borderColor: form.confirm && form.confirm !== form.password ? '#EF4444' : undefined }} type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
                  <button type="button" onClick={() => setShowConfirm(s => !s)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {form.confirm && form.confirm !== form.password && (
                  <div style={{ fontSize: 12, color: '#EF4444', marginTop: 5 }}>Passwords do not match</div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#374151', cursor: 'pointer', marginBottom: 20, lineHeight: 1.55 }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
                <span>I agree to the{' '}
                  <Link href="/terms" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</Link>
                </span>
              </label>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#93C5FD' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 12px rgba(37,99,235,.25)' }}>
                {loading ? 'Creating Account…' : 'Create Account →'}
              </button>
            </form>

            <p style={{ textAlign: 'center' as const, fontSize: 13, color: '#64748B', marginTop: 20 }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>

        {/* Right panel — desktop only */}
        <div className="reg-right" style={{ width: 340, flexShrink: 0, background: 'linear-gradient(145deg,#1a3a8f 0%,#2563EB 60%,#3b82f6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 36px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

          <svg width="140" height="150" viewBox="0 0 180 200" fill="none" style={{ marginBottom: 28 }}>
            <ellipse cx="90" cy="185" rx="60" ry="10" fill="rgba(0,0,0,.15)"/>
            <rect x="20" y="30" width="140" height="130" rx="16" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
            <rect x="30" y="20" width="120" height="130" rx="14" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.2)" strokeWidth="1"/>
            <circle cx="90" cy="84" r="28" fill="rgba(255,255,255,.2)"/>
            <path d="M78 82 L86 90 L104 70" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center' as const, marginBottom: 10, letterSpacing: -.5 }}>
            Start Accepting<br />Payments Today
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', textAlign: 'center' as const, lineHeight: 1.65, marginBottom: 28 }}>
            Join 500+ merchants using NovaPay to collect UPI payments at zero fees.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, width: '100%' }}>
            {[['⚡','Instant UPI settlement'],['🛡️','Bank-grade security'],['📊','Real-time analytics'],['💰','0% transaction fee']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
                {icon} {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
