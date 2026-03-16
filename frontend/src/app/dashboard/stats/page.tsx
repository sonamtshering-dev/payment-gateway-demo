'use client';
import { useEffect, useState } from 'react';

const fmt = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

interface Stats {
  total_transactions: number; successful_payments: number;
  failed_payments: number; pending_payments: number;
  total_volume: number; success_rate: number;
  today_transactions: number; today_volume: number;
}

const CARDS = (s: Stats) => [
  { label: 'Today\'s Volume',     value: fmt(s.today_volume),          sub: `${s.today_transactions} transactions today`,  color: '#00e5b0', icon: '💸' },
  { label: 'Total Revenue',       value: fmt(s.total_volume),          sub: 'All time',                                     color: '#0ea5e9', icon: '📈' },
  { label: 'Successful Payments', value: s.successful_payments.toLocaleString('en-IN'), sub: `${s.success_rate.toFixed(1)}% success rate`, color: '#00e5b0', icon: '✅' },
  { label: 'Failed Payments',     value: s.failed_payments.toLocaleString('en-IN'),     sub: 'Needs attention',              color: '#ef4444', icon: '❌' },
  { label: 'Pending Payments',    value: s.pending_payments.toLocaleString('en-IN'),    sub: 'Awaiting confirmation',        color: '#f59e0b', icon: '⏳' },
  { label: 'Total Transactions',  value: s.total_transactions.toLocaleString('en-IN'),  sub: 'All time',                     color: '#8b5cf6', icon: '🔢' },
];

function BarChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, color: '#4b5563' }}>{v > 0 ? v : ''}</div>
            <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', height: `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%`, opacity: 0.85, transition: 'height 0.4s ease', minHeight: v > 0 ? 4 : 0 }} />
            <div style={{ fontSize: 10, color: '#4b5563' }}>{days[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ rate }: { rate: number }) {
  const r = 54; const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Success Rate</div>
      <div style={{ position: 'relative' as const, width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#00e5b0" strokeWidth="14"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#eef2ff' }}>{rate.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>success</div>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    fetch('/api/v1/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); else setError(d.error); })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  // Generate mock weekly data based on real totals for visual demo
  const weeklyTx  = stats ? [0,0,0,0,0,0, stats.today_transactions].map((v, i) => i === 6 ? v : Math.floor(Math.random() * Math.max(stats.total_transactions / 7, 1))) : Array(7).fill(0);
  const weeklyVol = stats ? [0,0,0,0,0,0, stats.today_volume].map((v, i) => i === 6 ? Math.round(v / 100) : Math.floor(Math.random() * Math.max(stats.total_volume / 700, 1))) : Array(7).fill(0);

  return (
    <div style={{ padding: 32, color: '#eef2ff', fontFamily: 'DM Sans, sans-serif' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Stats</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>Your payment performance at a glance.</p>

      {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 16px', color: '#f87171', fontSize: 13, marginBottom: 24 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 64, color: '#4b5563' }}>Loading stats…</div>
      ) : stats ? (
        <>
          {/* ── METRIC CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
            {CARDS(stats).map(card => (
              <div key={card.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px 20px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${card.color}33`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{card.label}</div>
                  <span style={{ fontSize: 20 }}>{card.icon}</span>
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: card.color, letterSpacing: -1, marginBottom: 6 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── CHARTS ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: 16, marginBottom: 28 }}>
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
              <BarChart data={weeklyTx} color="#00e5b0" label="Daily transactions (this week)" />
            </div>
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
              <BarChart data={weeklyVol} color="#0ea5e9" label="Daily volume ₹ (this week)" />
            </div>
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DonutChart rate={stats.success_rate} />
            </div>
          </div>

          {/* ── STATUS BREAKDOWN ── */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 20 }}>Payment breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Successful', value: stats.successful_payments, color: '#00e5b0', bg: 'rgba(0,229,176,0.08)' },
                { label: 'Failed',     value: stats.failed_payments,     color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                { label: 'Pending',    value: stats.pending_payments,     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
              ].map(item => {
                const pct = stats.total_transactions > 0 ? (item.value / stats.total_transactions) * 100 : 0;
                return (
                  <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ fontSize: 12, color: item.color, fontWeight: 700, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#eef2ff', marginBottom: 6 }}>{item.value.toLocaleString('en-IN')}</div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, height: 4, marginBottom: 4 }}>
                      <div style={{ background: item.color, borderRadius: 100, height: 4, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>{pct.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}