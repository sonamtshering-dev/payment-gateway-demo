'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const fmt = (p: number) => `₹${(p/100).toLocaleString('en-IN')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  paid:    { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
  pending: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
  failed:  { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  expired: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

export default function DashboardPage() {
  const { merchant } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/v1/dashboard/stats', { headers: h }).then(r => r.json()),
      fetch('/api/v1/dashboard/subscription/detail', { headers: h }).then(r => r.json()),
      fetch('/api/v1/dashboard/transactions?page=1&limit=5', { headers: h }).then(r => r.json()),
    ]).then(([s, sub, t]) => {
      if (s.success) setStats(s.data);
      if (sub.success && sub.data?.subscription) { setSub(sub.data.subscription); setPlan(sub.data.plan); }
      if (t.success) setTxns(t.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const daysLeft = sub?.expires_at ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)) : null;

  const QUICK = [
    { label: 'Payment Link', icon: '🔗', href: '/dashboard/payments' },
    { label: 'Connect Merchant', icon: '🔌', href: '/dashboard/connect-merchant' },
    { label: 'View Stats', icon: '📊', href: '/dashboard/stats' },
    { label: 'API Docs', icon: '📄', href: '/dashboard/api-docs' },
  ];

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100, overflowX: 'hidden' as const }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800 }}>
            Welcome back, {merchant?.name || 'User'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Here's what's happening with your payments today.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {sub?.status === 'active' ? (
            <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 100 }}>
              ● {plan?.name || 'Active'} Plan
            </span>
          ) : (
            <button onClick={() => router.push('/dashboard/subscription')} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 100, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ⚠ No Active Plan
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Revenue',    value: stats ? fmt(stats.total_volume) : '₹0',                      sub: 'All time',          icon: '💸', iconBg: 'rgba(16,185,129,0.15)' },
          { label: 'Total Payments',   value: stats ? stats.total_transactions.toLocaleString() : '0',     sub: 'All time',          icon: '🛍️', iconBg: 'rgba(99,102,241,0.15)' },
          { label: "Today's Revenue",  value: stats ? fmt(stats.today_volume) : '₹0',                      sub: `${stats?.today_transactions || 0} txns today`, icon: '📈', iconBg: 'rgba(245,158,11,0.15)' },
          { label: 'Success Rate',     value: stats ? `${stats.success_rate.toFixed(1)}%` : '—',           sub: 'Last 30 days',      icon: '🎯', iconBg: 'rgba(139,92,246,0.15)' },
        ].map(c => (
          <div key={c.label} style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{loading ? '—' : c.value}</div>
              <div style={{ fontSize: 11, color: '#4b5563', marginTop: 1 }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: subscription status + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* Subscription status */}
        <div style={{ background: sub?.status === 'active' ? 'rgba(59,130,246,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${sub?.status === 'active' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 16, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>Subscription Status</div>
          {sub?.status === 'active' ? (
            <>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{plan?.name || 'Active Plan'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                {sub.expires_at ? `Expires ${fmtDate(sub.expires_at)}` : 'Never expires'}
                {daysLeft !== null && daysLeft <= 7 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠ {daysLeft} days left</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                <span>QR: {plan?.qr_limit === 0 ? '∞' : plan?.qr_limit || '—'}</span>
                <span>Links: {plan?.link_limit === 0 ? '∞' : plan?.link_limit || '—'}</span>
                <span>API: {plan?.api_limit === 0 ? '∞' : plan?.api_limit || '—'}/day</span>
              </div>
              <button onClick={() => router.push('/dashboard/active-subscription')} style={{ marginTop: 14, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '7px 16px', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                View Details →
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4, color: '#ef4444' }}>No Active Plan</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Purchase a plan to activate gateway access for your merchants.</div>
              <button onClick={() => router.push('/dashboard/subscription')} style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                View Plans →
              </button>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {QUICK.map(q => (
              <button key={q.label} onClick={() => router.push(q.href)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', color: '#dbeafe', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background='rgba(255,255,255,0.03)')}
              >
                <span style={{ fontSize: 16 }}>{q.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>Recent Orders</div>
          <button onClick={() => router.push('/dashboard/transactions')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>View all →</button>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' as const, color: '#4b5563' }}>Loading…</div>
        ) : txns.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' as const }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No transactions yet</div>
            <div style={{ fontSize: 13, color: '#4b5563' }}>Create a payment link or connect a merchant to get started.</div>
          </div>
        ) : txns.map((tx, i) => {
          const s = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
          return (
            <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '14px 22px', borderBottom: i < txns.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b9ab5' }}>{tx.order_id}</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>{fmt(tx.amount)}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(tx.created_at)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, width: 'fit-content' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color }} />{tx.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
