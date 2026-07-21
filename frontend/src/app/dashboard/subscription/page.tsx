'use client';
import { useEffect, useState } from 'react';
import { Star, Zap, Building2, Phone, Check, Shield, Clock, Headphones, Globe, TrendingUp, Users, AlertTriangle } from 'lucide-react';

const fmtRaw = (paise: number) => paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`;

interface Plan {
  id: string; name: string; price: number; billing_cycle: string;
  badge?: string; is_featured: boolean; cta_label: string;
  features: string[]; qr_limit: number; link_limit: number; api_limit: number;
  discount_6month?: number; discount_1year?: number;
}
interface Sub { id: string; plan_id: string; status: string; started_at: string; expires_at?: string; }

const BILLING_OPTIONS = [
  { label: 'Monthly', months: 1,  discountKey: '' },
  { label: 'Yearly',  months: 12, discountKey: 'discount_1year' },
];

const ALL_INCLUDE = [
  { Icon: Shield,      label: 'SSL Security',  desc: 'Bank-grade encryption' },
  { Icon: Clock,       label: '99.9% Uptime',  desc: 'SLA guaranteed' },
  { Icon: Headphones,  label: '24/7 Support',  desc: 'Always available' },
  { Icon: Globe,       label: 'Global CDN',    desc: 'Low latency worldwide' },
  { Icon: TrendingUp,  label: 'Analytics',     desc: 'Real-time insights' },
  { Icon: Users,       label: 'Team Access',   desc: 'Role-based permissions' },
];

const PLAN_META: Record<string, { color: string; bg: string; Icon: any }> = {
  default: { color: '#64748B', bg: '#F8FAFC', Icon: Zap },
  starter: { color: '#64748B', bg: '#F8FAFC', Icon: Zap },
  basic:   { color: '#64748B', bg: '#F8FAFC', Icon: Zap },
  professional: { color: '#2563EB', bg: '#EFF6FF', Icon: Star },
  pro:          { color: '#2563EB', bg: '#EFF6FF', Icon: Star },
  enterprise:   { color: '#7C3AED', bg: '#F5F3FF', Icon: Building2 },
  custom:       { color: '#059669', bg: '#ECFDF5', Icon: Phone },
};

function getPlanMeta(name: string) {
  const key = name.toLowerCase();
  return PLAN_META[key] || PLAN_META.default;
}


export default function SubscriptionPage() {
  const [plans, setPlans]             = useState<Plan[]>([]);
  const [current, setCurrent]         = useState<Sub | null>(null);
  const [loading, setLoading]         = useState(true);
  const [subscribing, setSubscribing] = useState('');
  const [payModal, setPayModal]       = useState<Plan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'confirm'|'paying'|'done'>('confirm');
  const [payQR, setPayQR]             = useState<string|null>(null);
  const [payUPILink, setPayUPILink]   = useState<string|null>(null);
  const [billingIdx, setBillingIdx]       = useState(0);
  const [downgradeModal, setDowngradeModal] = useState<Plan | null>(null);
  const [success, setSuccess]             = useState('');
  const [error, setError]                 = useState('');
  const [stats, setStats]             = useState<any>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 5000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch('/api/v1/public/plans').then(r => r.json()),
        fetch('/api/v1/dashboard/subscription/detail', { headers }).then(r => r.json()),
      ]);
      setPlans(plansRes.success ? (plansRes.data || []) : []);
      if (subRes.success && subRes.data) {
        if (subRes.data.subscription) setCurrent(subRes.data.subscription);
        if (subRes.data.usage)        setStats(subRes.data.usage);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubscribe = async (planId: string, forceDowngrade = false) => {
    setSubscribing(planId);
    try {
      const body: Record<string, unknown> = { plan_id: planId };
      if (forceDowngrade) body.force_downgrade = true;
      const r = await fetch('/api/v1/dashboard/subscription', { method: 'POST', headers, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('Successfully subscribed!'); await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSubscribing(''); }
  };

  const handlePay = (plan: Plan) => {
    if (plan.price === 0) {
      if (current?.status === 'active' && currentPlan && currentPlan.price > 0) {
        setDowngradeModal(plan); return;
      }
      handleSubscribe(plan.id); return;
    }
    setPayModal(plan); setPaymentStep('confirm'); setPayQR(null); setPayUPILink(null);
  };

  const initiatePayment = async () => {
    if (!payModal) return;
    setPaymentStep('paying');
    try {
      const r = await fetch('/api/v1/dashboard/subscription/pay', { method: 'POST', headers, body: JSON.stringify({ plan_id: payModal.id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Payment initiation failed');
      const paymentId = d.data?.payment_id;
      if (paymentId) { window.location.href = '/pay/' + paymentId; return; }
      setPayQR(d.data?.qr_code_base64 || null);
      setPayUPILink(d.data?.upi_intent_link || null);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 60) { clearInterval(poll); setPaymentStep('confirm'); flash('Payment timeout. Please try again.', true); return; }
        try {
          const statusRes = await fetch(`/api/v1/public/payment/${paymentId}`).then(r => r.json());
          if (statusRes.data?.status === 'paid') {
            clearInterval(poll);
            const subRes = await fetch('/api/v1/dashboard/subscription', { method: 'POST', headers, body: JSON.stringify({ plan_id: payModal.id }) });
            const subData = await subRes.json();
            if (subRes.ok) {
              setPaymentStep('done');
              setTimeout(async () => { setPayModal(null); setPaymentStep('confirm'); setPayQR(null); setPayUPILink(null); flash('Subscription activated!'); await load(); }, 2500);
            } else throw new Error(subData.error || 'Failed to activate subscription');
          }
        } catch { }
      }, 5000);
    } catch (e: any) { setPaymentStep('confirm'); flash(e.message, true); }
  };

  const getDisplayPrice = (plan: Plan) => {
    if (plan.price === 0) return { price: 0, perMonth: 0, total: 0 };
    const opt = BILLING_OPTIONS[billingIdx];
    const discount = opt.discountKey ? ((plan as any)[opt.discountKey] || 0) : 0;
    const total = Math.round(plan.price * opt.months * (1 - discount / 100));
    return { price: Math.round(total / opt.months), perMonth: Math.round(total / opt.months), total, discount };
  };

  const billing = BILLING_OPTIONS[billingIdx];
  const currentPlan = plans.find(p => p.id === current?.plan_id);
  const qrUsed      = stats?.qr_used      ?? 0;
  const linksActive = stats?.links_active  ?? 0;
  const apiToday    = stats?.api_today     ?? 0;

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sub-layout { display: flex; gap: 24px; align-items: flex-start; }
        .sub-main { flex: 1; min-width: 0; }
        .sub-sidebar { width: 292px; flex-shrink: 0; }
        .plan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .include-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 1100px) { .sub-layout { flex-direction: column; align-items: stretch; } .sub-sidebar { width: 100%; } }
        @media (max-width: 680px) { .plan-grid { grid-template-columns: 1fr; } .include-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 380px) { .include-grid { grid-template-columns: 1fr; } }
      `}</style>

      {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', color: '#059669', fontSize: 13, marginBottom: 16 }}>{success}</div>}

      {/* Hard limit banner — blocks new payments */}
      {currentPlan && (
        (currentPlan.qr_limit > 0 && qrUsed >= currentPlan.qr_limit) ||
        (currentPlan.link_limit > 0 && linksActive >= currentPlan.link_limit) ||
        (currentPlan.api_limit > 0 && apiToday >= currentPlan.api_limit)
      ) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>Payment creation is currently blocked</div>
            <div style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>You've hit a plan limit. Upgrade now to resume accepting payments — no new QR codes or links can be created until then.</div>
          </div>
        </div>
      )}

      {/* Soft warning — near limit */}
      {currentPlan && !(
        (currentPlan.qr_limit > 0 && qrUsed >= currentPlan.qr_limit) ||
        (currentPlan.link_limit > 0 && linksActive >= currentPlan.link_limit) ||
        (currentPlan.api_limit > 0 && apiToday >= currentPlan.api_limit)
      ) && (
        (currentPlan.qr_limit > 0 && qrUsed / currentPlan.qr_limit >= 0.8) ||
        (currentPlan.api_limit > 0 && apiToday / currentPlan.api_limit >= 0.8)
      ) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#92400E' }}>
            <strong>Approaching plan limit.</strong> You're using over 80% of your allowance. Consider upgrading to avoid disruption.
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} color="#2563EB" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Subscription Plans</h1>
          </div>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 0 46px' }}>Choose the plan that's right for your business</p>
        </div>

        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 50, padding: '4px 5px', gap: 2 }}>
          {BILLING_OPTIONS.map((opt, i) => (
            <button key={opt.label} onClick={() => setBillingIdx(i)}
              style={{ padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, background: billingIdx === i ? '#FFFFFF' : 'transparent', color: billingIdx === i ? '#0F172A' : '#64748B', boxShadow: billingIdx === i ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
              {opt.label}
              {i === 1 && plans[0]?.discount_1year && plans[0].discount_1year > 0 && (
                <span style={{ fontSize: 10, background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: 20, fontWeight: 700 }}>-{plans[0].discount_1year}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="sub-layout">
        <div className="sub-main">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              <div className="plan-grid" style={{ marginBottom: 20 }}>
                {plans.map(plan => {
                  const isCurrent = current?.plan_id === plan.id && current?.status === 'active';
                  const isLoading = subscribing === plan.id;
                  const isDowngrade = plan.price === 0 && !isCurrent && !!(current?.status === 'active' && currentPlan && currentPlan.price > 0);
                  const { price, total, discount } = getDisplayPrice(plan);
                  const meta = getPlanMeta(plan.name);
                  return (
                    <div key={plan.id} style={{ background: '#FFFFFF', border: `1.5px solid ${isCurrent || plan.is_featured ? meta.color : '#E2E8F0'}`, borderRadius: 16, padding: '22px', position: 'relative', boxShadow: (isCurrent || plan.is_featured) ? `0 0 0 3px ${meta.color}15` : 'none' }}>
                      {plan.badge && (
                        <div style={{ position: 'absolute', top: 14, right: 14, background: meta.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{plan.badge}</div>
                      )}
                      {isCurrent && (
                        <div style={{ position: 'absolute', top: plan.badge ? 40 : 14, right: 14, background: '#ECFDF5', color: '#059669', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #A7F3D0' }}>Current</div>
                      )}

                      <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <meta.Icon size={17} color={meta.color} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{plan.name}</div>
                      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 16 }}>
                        {plan.price === 0 ? 'Perfect for getting started' : `For ${plan.name.toLowerCase()} businesses`}
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        {plan.price === 0 ? (
                          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>Free</div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                              <span style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>₹{(price / 100).toLocaleString('en-IN')}</span>
                              <span style={{ fontSize: 13, color: '#64748B' }}>/mo</span>
                            </div>
                            {billingIdx === 1 && discount > 0 && (
                              <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                                Billed ₹{(total / 100).toLocaleString('en-IN')}/year · Save {discount}%
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => !isCurrent && handlePay(plan)}
                        disabled={isCurrent || isLoading}
                        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: `1.5px solid ${isCurrent ? meta.color : isDowngrade ? '#DC2626' : plan.is_featured ? 'transparent' : '#E2E8F0'}`, background: isCurrent ? meta.color : isDowngrade ? '#FEF2F2' : plan.is_featured ? meta.color : '#F8FAFC', color: isCurrent ? '#fff' : isDowngrade ? '#DC2626' : plan.is_featured ? '#fff' : '#475569', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: isCurrent ? 'default' : 'pointer', marginBottom: 18 }}>
                        {isCurrent ? '✓ Current Plan' : isLoading ? 'Processing…' : isDowngrade ? 'Downgrade to Free' : plan.price === 0 ? (plan.cta_label || 'Get Started') : 'Upgrade'}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {(plan.features || []).map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              <Check size={9} color={meta.color} strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{f}</span>
                          </div>
                        ))}
                      </div>

                      {(plan.qr_limit > 0 || plan.api_limit > 0) && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12, fontSize: 11, color: '#94A3B8' }}>
                          {plan.qr_limit > 0 && <span>QR: {plan.qr_limit === 0 ? '∞' : plan.qr_limit}</span>}
                          {plan.api_limit > 0 && <span>API: {plan.api_limit === 0 ? '∞' : plan.api_limit}/day</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>All plans include</div>
                <div className="include-grid">
                  {ALL_INCLUDE.map(({ Icon, label, desc }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color="#2563EB" />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div className="sub-sidebar">
          {/* Current plan card */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Current Plan</div>
            {currentPlan ? (() => {
              const meta = getPlanMeta(currentPlan.name);
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <meta.Icon size={16} color={meta.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{currentPlan.name}</div>
                      <div style={{ fontSize: 13, color: meta.color, fontWeight: 600 }}>
                        {currentPlan.price === 0 ? 'Free' : `₹${(currentPlan.price / 100).toLocaleString('en-IN')}/month`}
                      </div>
                    </div>
                  </div>
                  {current?.expires_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: '#64748B' }}>Next Billing</span>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>{new Date(current.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 14 }}>
                    <span style={{ color: '#64748B' }}>Status</span>
                    <span style={{ background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Active</span>
                  </div>
                </>
              );
            })() : (
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>No active subscription</div>
            )}
            <button style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Manage Plan
            </button>
          </div>

          {/* Usage — this billing period */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>Usage — This Period</div>
            {current?.expires_at && (
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 14 }}>
                Resets {new Date(current.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
            {currentPlan ? (() => {
              const rows = [
                { label: 'Payments Created',  used: qrUsed      ?? 0, limit: currentPlan.qr_limit   ?? 0, color: '#2563EB', unit: '' },
                { label: 'Active Pay Links',  used: linksActive ?? 0, limit: currentPlan.link_limit ?? 0, color: '#7C3AED', unit: '' },
                { label: 'API Calls (24h)',   used: apiToday    ?? 0, limit: currentPlan.api_limit  ?? 0, color: '#059669', unit: '/day' },
              ];
              return rows.map(({ label, used, limit, color, unit }) => {
                const unlimited = limit === 0;
                const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
                const atLimit = !unlimited && used >= limit;
                const nearLimit = !unlimited && pct >= 80;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: atLimit ? '#DC2626' : nearLimit ? '#D97706' : '#0F172A' }}>
                        {used.toLocaleString()}{unlimited ? '/∞' : `/${limit.toLocaleString()}${unit}`}
                      </span>
                    </div>
                    {!unlimited && (
                      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: atLimit ? '#DC2626' : nearLimit ? '#F59E0B' : color, borderRadius: 10, transition: 'width 0.4s' }} />
                      </div>
                    )}
                    {unlimited && (
                      <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Unlimited</div>
                    )}
                    {atLimit && (
                      <div style={{ marginTop: 5, fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                        Limit reached — upgrade to continue
                      </div>
                    )}
                  </div>
                );
              });
            })() : (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Subscribe to a plan to see usage</div>
            )}
          </div>

          {/* Limit enforcement notice */}
          {currentPlan && (() => {
            const atLimit =
              (currentPlan.qr_limit   > 0 && qrUsed      >= currentPlan.qr_limit)   ||
              (currentPlan.link_limit  > 0 && linksActive  >= currentPlan.link_limit) ||
              (currentPlan.api_limit   > 0 && apiToday     >= currentPlan.api_limit);
            if (!atLimit) return null;
            return (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>Plan limit reached</div>
                <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5, marginBottom: 10 }}>
                  New payment requests are blocked until you upgrade or your billing period resets.
                </div>
                <button
                  onClick={() => document.querySelector('.plan-grid')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ background: '#DC2626', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Upgrade Now →
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Downgrade confirmation modal */}
      {downgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #FECACA', borderRadius: 20, padding: 32, width: 420, maxWidth: '92vw', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Downgrade to Free?</div>
            <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
              Your current <strong style={{ color: '#0F172A' }}>{currentPlan?.name}</strong> plan will be <strong style={{ color: '#DC2626' }}>cancelled immediately</strong>. You'll lose access to all paid features and your limits will drop to the Free tier. This cannot be undone without repurchasing a plan.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDowngradeModal(null)}
                style={{ flex: 1, background: '#FFFFFF', border: '1.5px solid #2563EB', borderRadius: 10, padding: '12px 0', color: '#2563EB', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}
              >
                Keep {currentPlan?.name}
              </button>
              <button
                onClick={() => { setDowngradeModal(null); handleSubscribe(downgradeModal.id, true); }}
                disabled={subscribing === downgradeModal.id}
                style={{ flex: 1, background: '#DC2626', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                {subscribing === downgradeModal.id ? 'Processing…' : 'Yes, Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 32, width: 440, maxWidth: '92vw', textAlign: 'center' }}>
            {paymentStep === 'confirm' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, textAlign: 'left' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>Plan Activation</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{payModal.name} Plan</div>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 13, color: '#64748B' }}>Amount due</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{fmtRaw(getDisplayPrice(payModal).total || getDisplayPrice(payModal).price)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 13, color: '#64748B' }}>Payment method</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                      UPI
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: 600 }}>Includes</div>
                  {(payModal.features || []).slice(0, 4).map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={9} color="#2563EB" strokeWidth={3} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setPayModal(null)} style={{ flex: 1, background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '12px 0', color: '#64748B', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Cancel</button>
                  <button onClick={initiatePayment} style={{ flex: 2, background: '#2563EB', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Pay {fmtRaw(getDisplayPrice(payModal).total || getDisplayPrice(payModal).price)} via UPI
                  </button>
                </div>
              </>
            )}
            {paymentStep === 'paying' && (
              <div style={{ margin: -32, borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff' }}>N</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>NovaPay</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Secure Payment Gateway</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />Live
                  </div>
                </div>
                <div style={{ background: '#0F172A', padding: '24px 24px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: '#64748B', fontWeight: 600, marginBottom: 8 }}>AMOUNT TO PAY</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
                    {fmtRaw(getDisplayPrice(payModal).total || getDisplayPrice(payModal).price)}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>Plan: {payModal?.name} · {billing.label}</div>
                  {payQR && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                      <div style={{ background: '#fff', padding: 14, borderRadius: 18, boxShadow: '0 0 40px rgba(37,99,235,0.2)' }}>
                        <img src={payQR} alt="QR" style={{ width: 200, height: 200, display: 'block' }} />
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>Scan with any UPI app to pay</div>
                  {payUPILink && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, letterSpacing: 2, color: '#475569', fontWeight: 600, marginBottom: 14 }}>OR OPEN IN</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                        {[{ label: 'GPay', color: '#22C55E' }, { label: 'PhonePe', color: '#7C3AED' }, { label: 'Paytm', color: '#3B82F6' }].map(app => (
                          <a key={app.label} href={payUPILink} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 6px', textDecoration: 'none' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: app.color }} />
                            <span style={{ fontSize: 11, color: '#8B9AB5' }}>{app.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#374151' }}>🔒 256-bit encrypted · Powered by NovaPay</span>
                    <button onClick={() => setPaymentStep('confirm')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {paymentStep === 'done' && (
              <>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', marginBottom: 8 }}>Payment Confirmed!</div>
                <div style={{ color: '#64748B', fontSize: 14 }}>Your subscription is now active. Gateway access enabled.</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
