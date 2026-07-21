'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const NLogo = () => (
  <img src="/np-logo.jpg" alt="NovaPay" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} />
);

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab]           = useState<'password' | 'otp'>('password');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [otpSent, setOtpSent]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem('upay_remember', '1');
      router.push('/dashboard');
    } catch (err: any) {
      const msg: string = err.message || '';
      if (/host=|sqlstate|unavailable|service/i.test(msg)) {
        setError('Temporary issue — please try again in a moment.');
      } else {
        setError(msg || 'Sign in failed. Check your credentials.');
      }
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setOtpLoading(true); setError('');
    await new Promise(r => setTimeout(r, 1000));
    setOtpSent(true); setOtpLoading(false);
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', background: '#FAFAFA',
    color: '#0F172A', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "-apple-system,'Inter','SF Pro Display',sans-serif" }}>
      <style>{`
        ::placeholder { color: #CBD5E1; }
        .auth-inp:focus { border-color: #2563EB !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(37,99,235,.08); outline: none; }
        .tab-btn { flex:1;padding:11px;border:none;background:none;font-size:14px;font-weight:600;cursor:pointer;border-bottom:2.5px solid transparent;transition:all .15s;font-family:inherit;color:#64748B; }
        .tab-btn.active { color:#2563EB;border-bottom-color:#2563EB; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .auth-form-wrap { animation: fadeIn .35s ease; }
        .security-badge { display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;font-size:12px;color:rgba(255,255,255,.9);font-weight:500; }
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Mobile: stack vertically, show top nav */
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right {
            background: #F8FAFC !important;
            padding: 0 !important;
            align-items: stretch !important;
          }
          .auth-mobile-nav { display: flex !important; }
          .auth-form-wrap {
            max-width: 100% !important;
            padding: 24px 20px 40px !important;
          }
        }
        @media (min-width: 769px) {
          .auth-mobile-nav { display: none !important; }
        }
      `}</style>

      {/* ── LEFT PANEL (desktop only) ── */}
      <div className="auth-left" style={{
        width: '45%', flexShrink: 0,
        background: 'linear-gradient(145deg,#1a3a8f 0%,#2563EB 55%,#3b82f6 100%)',
        display: 'flex', flexDirection: 'column', padding: '48px 48px 40px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', marginBottom:'auto' }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <NLogo />
          </div>
          <span style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:-.5 }}>NovaPay</span>
        </Link>

        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="190" height="210" viewBox="0 0 200 220" fill="none">
            <ellipse cx="100" cy="200" rx="70" ry="12" fill="rgba(0,0,0,.15)"/>
            <path d="M100 10 L170 40 L170 110 Q170 165 100 200 Q30 165 30 110 L30 40 Z" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.3)" strokeWidth="2"/>
            <path d="M100 30 L155 55 L155 110 Q155 155 100 185 Q45 155 45 110 L45 55 Z" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
            <circle cx="100" cy="110" r="32" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.4)" strokeWidth="2"/>
            <path d="M86 110 L95 120 L116 98" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:28, fontWeight:800, color:'#fff', marginBottom:8, letterSpacing:-.5 }}>Welcome <span style={{ color:'#93C5FD' }}>Back</span></h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.7)', lineHeight:1.6 }}>Login to your NovaPay merchant account</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[['🏦','Bank-level Security'],['🔒','256-bit SSL Encryption'],['✅','PCI DSS Compliant']].map(([icon,text]) => (
            <div key={text} className="security-badge">{icon} {text}</div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-right" style={{ flex:1, background:'#F8FAFC', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>

        {/* Mobile top nav */}
        <div className="auth-mobile-nav" style={{ width:'100%', padding:'0 20px', height:60, borderBottom:'1px solid #E2E8F0', background:'#fff', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <NLogo />
            <span style={{ fontSize:17, fontWeight:800, color:'#0F172A', letterSpacing:-.3 }}>NovaPay</span>
          </Link>
          <Link href="/auth/register" style={{ fontSize:13, color:'#2563EB', fontWeight:700, padding:'7px 14px', border:'1.5px solid #BFDBFE', borderRadius:8, background:'#EFF6FF' }}>Sign up</Link>
        </div>

        <div className="auth-form-wrap" style={{ width:'100%', maxWidth:420, padding:'32px 24px' }}>

          <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'10px 14px', marginBottom:24, display:'flex', alignItems:'center', gap:8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span style={{ fontSize:12, color:'#1D4ED8', fontWeight:600 }}>Secure & Trusted Login</span>
          </div>

          <h1 style={{ fontSize:24, fontWeight:800, color:'#0F172A', marginBottom:6, letterSpacing:-.5 }}>Sign in to NovaPay</h1>
          <p style={{ fontSize:14, color:'#64748B', marginBottom:24 }}>Enter your credentials to access your account</p>

          <div style={{ display:'flex', borderBottom:'1.5px solid #E2E8F0', marginBottom:24 }}>
            <button className={`tab-btn${tab==='password'?' active':''}`} onClick={()=>setTab('password')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginRight:5,verticalAlign:'middle'}}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Login
            </button>
            <button className={`tab-btn${tab==='otp'?' active':''}`} onClick={()=>setTab('otp')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginRight:5,verticalAlign:'middle'}}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Login with OTP
            </button>
          </div>

          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', color:'#DC2626', fontSize:13, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {tab === 'password' ? (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 }}>Email</label>
                <div style={{ position:'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft:42 }} type="email" placeholder="Enter your email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
              </div>

              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Password</label>
                  <Link href="/auth/forgot-password" style={{ fontSize:13, color:'#2563EB', fontWeight:600, textDecoration:'none' }}>Forgot Password?</Link>
                </div>
                <div style={{ position:'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft:42, paddingRight:46 }} type={showPw?'text':'password'} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required />
                  <button type="button" onClick={()=>setShowPw(s=>!s)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94A3B8', cursor:'pointer', display:'flex', alignItems:'center', padding:0 }}>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151', cursor:'pointer', userSelect:'none' as const }}>
                  <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{ width:16, height:16, accentColor:'#2563EB', cursor:'pointer' }} />
                  Remember me
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ color:'#059669', fontWeight:600 }}>Secure Login</span>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: loading ? '#93C5FD' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', fontSize:15, fontWeight:700, cursor: loading ? 'wait' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', boxShadow: loading ? 'none' : '0 4px 12px rgba(37,99,235,.25)' }}>
                {loading ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:'spin .8s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>Signing in…</>
                ) : 'Login to Dashboard →'}
              </button>
            </form>
          ) : (
            <div>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 }}>Email</label>
                <div style={{ position:'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input className="auth-inp" style={{ ...inp, paddingLeft:42 }} type="email" placeholder="Enter your email" value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
              </div>
              {!otpSent ? (
                <button onClick={handleSendOTP} disabled={otpLoading} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:16, fontFamily:'inherit' }}>
                  {otpLoading ? 'Sending OTP…' : 'Send OTP →'}
                </button>
              ) : (
                <>
                  <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'11px 14px', color:'#166534', fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    OTP sent to {email}
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 }}>Enter OTP</label>
                    <input className="auth-inp" style={{ ...inp, letterSpacing:'0.3em', fontSize:20, textAlign:'center', fontWeight:700 }} type="text" placeholder="· · · · · ·" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} />
                  </div>
                  <button style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:16, fontFamily:'inherit' }}>
                    Verify OTP →
                  </button>
                </>
              )}
              <p style={{ fontSize:12, color:'#94A3B8', textAlign:'center' as const }}>OTP feature coming soon.</p>
            </div>
          )}

          <p style={{ textAlign:'center' as const, fontSize:13, color:'#64748B', marginTop:20 }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" style={{ color:'#2563EB', fontWeight:700, textDecoration:'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
