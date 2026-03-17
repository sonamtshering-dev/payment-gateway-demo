'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Registration failed');
      router.push('/auth/login');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#dbeafe', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'DM Sans, sans-serif' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginBottom: 8 };

  return (
    <div style={{ minHeight: '100vh', background: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
      <nav style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 100, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6vw', background: 'rgba(2,8,23,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'Syne, sans-serif' }}>N</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#dbeafe' }}>NovaPay</span>
        </Link>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Home','Features','Pricing','Contact'].map(l => <Link key={l} href="/" style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{l}</Link>)}
        </div>
        <Link href="/auth/login" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 10, padding: '9px 22px', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'Syne, sans-serif' }}>Login</Link>
      </nav>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '20px 20px' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 36 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, color: '#93c5fd', marginBottom: 10, letterSpacing: -1 }}>Create account</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>Already have an account? <Link href="/auth/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link></p>
          </div>

          <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '36px 32px' }}>
            {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inp} placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Email address <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inp} type="email" placeholder="Enter your email" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' as const }}>
                  <input style={{ ...inp, paddingRight: 48 }} type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>{showPw ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={lbl}>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inp} type="password" placeholder="Repeat password" value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px 0', background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 12, color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 24px rgba(29,78,216,0.35)', marginBottom: 16 }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                🔒 Secured with 256-bit encryption
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
