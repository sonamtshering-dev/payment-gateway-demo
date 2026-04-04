'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
    <defs>
      <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa"/>
        <stop offset="100%" stopColor="#2563eb"/>
      </linearGradient>
      <linearGradient id="ng2" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#93c5fd"/>
        <stop offset="100%" stopColor="#1d4ed8"/>
      </linearGradient>
    </defs>
    <ellipse cx="18" cy="26" rx="11" ry="3" fill="none" stroke="url(#ng2)" strokeWidth="1.5" opacity="0.6"/>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#ng)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 28V8l7 13L22 8v20" stroke="url(#ng2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif" }}>
      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(37,99,235,0.5) !important; background: rgba(37,99,235,0.04) !important; }
        @media (max-width: 480px) {
          .auth-nav-text { display: none !important; }
          .auth-card-inner { padding: 24px 20px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,15,30,0.98)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>Nova<span style={{ color: '#3b82f6' }}>Pay</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="auth-nav-text" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Don't have an account?</span>
          <Link href="/auth/register" style={{ fontSize: 13, color: '#fff', fontWeight: 600, padding: '6px 14px', background: '#2563eb', borderRadius: 6, textDecoration: 'none' }}>Sign up →</Link>
        </div>
      </nav>

      {/* BODY */}
      <div style={{ minHeight: 'calc(100vh - 58px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', letterSpacing: -1.5, marginBottom: 8 }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Sign in to your NovaPay merchant account</p>
          </div>

          <div className="auth-card-inner" style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '11px 14px', color: '#f87171', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 7 }}>Email address</label>
                <input style={inp} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 7 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 52 }} type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 14, height: 14, accentColor: '#2563eb' }} /> Remember me
                </label>
                <span style={{ fontSize: 13, color: '#3b82f6', cursor: 'pointer' }}>Forgot password?</span>
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, background: loading ? 'rgba(255,255,255,0.06)' : '#2563eb', border: 'none', borderRadius: 9, color: loading ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 14, fontFamily: 'inherit' }}>
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '9px 0', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secured with 256-bit encryption
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}