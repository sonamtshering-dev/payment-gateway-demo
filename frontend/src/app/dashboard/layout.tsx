'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/transactions', label: 'Transactions', icon: '💳' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: '🔗' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [merchantName, setMerchantName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    api.setToken(token);
    api.getProfile()
      .then((res: any) => {
        if (res.success && res.data) {
          setMerchantName(res.data.name || 'Merchant');
        } else {
          router.replace('/auth/login');
        }
      })
      .catch(() => router.replace('/auth/login'));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('upay_access_token');
    localStorage.removeItem('upay_refresh_token');
    api.clearToken();
    router.replace('/auth/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#f8f9fc' }}>
      {/* Sidebar */}
      <aside style={{
        width: 250, background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh',
      }}>
        <div style={{ padding: '22px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 15,
            }}>U</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>UPay</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#6366f1',
              background: '#eef2ff', padding: '2px 6px', borderRadius: 4,
            }}>GATEWAY</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 9, marginBottom: 3,
                textDecoration: 'none', fontSize: 14,
                fontWeight: active ? 600 : 450,
                background: active ? '#eef2ff' : 'transparent',
                color: active ? '#4f46e5' : '#6b7280',
                transition: 'all 0.12s',
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '14px 10px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, color: '#6366f1',
            }}>{merchantName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {merchantName}
              </p>
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: 16, padding: 4,
            }} title="Logout">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 250, padding: '28px 32px' }}>
        {children}
      </main>
    </div>
  );
}
