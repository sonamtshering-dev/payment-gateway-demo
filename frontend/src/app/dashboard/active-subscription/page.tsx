'use client';
import { useEffect, useState } from 'react';

interface Plan {
  id: string; name: string; price: number; billing_cycle: string;
  qr_limit: number; link_limit: number; api_limit: number; features: string[];
}
interface Sub {
  id: string; plan_id: string; status: string;
  started_at: string; expires_at?: string;
}
interface Usage {
  qr_used: number; links_used: number; api_used_today: number;
  payments_total: number; revenue_total: number;
}

const fmt = (p: number) => p === 0 ? 'Free' : `₹${(p/100).toLocaleString('en-IN')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtRev = (p: number) => `₹${(p/100).toLocaleString('en-IN')}`;

function UsageBar({ used, limit, label, color }: { used: number; limit: number; label: string; color: string }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isUnlimited = limit === 0;
  const isHigh = pct >= 80;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: isUnlimited ? '#3b82f6' : isHigh ? '#ef4444' : 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
          {isUnlimited ? '∞ Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: isHigh ? '#ef4444' : color, transition: 'width 0.6s ease' }} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.28)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function ActiveSubscriptionPage() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/v1/dashboard/subscription/detail', { headers }).then(r => r.json()),
      fetch('/api/v1/dashboard/stats', { headers }).then(r => r.json()),
    ]).then(([subRes, statsRes]) => {
      if (subRes.success && subRes.data?.subscription) {
        setSub(subRes.data.subscription);
        setPlan(subRes.data.plan || null);
        if (subRes.data.subscription.expires_at) {
          const exp = new Date(subRes.data.subscription.expires_at);
          const now = new Date();
          setDaysLeft(Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))));
        }
      }
      if (statsRes.success && statsRes.data) {
        const d = statsRes.data;
        setUsage({
          qr_used: d.total_transactions || 0,
          links_used: d.active_links || 0,
          api_used_today: d.today_transactions || 0,
          payments_total: d.total_transactions || 0,
          revenue_total: d.total_revenue || 0,
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!sub || !plan) return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' as const, padding: '60px 24px', color: '#dbeafe' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>No Active Subscription</div>
      <div style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Purchase a plan to unlock gateway access.</div>
      <a href="/dashboard/subscription" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 12, padding: '12px 28px', color: '#020817', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
        View Plans
      </a>
    </div>
  );

  const isExpiringSoon = daysLeft !== null && daysLeft <= 7;
  const isExpired = daysLeft === 0;

  return (
    <div style={{ maxWidth: 860, color: '#dbeafe', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Active Subscription</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)' }}>Your current plan, usage, and limits at a glance.</div>
      </div>

      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 18, padding: '24px 28px', marginBottom: 24, position: 'relative' as const, overflow: 'hidden' }}>
        <div style={{ position: 'absolute' as const, top: 0, right: 0, width: 180, height: 180, background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', borderRadius: '50%', transform: 'translate(40px,-60px)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 16, position: 'relative' as const }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#3b82f6', marginBottom: 8, fontWeight: 600 }}>Current Plan</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', fontFamily: 'Space Grotesk, sans-serif' }}>{fmt(plan.price)}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> / {plan.billing_cycle}</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 10 }}>
            <span style={{ background: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.12)', color: isExpired ? '#ef4444' : '#3b82f6', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100, border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
              {isExpired ? 'EXPIRED' : sub.status.toUpperCase()}
            </span>
            {daysLeft !== null && !isExpired && (
              <span style={{ fontSize: 12, color: isExpiringSoon ? '#f59e0b' : 'rgba(255,255,255,0.35)' }}>
                {isExpiringSoon ? `⚠️ ${daysLeft} days left` : `${daysLeft} days remaining`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
          {[
            { label: 'Activated', value: fmtDate(sub.started_at) },
            { label: 'Expires', value: sub.expires_at ? fmtDate(sub.expires_at) : 'Never' },
            { label: 'Billing', value: plan.billing_cycle === 'forever' ? 'One-time' : 'Monthly' },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {usage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Revenue" value={fmtRev(usage.revenue_total)} sub="All time" />
          <StatCard label="Total Payments" value={String(usage.payments_total)} sub="All time" />
          <StatCard label="API Calls Today" value={String(usage.api_used_today)} sub={plan.api_limit === 0 ? 'Unlimited' : `of ${plan.api_limit} limit`} />
        </div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Plan Limits & Usage</div>
        <UsageBar used={usage?.qr_used || 0} limit={plan.qr_limit} label="QR Codes Generated" color="#1d4ed8" />
        <UsageBar used={usage?.links_used || 0} limit={plan.link_limit} label="Payment Links Active" color="#8b5cf6" />
        <UsageBar used={usage?.api_used_today || 0} limit={plan.api_limit} label="API Calls (Today)" color="#3b82f6" />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Plan Features</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {(plan.features || []).map((f: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
        <a href="/dashboard/subscription" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 12, padding: '11px 24px', color: '#020817', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
          Upgrade Plan
        </a>
        {isExpiringSoon && !isExpired && (
          <a href="/dashboard/subscription" style={{ display: 'inline-block', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '11px 24px', color: '#f59e0b', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Renew Now
          </a>
        )}
      </div>
    </div>
  );
}
