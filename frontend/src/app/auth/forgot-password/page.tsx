'use client';
import { useState } from 'react';
import Link from 'next/link';

const NLogo = () => (
  <img src="/np-logo.jpg" alt="NovaPay" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
);

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to send reset email');
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:"-apple-system,'Inter',sans-serif", display:'flex', flexDirection:'column' }}>
      <style>{`::placeholder{color:#CBD5E1} .fp-inp:focus{border-color:#2563EB!important;background:#fff!important;box-shadow:0 0 0 3px rgba(37,99,235,.08)} @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>

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

          {!sent ? (
            <>
              <div style={{ width:64, height:64, borderRadius:20, background:'#EFF6FF', border:'2px solid #BFDBFE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <h1 style={{ fontSize:26, fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:8, letterSpacing:-.5 }}>Forgot Password?</h1>
              <p style={{ fontSize:14, color:'#64748B', textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
                No worries! Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', color:'#DC2626', fontSize:13, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 }}>Email Address</label>
                  <div style={{ position:'relative' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input className="fp-inp" style={{ width:'100%', padding:'13px 16px 13px 44px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#FAFAFA', color:'#0F172A', fontSize:14, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit', transition:'all .15s' }} type="email" placeholder="Enter your email address" value={email} onChange={e=>setEmail(e.target.value)} required />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: loading ? '#93C5FD' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', fontSize:15, fontWeight:700, cursor: loading ? 'wait' : 'pointer', marginBottom:16, fontFamily:'inherit' }}>
                  {loading ? 'Sending…' : 'Send Reset Link →'}
                </button>
              </form>

              <p style={{ textAlign:'center', fontSize:13, color:'#64748B' }}>
                Remember your password?{' '}
                <Link href="/auth/login" style={{ color:'#2563EB', fontWeight:700, textDecoration:'none' }}>Sign in</Link>
              </p>
            </>
          ) : (
            <div style={{ textAlign:'center', animation:'fadeIn .4s ease' }}>
              <div style={{ width:80, height:80, borderRadius:24, background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h1 style={{ fontSize:26, fontWeight:800, color:'#0F172A', marginBottom:8, letterSpacing:-.5 }}>Check Your Email</h1>
              <p style={{ fontSize:14, color:'#64748B', lineHeight:1.7, marginBottom:8 }}>
                We sent a password reset link to
              </p>
              <p style={{ fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:28 }}>{email}</p>
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, padding:'16px', marginBottom:24, fontSize:13, color:'#64748B', lineHeight:1.6 }}>
                Click the link in the email to reset your password. The link expires in <strong>30 minutes</strong>.
              </div>
              <button onClick={()=>setSent(false)} style={{ width:'100%', padding:'13px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', color:'#374151', fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:12, fontFamily:'inherit' }}>
                Resend Email
              </button>
              <Link href="/auth/login" style={{ display:'block', textAlign:'center', fontSize:13, color:'#2563EB', fontWeight:700, textDecoration:'none' }}>
                ← Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
