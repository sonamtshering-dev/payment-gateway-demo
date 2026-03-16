'use client';

import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { merchant } = useAuth();

  return (
    <div style={{ padding: '32px', color: '#eef2ff', fontFamily: 'DM Sans, sans-serif' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#eef2ff' }}>
        Welcome back{merchant?.name ? `, ${merchant.name}` : ''}
      </h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Here's what's happening with your payments today.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Revenue', value: '₹0', sub: 'All time' },
          { label: 'Transactions', value: '0', sub: 'This month' },
          { label: 'Success Rate', value: '—', sub: 'Last 30 days' },
          { label: 'Active Links', value: '0', sub: 'Payment links' },
        ].map(card => (
          <div key={card.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 800, color: '#eef2ff', letterSpacing: -1 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No transactions yet</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>Create a payment link or connect a merchant to get started.</div>
      </div>
    </div>
  );
}
