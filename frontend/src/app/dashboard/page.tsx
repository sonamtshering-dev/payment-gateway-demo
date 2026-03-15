'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';

const formatAmount = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

const formatCompact = (paise: number) => {
  const r = paise / 100;
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(1)}Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toFixed(0)}`;
};

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '22px 24px',
      border: '1px solid #e5e7eb',
    }}>
      <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '6px 0 2px' }}>{value}</p>
      {sub && <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{sub}</p>}
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then((res: any) => { if (res.success) setStats(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: '#6b7280', fontSize: 14 }}>Loading dashboard...</p>;
  }

  if (!stats) {
    return <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load stats. Check your connection.</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 24px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard title="Total volume" value={formatCompact(stats.total_volume)} sub={`${stats.total_transactions.toLocaleString()} transactions`} />
        <StatCard title="Today's revenue" value={formatCompact(stats.today_volume)} sub={`${stats.today_transactions} today`} />
        <StatCard title="Success rate" value={`${stats.success_rate.toFixed(1)}%`} sub={`${stats.successful_payments.toLocaleString()} paid`} />
        <StatCard title="Pending" value={stats.pending_payments.toLocaleString()} sub="Active sessions" />
      </div>

      <div style={{
        background: '#fff', borderRadius: 14, padding: 24,
        border: '1px solid #e5e7eb',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Quick actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'View transactions', href: '/dashboard/transactions' },
            { label: 'Manage UPI IDs', href: '/dashboard/settings' },
            { label: 'Configure webhooks', href: '/dashboard/webhooks' },
            { label: 'API documentation', href: '/dashboard/analytics' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{
              padding: '10px 18px', borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 13, fontWeight: 500, color: '#4f46e5', textDecoration: 'none',
              transition: 'all 0.12s',
            }}>{a.label} →</a>
          ))}
        </div>
      </div>
    </div>
  );
}
