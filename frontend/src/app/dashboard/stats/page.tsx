'use client';
import { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Target, BarChart2, Calendar, Clock, AlertCircle } from 'lucide-react';

const fmt = (p: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p / 100);
const fmtNum = (n: number) => n.toLocaleString('en-IN');

interface Stats {
  total_transactions: number; successful_payments: number;
  failed_payments: number; pending_payments: number;
  total_volume: number; success_rate: number;
  today_transactions: number; today_volume: number;
}

function StatCard({ label, value, sub, icon, iconBg }: any) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, total, color }: any) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{fmtNum(value)} <span style={{ color, fontSize: 11 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function DonutChart({ rate }: { rate: number }) {
  const r = 54; const circ = 2 * Math.PI * r; const filled = (rate / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Success Rate</div>
      <div style={{ position: 'relative' as const, width: 130, height: 130 }}>
        <svg width="130" height="130" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#E2E8F0" strokeWidth="14" />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#2563EB" strokeWidth="14" strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 70 70)" />
        </svg>
        <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{rate.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>success</div>
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

  const inp: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', color: '#0F172A', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .stats-date { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .stats-breakdown { display: grid; grid-template-columns: 1fr auto; gap: 12px; }
        @media (max-width: 600px) { .stats-date { grid-template-columns: 1fr; } .stats-breakdown { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Payment Statistics</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>Track your payment performance and trends</div>
      </div>

      <div className="stats-date">
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>Start Date</label>
          <input type="date" style={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>End Date</label>
          <input type="date" style={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <StatCard label="Total Transactions" value={fmtNum(stats.total_transactions)} sub="All time" icon={<ShoppingCart size={20} color="#2563EB" />} iconBg="#EFF6FF" />
            <StatCard label="Total Revenue" value={fmt(stats.total_volume)} sub="All time revenue" icon={<DollarSign size={20} color="#059669" />} iconBg="#ECFDF5" />
            <StatCard label="Success Rate" value={`${stats.success_rate.toFixed(1)}%`} sub={`${fmtNum(stats.successful_payments)} successful`} icon={<Target size={20} color="#7C3AED" />} iconBg="#F5F3FF" />
            <StatCard label="Avg Transaction" value={stats.total_transactions > 0 ? fmt(Math.round(stats.total_volume / stats.total_transactions)) : '₹0'} sub="Per transaction" icon={<BarChart2 size={20} color="#D97706" />} iconBg="#FFFBEB" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Today', count: `${fmtNum(stats.today_transactions)} txns`, amount: fmt(stats.today_volume), icon: <Calendar size={18} color="#2563EB" />, bg: '#EFF6FF' },
              { label: 'Pending', count: `${fmtNum(stats.pending_payments)} txns`, amount: '—', icon: <Clock size={18} color="#D97706" />, bg: '#FFFBEB' },
              { label: 'Failed', count: `${fmtNum(stats.failed_payments)} txns`, amount: '—', icon: <AlertCircle size={18} color="#DC2626" />, bg: '#FEF2F2' },
            ].map(c => (
              <div key={c.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{c.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{c.count}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Amount</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{c.amount}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="stats-breakdown">
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>Payment Breakdown</div>
              <BreakdownBar label="Successful" value={stats.successful_payments} total={stats.total_transactions} color="#2563EB" />
              <BreakdownBar label="Pending" value={stats.pending_payments} total={stats.total_transactions} color="#D97706" />
              <BreakdownBar label="Failed" value={stats.failed_payments} total={stats.total_transactions} color="#DC2626" />
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DonutChart rate={stats.success_rate} />
            </div>
          </div>
        </>
      ) : <div style={{ textAlign: 'center' as const, padding: 64, color: '#94A3B8' }}>No data available</div>}
    </div>
  );
}
