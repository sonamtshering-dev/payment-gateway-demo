'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 16,
        }}>U</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );
}
