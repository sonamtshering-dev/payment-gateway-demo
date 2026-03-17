'use client';
import { useEffect, useState } from 'react';

const fmt = (p: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p / 100);
const fmtNum = (n: number) => n.toLocaleString('en-IN');

interface Stats {
  total_transactions: number; successful_payments: number;
  failed_payments: number; pending_payments: number;
  total_volume: number; success_rate: number;
  today_transactions: number; today_volume: number;
}

function StatCard({ label, value, sub, subColor, icon, iconBg }: any) {
  return (
    <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#dbeafe', letterSpacing: -0.5 }}>{value}</div>
        <div style={{ fontSize: 12, color: subColor || '#4b5563', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, amount, icon, iconBg, subLabel }: any) {
  return (
    <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{label}</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#dbeafe' }}>{value}</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Amount</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#dbeafe' }}>{amount}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#4b5563' }}>{subLabel}</div>
    </div>
  );
}

function BreakdownBar({ label, value, total, color }: any) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#dbeafe' }}>{fmtNum(value)} <span style={{ color: color, fontSize: 11 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function DonutChart({ rate }: { rate: number }) {
  const r = 54; const circ = 2 * Math.PI * r; const filled = (rate / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>Success Rate</div>
      <div style={{ position: 'relative' as const, width: 130, height: 130 }}>
        <svg width="130" height="130" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#3b82f6" strokeWidth="14" strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 70 70)" />
        </svg>
        <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#dbeafe' }}>{rate.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>success</div>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    fetch('/api/v1/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setStats(d.data); }).finally(() => setLoading(false));
  }, []);

  const inp: React.CSSProperties = { background: '#0f1d35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#dbeafe', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>Start Date</label>
          <input type="date" style={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>End Date</label>
          <input type="date" style={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            <StatCard label="Total Transactions" value={fmtNum(stats.total_transactions)} sub="↑ 0% from last month" subColor="#3b82f6" icon="🛍️" iconBg="rgba(99,102,241,0.15)" />
            <StatCard label="Total Revenue" value={fmt(stats.total_volume)} sub="↑ 0% revenue growth" subColor="#3b82f6" icon="₹" iconBg="rgba(16,185,129,0.15)" />
            <StatCard label="Success Rate" value={`${stats.success_rate.toFixed(1)}%`} sub={`${fmtNum(stats.successful_payments)} successful`} icon="🎯" iconBg="rgba(139,92,246,0.15)" />
            <StatCard label="Avg Transaction" value={stats.total_transactions > 0 ? fmt(Math.round(stats.total_volume / stats.total_transactions)) : '₹0'} sub="Per successful txn" icon="📊" iconBg="rgba(245,158,11,0.15)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
            <MiniCard label="Today" value={`${fmtNum(stats.today_transactions)} txns`} amount={fmt(stats.today_volume)} icon="📅" iconBg="rgba(99,102,241,0.15)" subLabel="↑ 0% vs yesterday" />
            <MiniCard label="Pending" value={`${fmtNum(stats.pending_payments)} txns`} amount="₹0" icon="⏳" iconBg="rgba(245,158,11,0.15)" subLabel="⏱ Awaiting confirmation" />
            <MiniCard label="Failed" value={`${fmtNum(stats.failed_payments)} txns`} amount="₹0" icon="❌" iconBg="rgba(239,68,68,0.15)" subLabel="⚠ Monitor and review" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
            <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Payment Breakdown</div>
              <BreakdownBar label="Successful" value={stats.successful_payments} total={stats.total_transactions} color="#3b82f6" />
              <BreakdownBar label="Pending" value={stats.pending_payments} total={stats.total_transactions} color="#f59e0b" />
              <BreakdownBar label="Failed" value={stats.failed_payments} total={stats.total_transactions} color="#ef4444" />
            </div>
            <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DonutChart rate={stats.success_rate} />
            </div>
          </div>
        </>
      ) : <div style={{ textAlign: 'center' as const, padding: 64, color: '#4b5563' }}>No data available</div>}
    </div>
  );
}
