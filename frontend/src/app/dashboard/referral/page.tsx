'use client';
import React, { useEffect, useState } from 'react';
import { Users, Copy, CheckCircle2, TrendingUp, Gift, Tag, UserCheck, DollarSign, Clock, Star, Share2, MessageCircle, Send } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const CHART_DATA = [1240, 1680, 2100, 1850, 2540, 3200];

function LineChart({ data }: { data: number[] }) {
  const W = 500, H = 130, pad = { t: 10, r: 10, b: 30, l: 40 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const max = Math.max(...data), min = Math.min(...data) * 0.8;
  const xOf = (i: number) => pad.l + (i / (data.length - 1)) * iW;
  const yOf = (v: number) => pad.t + iH - ((v - min) / (max - min)) * iH;
  const pts = data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  const area = `M${xOf(0)},${H - pad.b} L${data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' L')} L${xOf(data.length - 1)},${H - pad.b} Z`;
  const yTicks = [0, 1000, 2000, 3000, 4000];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yTicks.map(t => (
        <g key={t}>
          <line x1={pad.l} y1={yOf(t)} x2={W - pad.r} y2={yOf(t)} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3"/>
          <text x={pad.l - 6} y={yOf(t) + 4} textAnchor="end" fontSize="9" fill="#94A3B8">₹{t/1000}K</text>
        </g>
      ))}
      <path d={area} fill="url(#cg)"/>
      <polyline points={pts} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((v, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(v)} r="4" fill="#2563EB" stroke="#fff" strokeWidth="2"/>
      ))}
      {MONTHS.map((m, i) => (
        <text key={m} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94A3B8">{m}</text>
      ))}
    </svg>
  );
}

const TOP_REFERRERS = [
  { rank: 1, name: 'Aman Verma',   earnings: 45230, color: '#D97706', bg: '#FFFBEB' },
  { rank: 2, name: 'Priya Sharma', earnings: 32450, color: '#64748B', bg: '#F1F5F9' },
  { rank: 3, name: 'Rohit Singh',  earnings: 18760, color: '#B45309', bg: '#FEF3C7' },
];

export default function ReferralPage() {
  const [stats, setStats]               = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [copied, setCopied]             = useState(false);
  const [appUrl, setAppUrl]             = useState('');
  const [codeInput, setCodeInput]       = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchStats = () => {
    fetch('/api/v1/dashboard/referral', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setAppUrl(window.location.origin);
    fetchStats();
  }, []);

  const referralCode = stats?.referral_code ?? '—';
  const referralLink = referralCode !== '—' ? `${appUrl}/auth/register?ref=${referralCode}` : '';

  const copy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyCode = async () => {
    if (!codeInput.trim()) return;
    setApplyLoading(true);
    setApplyResult(null);
    try {
      const r = await fetch('/api/v1/dashboard/referral/apply', {
        method: 'POST', headers,
        body: JSON.stringify({ code: codeInput.trim().toUpperCase() }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setApplyResult({ ok: true, msg: d.message || 'Referral code applied successfully!' });
        setCodeInput('');
        fetchStats(); // refresh to update applied_referral state
      } else {
        setApplyResult({ ok: false, msg: d.error || 'Failed to apply code' });
      }
    } catch {
      setApplyResult({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setApplyLoading(false);
    }
  };

  const totalReferrals  = stats?.total_referrals  ?? 0;
  const activeReferrals = stats?.rewarded          ?? 0;
  const totalEarnings   = stats?.total_earnings    ?? 0;
  const pendingEarnings = stats?.pending_earnings  ?? 0;
  const lifetimeEarnings= stats?.lifetime_earnings ?? 0;

  const realReferrals: any[] = stats?.referrals ?? [];
  const appliedReferral       = stats?.applied_referral ?? null;
  const alreadyApplied        = !!appliedReferral;

  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}.00`;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .ref-layout { display: flex; gap: 20px; align-items: flex-start; }
        .ref-main { flex: 1; min-width: 0; }
        .ref-sidebar { width: 280px; flex-shrink: 0; }
        .ref-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .ref-chart-inner { display: flex; gap: 16px; }
        .ref-chart-box { flex: 1; height: 160px; min-width: 0; }
        .ref-chart-aside { width: 200px; background: #F8FAFC; border-radius: 12px; padding: 14px; flex-shrink: 0; }
        .code-input:focus { outline: none; border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
        @media (max-width: 1100px) { .ref-layout { flex-direction: column; align-items: stretch; } .ref-sidebar { width: 100%; } }
        @media (max-width: 800px) { .ref-stats { grid-template-columns: repeat(3, 1fr); } .ref-chart-inner { flex-direction: column; } .ref-chart-aside { width: 100%; } .ref-chart-box { height: 140px; } }
        @media (max-width: 500px) { .ref-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 360px) { .ref-stats { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#2563EB" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Referral Program</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Invite businesses to NovaPay and earn rewards for every successful referral.</div>
          </div>
        </div>
      </div>

      <div className="ref-layout">
        {/* Main column */}
        <div className="ref-main">

          {/* Hero banner */}
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)', border: '1px solid #DBEAFE', borderRadius: 16, padding: '24px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Gift size={28} color="#2563EB" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Earn exciting rewards</div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
                Invite a business to join NovaPay. When they complete a transaction, you earn a <strong>lifetime commission.</strong>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                {[
                  { label: 'You get', value: '20%', sub: 'of our revenue', bg: '#EFF6FF', border: '#DBEAFE', c: '#2563EB' },
                  { label: 'Friend gets', value: '50%', sub: 'off first month', bg: '#F0FDF4', border: '#BBF7D0', c: '#059669' },
                  { label: 'Earning', value: 'Unlimited', sub: 'No cap', bg: '#FFFBEB', border: '#FDE68A', c: '#D97706' },
                ].map(b => (
                  <div key={b.label} style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: 12, padding: '12px 16px', textAlign: 'center' as const, minWidth: 110 }}>
                    <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{b.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: b.c }}>{b.value}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{b.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Your Overview</div>
          <div className="ref-stats" style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Referrals',   value: totalReferrals,        sub: 'All time',         Icon: Users,       iconColor: '#2563EB', iconBg: '#EFF6FF', good: true  },
              { label: 'Active Referrals',  value: activeReferrals,       sub: 'Rewarded',         Icon: UserCheck,   iconColor: '#059669', iconBg: '#ECFDF5', good: true  },
              { label: 'Total Earnings',    value: fmt(totalEarnings),    sub: 'From commissions', Icon: DollarSign,  iconColor: '#D97706', iconBg: '#FFFBEB', good: true  },
              { label: 'Pending Earnings',  value: fmt(pendingEarnings),  sub: 'Awaiting payout',  Icon: Clock,       iconColor: '#7C3AED', iconBg: '#F5F3FF', good: false },
              { label: 'Lifetime Earnings', value: fmt(lifetimeEarnings), sub: 'All time',         Icon: Star,        iconColor: '#0891B2', iconBg: '#F0F9FF', good: true  },
            ].map(s => (
              <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 14px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <s.Icon size={16} color={s.iconColor} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: s.good ? '#059669' : '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {s.good && <TrendingUp size={10} />}{s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Earnings chart */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' as const, gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Earnings Overview</div>
            </div>
            <div className="ref-chart-inner">
              <div className="ref-chart-box"><LineChart data={CHART_DATA} /></div>
              <div className="ref-chart-aside">
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Earnings Breakup</div>
                {[
                  ['This Month', '₹0.00'],
                  ['Last Month', '₹0.00'],
                  ['Total Paid', fmt(totalEarnings)],
                  ['Pending',    fmt(pendingEarnings)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                    <span style={{ color: '#64748B' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Referrals table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Your Referrals</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{realReferrals.length} total</div>
            </div>

            {realReferrals.length === 0 ? (
              <div style={{ padding: '52px 20px', textAlign: 'center' as const }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Users size={24} color="#2563EB" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>No referrals yet</div>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.5 }}>
                  Share your referral link with businesses and start earning commissions.
                </div>
                <button
                  onClick={() => copy(referralLink)}
                  style={{ background: '#2563EB', border: 'none', borderRadius: 10, padding: '10px 22px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Copy size={14} /> Copy Referral Link
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Business / Name', 'Email', 'Joined On', 'Status', 'Rewarded'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {realReferrals.map((r: any, i: number) => (
                      <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${i * 47 + 200},60%,92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: `hsl(${i * 47 + 200},60%,40%)`, flexShrink: 0 }}>
                              {r.name?.charAt(0) ?? '?'}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>{r.email}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' as const }}>{r.joined}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: r.status === 'rewarded' ? '#ECFDF5' : '#FFFBEB', color: r.status === 'rewarded' ? '#059669' : '#D97706', fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 100 }}>
                            {r.status === 'rewarded' ? 'Active' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {r.rewarded
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#059669', fontSize: 12, fontWeight: 600 }}><CheckCircle2 size={13} /> Yes</span>
                            : <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="ref-sidebar">

          {/* ── Your Referral Link ── */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Your Referral Link</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Share your link and start earning</div>

            {/* Code pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <Tag size={14} color="#2563EB" />
              <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, letterSpacing: 2, color: '#2563EB', flex: 1 }}>{referralCode}</span>
              <button onClick={() => copy(referralCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}>
                {copied ? <CheckCircle2 size={15} color="#059669" /> : <Copy size={15} color="#94A3B8" />}
              </button>
            </div>

            {/* Full link — overflow fix: clip the input, fixed-width button */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 10px', overflow: 'hidden' }}>
                <span style={{ fontSize: 11, color: '#2563EB', fontFamily: 'monospace', whiteSpace: 'nowrap' as const, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {referralLink || `${appUrl}/auth/register?ref=${referralCode}`}
                </span>
              </div>
              <button
                onClick={() => copy(referralLink || `${appUrl}/auth/register?ref=${referralCode}`)}
                style={{ width: 72, background: copied ? '#ECFDF5' : '#EFF6FF', border: `1px solid ${copied ? '#A7F3D0' : '#DBEAFE'}`, borderRadius: 8, color: copied ? '#059669' : '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
              >
                {copied ? <><CheckCircle2 size={12} /> Done</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>

            {/* Share buttons — 2×2 grid with real brand SVGs */}
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>Share via</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* WhatsApp */}
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Join NovaPay using my referral link: ' + (referralLink || ''))}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink || '')}&text=${encodeURIComponent('Join NovaPay using my referral link!')}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#26A5E4">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0284C7' }}>Telegram</span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink || '')}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>Facebook</span>
              </button>

              {/* X / Twitter */}
              <button
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join NovaPay using my referral link: ' + (referralLink || ''))}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0F172A">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>X / Twitter</span>
              </button>
            </div>
          </div>

          {/* ── Enter Referral Code ── */}
          <div style={{ background: '#FFFFFF', border: `1.5px solid ${alreadyApplied ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Gift size={16} color={alreadyApplied ? '#059669' : '#2563EB'} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                {alreadyApplied ? 'Referral Applied' : 'Have a Referral Code?'}
              </div>
            </div>

            {alreadyApplied ? (
              <div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
                  You were referred by <strong style={{ color: '#0F172A' }}>{appliedReferral.referrer_name}</strong>. They earn commission from your transactions.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px' }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Code applied successfully</div>
                    <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>Status: {appliedReferral.status === 'rewarded' ? 'Rewarded' : 'Pending'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
                  Enter a referral code from another NovaPay merchant to link their referral.
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: applyResult ? 10 : 0 }}>
                  <input
                    className="code-input"
                    value={codeInput}
                    onChange={e => { setCodeInput(e.target.value.toUpperCase()); setApplyResult(null); }}
                    onKeyDown={e => e.key === 'Enter' && applyCode()}
                    placeholder="e.g. ABCD1234"
                    maxLength={20}
                    style={{
                      flex: 1, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 9,
                      padding: '10px 12px', fontSize: 14, fontFamily: 'monospace', color: '#0F172A',
                      letterSpacing: 1, outline: 'none', transition: 'border-color .15s, box-shadow .15s',
                    }}
                  />
                  <button
                    onClick={applyCode}
                    disabled={applyLoading || !codeInput.trim()}
                    style={{
                      background: applyLoading || !codeInput.trim() ? '#93C5FD' : '#2563EB',
                      border: 'none', borderRadius: 9, padding: '0 16px',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: applyLoading || !codeInput.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const, flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {applyLoading
                      ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Applying…</>
                      : 'Apply'
                    }
                  </button>
                </div>

                {applyResult && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: applyResult.ok ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${applyResult.ok ? '#A7F3D0' : '#FECACA'}`,
                    borderRadius: 9, padding: '10px 12px',
                  }}>
                    {applyResult.ok
                      ? <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                      : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6.5" stroke="#DC2626" strokeWidth="1.2"/><path d="M7 4v3.5M7 9.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    }
                    <span style={{ fontSize: 12, color: applyResult.ok ? '#059669' : '#DC2626', lineHeight: 1.4 }}>
                      {applyResult.msg}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── How it works ── */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>How it works?</div>
            {[
              { n: 1, t: 'Share your link', d: 'Share your unique referral link with businesses.', c: '#2563EB', bg: '#EFF6FF' },
              { n: 2, t: 'They sign up',    d: 'They register and complete KYC.',                 c: '#059669', bg: '#ECFDF5' },
              { n: 3, t: 'They transact',   d: 'When they make a successful transaction.',         c: '#D97706', bg: '#FFFBEB' },
              { n: 4, t: 'You earn',        d: 'You earn 20% of our revenue from their payments.', c: '#7C3AED', bg: '#F5F3FF' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: s.c, flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Top Referrers ── */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Top Referrers</div>
            {TOP_REFERRERS.map(r => (
              <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: r.color, flexShrink: 0 }}>{r.rank}</div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>{r.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{r.earnings.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
