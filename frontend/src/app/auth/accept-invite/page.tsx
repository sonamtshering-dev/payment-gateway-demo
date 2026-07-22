'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AcceptInviteInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params?.get('token') || '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) { setError('Enter your name'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/v1/auth/accept-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setDone(true);
        setTimeout(() => router.push('/auth/login'), 2200);
      } else {
        setError(d.error || 'Could not activate your account');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', background: '#FAFAFA',
    color: '#0F172A', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <style>{`.ai-inp:focus{border-color:#2563EB !important;background:#fff !important;box-shadow:0 0 0 3px rgba(37,99,235,.08)}`}</style>
      <div style={{ width: '100%', maxWidth: 430, background: '#fff', borderRadius: 20, padding: '36px 34px', boxShadow: '0 4px 24px rgba(15,23,42,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20 }}>N</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>NovaPay</span>
        </div>

        {!token ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Invalid invite link</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>This link is missing its token. Ask the account owner to send a new invite.</div>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>You&apos;re in!</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Account activated. Taking you to the login page…</div>
          </div>
        ) : (
          <>
            <h1 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 800, color: '#0F172A', letterSpacing: '-.02em' }}>Join the team</h1>
            <p style={{ margin: '0 0 24px', fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
              You&apos;ve been invited to a NovaPay merchant account. Set your name and password to activate your access.
            </p>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            <form onSubmit={submit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Your name</label>
                <input className="ai-inp" style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Password</label>
                <input className="ai-inp" style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Confirm password</label>
                <input className="ai-inp" style={inp} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#93C5FD' : 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Activating…' : 'Activate Account →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
