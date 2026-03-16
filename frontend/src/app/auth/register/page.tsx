'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
    fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8f9fc', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20,
        padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 16,
          }}>U</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Create account</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Start accepting UPI payments in minutes</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Business name
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Xenpai Store" required style={inputStyle} />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Email
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com" required style={inputStyle} />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Password
          </label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 characters" required style={inputStyle} />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Confirm password
          </label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••" required style={{ ...inputStyle, marginBottom: 24 }} />

          <button
            type="submit"
            disabled={loading || !name || !email || !password || !confirm}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}