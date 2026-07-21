'use client';
import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

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
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: isUnlimited ? '#2563EB' : isHigh ? '#DC2626' : '#0F172A', fontWeight: 600 }}>
          {isUnlimited ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: isHigh ? '#DC2626' : color, transition: 'width 0.6s ease' }} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{sub}</div>}
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
      <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!sub || !plan) return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' as const, padding: '60px 24px', color: '#0F172A' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Package size={28} color="#94A3B8" />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>No Active Subscription</div>
      <div style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>Purchase a plan to unlock gateway access.</div>
      <a href="/dashboard/subscription" style={{ display: 'inline-block', background: '#2563EB', borderRadius: 10, padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
        View Plans
      </a>
    </div>
  );

  const isExpiringSoon = daysLeft !== null && daysLeft <= 7;
  const isExpired = daysLeft === 0;

  return (
    <div style={{ maxWidth: 860, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Active Subscription</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>Your current plan, usage, and limits at a glance.</div>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 16, padding: '22px 26px', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#2563EB', marginBottom: 6, fontWeight: 700 }}>Current Plan</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{fmt(plan.price)}<span style={{ fontSize: 13, color: '#64748B', fontWeight: 400 }}> / {plan.billing_cycle}</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8 }}>
            <span style={{ background: isExpired ? '#FEF2F2' : '#ECFDF5', color: isExpired ? '#DC2626' : '#059669', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100, border: `1px solid ${isExpired ? '#FECACA' : '#A7F3D0'}` }}>
              {isExpired ? 'EXPIRED' : sub.status.toUpperCase()}
            </span>
            {daysLeft !== null && !isExpired && (
              <span style={{ fontSize: 12, color: isExpiringSoon ? '#D97706' : '#64748B' }}>
                {isExpiringSoon ? `${daysLeft} days left` : `${daysLeft} days remaining`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Activated', value: fmtDate(sub.started_at) },
            { label: 'Expires', value: sub.expires_at ? fmtDate(sub.expires_at) : 'Never' },
            { label: 'Billing', value: plan.billing_cycle === 'forever' ? 'One-time' : 'Monthly' },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#64748B', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {usage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard label="Total Revenue" value={fmtRev(usage.revenue_total)} sub="All time" />
          <StatCard label="Total Payments" value={String(usage.payments_total)} sub="All time" />
          <StatCard label="API Calls Today" value={String(usage.api_used_today)} sub={plan.api_limit === 0 ? 'Unlimited' : `of ${plan.api_limit} limit`} />
        </div>
      )}

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '22px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>Plan Limits & Usage</div>
        <UsageBar used={usage?.qr_used || 0} limit={plan.qr_limit} label="QR Codes Generated" color="#2563EB" />
        <UsageBar used={usage?.links_used || 0} limit={plan.link_limit} label="Payment Links Active" color="#7C3AED" />
        <UsageBar used={usage?.api_used_today || 0} limit={plan.api_limit} label="API Calls (Today)" color="#2563EB" />
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Plan Features</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {(plan.features || []).map((f: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <span style={{ color: '#2563EB', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
        <a href="/dashboard/subscription" style={{ display: 'inline-block', background: '#2563EB', borderRadius: 10, padding: '10px 22px', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Upgrade Plan
        </a>
        {isExpiringSoon && !isExpired && (
          <a href="/dashboard/subscription" style={{ display: 'inline-block', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 22px', color: '#D97706', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Renew Now
          </a>
        )}
      </div>
    </div>
  );
}
