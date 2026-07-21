'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const NLogo = () => (
  <img src="/np-logo.jpg" alt="NovaPay" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
);

function pwStrength(pw: string): { label: string; score: number; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: '', color: '#E2E8F0' },
    { label: 'Weak', color: '#EF4444' },
    { label: 'Fair', color: '#F59E0B' },
    { label: 'Good', color: '#3B82F6' },
    { label: 'Strong', color: '#10B981' },
    { label: 'Strong', color: '#10B981' },
  ];
  return { ...map[s], score: s };
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  const strength = pwStrength(password);
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!token) { setError('Invalid reset link. Please request a new one.'); return; }
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to reset password');
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ width:64, height:64, borderRadius:20, background:'#FEF2F2', border:'2px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#0F172A', marginBottom:8 }}>Invalid Link</h1>
        <p style={{ fontSize:14, color:'#64748B', marginBottom:24 }}>This reset link is invalid or has expired.</p>
        <Link href="/auth/forgot-password" style={{ display:'inline-block', padding:'12px 24px', borderRadius:10, background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', textDecoration:'none', fontWeight:700, fontSize:14 }}>
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <>
      {done ? (
        <div style={{ textAlign:'center', animation:'fadeIn .4s ease' }}>
          <div style={{ width:80, height:80, borderRadius:24, background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F172A', marginBottom:8 }}>Password Reset!</h1>
          <p style={{ fontSize:14, color:'#64748B', lineHeight:1.6, marginBottom:24 }}>
            Your password has been updated successfully.<br/>Redirecting you to login…
          </p>
          <Link href="/auth/login" style={{ display:'inline-block', padding:'12px 24px', borderRadius:10, background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', textDecoration:'none', fontWeight:700, fontSize:14 }}>
            Sign In Now
          </Link>
        </div>
      ) : (
        <>
          <div style={{ width:64, height:64, borderRadius:20, background:'#EFF6FF', border:'2px solid #BFDBFE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:8, letterSpacing:-.5 }}>Set New Password</h1>
          <p style={{ fontSize:14, color:'#64748B', textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
            Choose a strong password for your NovaPay account.
          </p>

          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', color:'#DC2626', fontSize:13, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 }}>New Password</label>
              <div style={{ position:'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input
                  className="rp-inp"
                  style={{ width:'100%', padding:'13px 44px 13px 44px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#FAFAFA', color:'#0F172A', fontSize:14, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' }}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:0, color:'#94A3B8' }}>
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: strength.score >= i ? strength.color : '#E2E8F0', transition:'background .2s' }} />
                    ))}
                  </div>
                  {strength.label && <div style={{ fontSize:11, color: strength.color, fontWeight:600 }}>{strength.label}</div>}
                </div>
              )}
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 }}>Confirm Password</label>
              <div style={{ position:'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }}><polyline points="20 6 9 17 4 12"/></svg>
                <input
                  className="rp-inp"
                  style={{ width:'100%', padding:'13px 16px 13px 44px', borderRadius:10, border:`1.5px solid ${mismatch ? '#EF4444' : '#E2E8F0'}`, background:'#FAFAFA', color:'#0F172A', fontSize:14, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' }}
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              {mismatch && <div style={{ fontSize:12, color:'#EF4444', marginTop:5 }}>Passwords do not match</div>}
            </div>

            <button type="submit" disabled={loading || mismatch} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: (loading || mismatch) ? '#93C5FD' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', fontSize:15, fontWeight:700, cursor: (loading || mismatch) ? 'not-allowed' : 'pointer', marginBottom:16, fontFamily:'inherit' }}>
              {loading ? 'Updating…' : 'Reset Password →'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:'#64748B' }}>
            Remember your password?{' '}
            <Link href="/auth/login" style={{ color:'#2563EB', fontWeight:700, textDecoration:'none' }}>Sign in</Link>
          </p>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:"-apple-system,'Inter',sans-serif", display:'flex', flexDirection:'column' }}>
      <style>{`::placeholder{color:#CBD5E1} .rp-inp:focus{border-color:#2563EB!important;background:#fff!important;box-shadow:0 0 0 3px rgba(37,99,235,.08)} @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>

      <nav style={{ height:60, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', background:'#fff', borderBottom:'1px solid #E2E8F0' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <NLogo />
          <span style={{ fontSize:18, fontWeight:800, color:'#0F172A', letterSpacing:-.5 }}>NovaPay</span>
        </Link>
        <Link href="/auth/login" style={{ fontSize:13, fontWeight:600, color:'#2563EB', textDecoration:'none', padding:'8px 16px', border:'1.5px solid #DBEAFE', borderRadius:8, background:'#EFF6FF' }}>
          Back to Login
        </Link>
      </nav>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>
        <div style={{ width:'100%', maxWidth:420, animation:'fadeIn .35s ease' }}>
          <Suspense fallback={<div style={{ textAlign:'center', color:'#64748B' }}>Loading…</div>}>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
