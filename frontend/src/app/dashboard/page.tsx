'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Activity, TrendingUp, CheckCircle,
  Package, Zap,
} from 'lucide-react';

const fmt = (p: number) => `₹${(p / 100).toLocaleString('en-IN')}`;
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: '#ECFDF5', color: '#059669', label: 'Paid'    },
  pending: { bg: '#FFFBEB', color: '#D97706', label: 'Pending' },
  failed:  { bg: '#FEF2F2', color: '#DC2626', label: 'Failed'  },
  expired: { bg: '#F8FAFF', color: '#94A3B8', label: 'Expired' },
};

const C = {
  bg:      '#F1F5FB',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  text2:   '#475569',
  text3:   '#94A3B8',
  blue:    '#2563EB',
  blue50:  '#EFF6FF',
  blue100: '#DBEAFE',
  blue700: '#1D4ED8',
  green:   '#059669',
  greenBg: '#ECFDF5',
  red:     '#DC2626',
  redBg:   '#FEF2F2',
  amber:   '#D97706',
  amberBg: '#FFFBEB',
  shadow:  '0 1px 3px rgba(15,23,42,.05),0 1px 2px rgba(15,23,42,.04)',
} as const;

const STAT_CARDS = [
  {
    key: 'volume',
    label: 'Total Revenue',
    sub: 'All time',
    icon: DollarSign,
    iconBg: C.blue50,
    iconColor: C.blue,
  },
  {
    key: 'transactions',
    label: 'Total Payments',
    sub: 'All time',
    icon: Activity,
    iconBg: C.blue50,
    iconColor: C.blue,
  },
  {
    key: 'today',
    label: "Today's Revenue",
    sub: 'today',
    icon: TrendingUp,
    iconBg: C.greenBg,
    iconColor: C.green,
  },
  {
    key: 'rate',
    label: 'Success Rate',
    sub: 'Last 30 days',
    icon: CheckCircle,
    iconBg: C.greenBg,
    iconColor: C.green,
  },
];

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  boxShadow: C.shadow,
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
      fetch('/api/v1/dashboard/transactions?page=1&limit=8', { headers: h }).then(r => r.json()),
    ]).then(([s, sd, t]) => {
      if (s.success) setStats(s.data);
      if (sd.success && sd.data?.subscription) {
        setSub(sd.data.subscription);
        setPlan(sd.data.plan);
      }
      if (t.success) setTxns(t.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const daysLeft = sub?.expires_at
    ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const statValues: Record<string, string> = {
    volume:       stats ? fmt(stats.total_volume) : '—',
    transactions: stats ? stats.total_transactions.toLocaleString('en-IN') : '—',
    today:        stats ? fmt(stats.today_volume) : '—',
    rate:         stats ? `${stats.success_rate.toFixed(1)}%` : '—',
  };
  const todaySub = stats ? `${stats.today_transactions} txns today` : 'today';

  return (
    <div style={{ color: C.text, fontFamily: 'inherit', maxWidth: 1200 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .ov-txn-row:hover { background: #F8FAFF !important; }
        .ov-quick-btn:hover { background: #F8FAFF !important; }
        .ov-link-btn:hover { opacity: .8; }

        /* Layout grid */
        .ov-grid { display: grid; grid-template-columns: 1fr 280px; gap: 14px; }
        .ov-stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }

        /* Table: show on desktop, hide on mobile */
        .ov-tbl-wrap { display: block; overflow-x: auto; }
        .ov-card-wrap { display: none; flex-direction: column; gap: 8px; }

        @media (max-width: 1024px) {
          .ov-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .ov-stat-row { grid-template-columns: repeat(2,1fr); }
          .ov-tbl-wrap { display: none; }
          .ov-card-wrap { display: flex; }
        }
        @media (max-width: 380px) {
          .ov-stat-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.04em', color: C.text }}>
            Overview
          </div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 2 }}>
            Welcome back, <span style={{ color: C.blue, fontWeight: 600 }}>{merchant?.name || 'there'}</span>. Here&apos;s what&apos;s happening today.
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/transactions')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.01em', fontFamily: 'inherit' }}
        >
          View All Transactions
        </button>
      </div>

      {/* Stat cards */}
      <div className="ov-stat-row" style={{ marginBottom: 14 }}>
        {STAT_CARDS.map(s => {
          const Icon = s.icon;
          const val = s.key === 'today' ? statValues.today : statValues[s.key];
          const sub = s.key === 'today' ? todaySub : s.sub;
          return (
            <div key={s.key} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon size={16} color={s.iconColor} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.text3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.05em', margin: '2px 0 2px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, overflowWrap: 'break-word' }}>
                  {loading ? <span style={{ color: C.text3 }}>—</span> : val}
                </div>
                <div style={{ fontSize: 10.5, color: C.text3 }}>{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="ov-grid">

        {/* Left: Recent Transactions */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px 11px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.02em' }}>Recent Transactions</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'np-blink 2s infinite' }} />
            </div>
            <button
              onClick={() => router.push('/dashboard/transactions')}
              className="ov-link-btn"
              style={{ background: 'none', border: 'none', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              View all
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.text3 }}>
              <div style={{ width: 22, height: 22, border: `2px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
              Loading...
            </div>
          ) : txns.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.text3 }}>
              <Activity size={32} style={{ margin: '0 auto 10px', opacity: .3 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>No transactions yet</div>
              <div style={{ fontSize: 13 }}>Create a payment link to get started.</div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="ov-tbl-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {['Order', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '9px 16px 7px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((tx, i) => {
                      const s = STATUS_MAP[tx.status] || STATUS_MAP.pending;
                      return (
                        <tr key={tx.id} className="ov-txn-row" style={{ borderBottom: i < txns.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background .1s' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{tx.order_id}</div>
                            <div style={{ fontSize: 10.5, color: C.text3, fontFamily: 'monospace' }}>{tx.id?.slice(0, 12)}...</div>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(tx.amount)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                              {s.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontSize: 12, color: C.text2 }}>{fmtDate(tx.created_at)}</div>
                            <div style={{ fontSize: 10.5, color: C.text3 }}>{fmtTime(tx.created_at)}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="ov-card-wrap" style={{ padding: '10px 12px' }}>
                {txns.map(tx => {
                  const s = STATUS_MAP[tx.status] || STATUS_MAP.pending;
                  return (
                    <div key={tx.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{tx.order_id}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
                          {s.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(tx.amount)}</span>
                        <span style={{ fontSize: 11, color: C.text3 }}>{fmtDate(tx.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Subscription status */}
          {sub?.status === 'active' ? (
            <div style={{ ...card, padding: '16px', borderColor: C.blue100, background: C.blue50 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.text3, marginBottom: 10 }}>
                Subscription
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Package size={16} color={C.blue} />
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '-.02em' }}>{plan?.name || 'Active Plan'}</span>
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 10 }}>
                {sub.expires_at ? `Expires ${fmtDate(sub.expires_at)}` : 'Never expires'}
                {daysLeft !== null && daysLeft <= 7 && (
                  <span style={{ color: C.amber, marginLeft: 6, fontWeight: 700 }}>{daysLeft}d left</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: C.text2, marginBottom: 12, flexWrap: 'wrap' } as React.CSSProperties}>
                <span>QR: <b style={{ color: C.text }}>{plan?.qr_limit === 0 ? 'Unlimited' : plan?.qr_limit || '—'}</b></span>
                <span>Links: <b style={{ color: C.text }}>{plan?.link_limit === 0 ? 'Unlimited' : plan?.link_limit || '—'}</b></span>
              </div>
              <button
                onClick={() => router.push('/dashboard/active-subscription')}
                style={{ background: C.blue, border: 'none', borderRadius: 7, padding: '7px 13px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                View Details
              </button>
            </div>
          ) : (
            /* Premium "no plan" card */
            <div style={{
              borderRadius: 14,
              background: 'linear-gradient(145deg, #0F172A 0%, #1E3A5F 60%, #1a3358 100%)',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Subtle grid texture */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.04,
                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                pointerEvents: 'none',
              }} />
              {/* Glow accent */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 120, height: 120, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(37,99,235,0.25)',
                  border: '1px solid rgba(37,99,235,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Zap size={17} color="#60A5FA" fill="#60A5FA" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-.03em', marginBottom: 6 }}>
                  Unlock Full Access
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, marginBottom: 18 }}>
                  Choose a plan to start accepting UPI payments and access all gateway features.
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['0% Fees', 'Instant UPI', 'Analytics'].map(f => (
                    <span key={f} style={{
                      fontSize: 10.5, fontWeight: 600, color: '#60A5FA',
                      background: 'rgba(37,99,235,0.15)',
                      border: '1px solid rgba(37,99,235,0.25)',
                      borderRadius: 5, padding: '3px 8px',
                    }}>{f}</span>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/dashboard/subscription')}
                  style={{
                    width: '100%', padding: '10px', border: 'none', borderRadius: 9,
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '-.01em',
                    boxShadow: '0 2px 12px rgba(37,99,235,0.4)',
                  }}
                >
                  View Plans →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
