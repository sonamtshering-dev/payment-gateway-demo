'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      if (res.success && res.data) {
        localStorage.setItem('upay_access_token', res.data.access_token);
        localStorage.setItem('upay_refresh_token', res.data.refresh_token);
        api.setToken(res.data.access_token);
        router.push('/dashboard');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Sign in to your merchant dashboard</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626',
          }}>{error}</div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 14, outline: 'none', marginBottom: 24, boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          Don't have an account?{' '}
          <Link href="/auth/register" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
