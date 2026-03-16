'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const fmt = (paise: number) =>
  paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`;

const dateStr = (s: string) => {
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '-'; }
};

interface Plan {
  id: string; name: string; price: number; billing_cycle: string;
  badge?: string; is_featured: boolean; cta_label: string;
  features: string[]; qr_limit: number; link_limit: number; api_limit: number;
}

interface Sub {
  id: string; plan_id: string; status: string;
  started_at: string; expires_at?: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [current, setCurrent]   = useState<Sub | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading]   = useState(true);
  const [subscribing, setSubscribing] = useState('');
  const [cancelling, setCancelling]   = useState(false);
  const [payModal, setPayModal]       = useState<Plan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'confirm' | 'paying' | 'done'>('confirm');
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const merchantId = typeof window !== 'undefined' ? (() => {
    try { const p = JSON.parse(atob(token?.split('.')[1] || '')); return p.merchant_id; } catch { return ''; }
  })() : '';
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
      const planList: Plan[] = plansRes.success ? (plansRes.data || []) : [];
      setPlans(planList);
      if (subRes.success && subRes.data?.subscription) {
        setCurrent(subRes.data.subscription);
        const plan = subRes.data.plan || planList.find((p: Plan) => p.id === subRes.data.subscription.plan_id);
        setCurrentPlan(plan || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Direct subscribe (for free plans or admin override)
  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const r = await fetch('/api/v1/dashboard/subscription', {
        method: 'POST', headers, body: JSON.stringify({ plan_id: planId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('Successfully subscribed!');
      await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSubscribing(''); }
  };

  // Pay via gateway then activate
  const handlePay = async (plan: Plan) => {
    if (plan.price === 0) { handleSubscribe(plan.id); return; }
    setPayModal(plan);
    setPaymentStep('confirm');
  };

  const initiatePayment = async () => {
    if (!payModal || !merchantId) return;
    setPaymentStep('paying');
    try {
      // Create a payment via the gateway using the merchant's own account
 const r = await fetch('/api/v1/dashboard/subscription/pay', {
  method: 'POST',
  headers,
  body: JSON.stringify({ plan_id: payModal.id }),
});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Payment initiation failed');

      // Open UPI payment
      const paymentId = d.data?.payment_id;
      const upiLink = d.data?.upi_intent_link;

      if (upiLink) {
        router.push(`/pay/${d.data.payment_id}`);
      }

      // Poll for payment completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 30) { // 2.5 minutes timeout
          clearInterval(poll);
          setPaymentStep('confirm');
          flash('Payment timeout. Please try again or contact support.', true);
          return;
        }
        try {
          const statusRes = await fetch(`/api/v1/public/payment/${paymentId}`).then(r => r.json());
          if (statusRes.data?.status === 'paid') {
            clearInterval(poll);
            // Activate subscription
            const subRes = await fetch('/api/v1/dashboard/subscription', {
              method: 'POST', headers, body: JSON.stringify({ plan_id: payModal.id }),
            });
            const subData = await subRes.json();
            if (subRes.ok) {
              setPaymentStep('done');
              setTimeout(async () => {
                setPayModal(null);
                setPaymentStep('confirm');
                flash('🎉 Subscription activated successfully!');
                await load();
              }, 2000);
            } else {
              throw new Error(subData.error || 'Failed to activate subscription');
            }
          }
        } catch (e) { console.error('poll error', e); }
      }, 5000);

    } catch (e: any) {
      setPaymentStep('confirm');
      flash(e.message, true);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will lose access to gateway features at the end of your billing period.')) return;
    setCancelling(true);
    try {
      const r = await fetch('/api/v1/dashboard/subscription', { method: 'DELETE', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to cancel');
      flash('Subscription cancelled.');
      setCurrent(null); setCurrentPlan(null);
    } catch (e: any) { flash(e.message, true); }
    finally { setCancelling(false); }
  };

  const statusColor = (s: string) => s === 'active' ? '#00e5b0' : s === 'cancelled' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ padding: 32, color: '#eef2ff', fontFamily: 'DM Sans, sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Subscription</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>Manage your plan. An active subscription + verified KYC is required to use the payment gateway.</p>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 24 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 10, padding: '12px 16px', color: '#00e5b0', fontSize: 13, marginBottom: 24 }}>{success}</div>}

      {/* Gateway Status Banner */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Gateway Access Status</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
          {[
            { label: 'KYC', href: '/dashboard/kyc' },
            { label: 'Subscription', href: '/dashboard/subscription' },
            { label: 'UPI Connected', href: '/dashboard/settings' },
          ].map(item => (
            <div key={item.label} onClick={() => router.push(item.href)}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: '#8b9ab5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{item.label === 'KYC' ? '🪪' : item.label === 'Subscription' ? '💳' : '🏦'}</span>
              {item.label} →
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: '#4b5563', background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 14px' }}>
          ⚠️ All three must be completed for your merchants to receive payments via the gateway API.
        </div>
      </div>

      {/* Current Subscription */}
      {current && (
        <div style={{ background: current.status === 'active' ? 'rgba(0,229,176,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${current.status === 'active' ? 'rgba(0,229,176,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 16, padding: '24px 28px', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: statusColor(current.status), textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Current Plan</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{currentPlan?.name || 'Active Plan'}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Started {dateStr(current.started_at)}
                {current.expires_at && ` · Expires ${dateStr(current.expires_at)}`}
              </div>
              {currentPlan && (
                <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12, color: '#8b9ab5' }}>
                  <span>QR: {currentPlan.qr_limit === 0 ? '∞' : currentPlan.qr_limit}</span>
                  <span>Links: {currentPlan.link_limit === 0 ? '∞' : currentPlan.link_limit}</span>
                  <span>API: {currentPlan.api_limit === 0 ? '∞' : currentPlan.api_limit}/day</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 10 }}>
              <span style={{ background: `rgba(${current.status === 'active' ? '0,229,176' : '239,68,68'},0.12)`, color: statusColor(current.status), fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100 }}>
                {current.status.toUpperCase()}
              </span>
              {current.status === 'active' && (
                <button onClick={handleCancel} disabled={cancelling}
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 16px', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {cancelling ? 'Cancelling…' : 'Cancel Plan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          {current?.status === 'active' ? 'Switch Plan' : 'Choose a Plan'}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          {current?.status === 'active' ? 'Upgrade or downgrade at any time.' : 'Select a plan to activate your gateway access.'}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 64, color: '#4b5563' }}>Loading plans…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
          {plans.map(plan => {
            const isCurrent = current?.plan_id === plan.id && current?.status === 'active';
            const isLoading = subscribing === plan.id;
            return (
              <div key={plan.id}
                style={{ background: '#111827', border: plan.is_featured ? '1px solid rgba(0,229,176,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '28px 22px', position: 'relative' as const, transition: 'transform 0.2s' }}
                onMouseEnter={e => !isCurrent && (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {plan.badge && (
                  <div style={{ position: 'absolute' as const, top: 14, right: 14, background: '#00e5b0', color: '#07090f', fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 5 }}>
                    {plan.badge.toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 12 }}>{plan.name}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, letterSpacing: -2, marginBottom: 4 }}>{fmt(plan.price)}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{plan.billing_cycle}</div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
                  {[['QR codes', plan.qr_limit === 0 ? 'Unlimited' : plan.qr_limit], ['Payment links', plan.link_limit === 0 ? 'Unlimited' : plan.link_limit], ['API calls/day', plan.api_limit === 0 ? 'Unlimited' : plan.api_limit]].map(([k, v]) => (
                    <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <span style={{ color: '#eef2ff', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
                  {(plan.features || []).map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#8b9ab5' }}>
                      <span style={{ color: '#00e5b0', fontWeight: 700 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handlePay(plan)}
                  disabled={isCurrent || isLoading}
                  style={{
                    width: '100%', border: 'none', borderRadius: 10, padding: '12px 0',
                    fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? 'rgba(0,229,176,0.08)' : plan.is_featured ? 'linear-gradient(135deg,#00e5b0,#0ea5e9)' : 'rgba(255,255,255,0.06)',
                    color: isCurrent ? '#00e5b0' : plan.is_featured ? '#07090f' : '#8b9ab5',
                  } as any}>
                  {isCurrent ? '✓ Current Plan' : isLoading ? 'Processing…' : plan.price === 0 ? plan.cta_label || 'Get started' : `Pay ${fmt(plan.price)} & Activate`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, width: 440, maxWidth: '92vw', textAlign: 'center' as const }}>

            {paymentStep === 'confirm' && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Activate {payModal.name}</div>
                <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                  You'll be charged <strong style={{ color: '#eef2ff' }}>{fmt(payModal.price)}</strong> {payModal.billing_cycle} via UPI.
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' as const }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Plan includes:</div>
                  {(payModal.features || []).slice(0, 4).map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#8b9ab5', display: 'flex', gap: 8, marginBottom: 5 }}>
                      <span style={{ color: '#00e5b0' }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setPayModal(null)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 0', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  <button onClick={initiatePayment} style={{ flex: 2, background: 'linear-gradient(135deg,#00e5b0,#0ea5e9)', border: 'none', borderRadius: 10, padding: '12px 0', color: '#07090f', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                    Pay {fmt(payModal.price)} via UPI
                  </button>
                </div>
              </>
            )}

            {paymentStep === 'paying' && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Waiting for Payment</div>
                <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                  Complete the UPI payment in your app. This page will update automatically once payment is confirmed.
                </div>
                <div style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#00e5b0', marginBottom: 24 }}>
                  Polling for payment confirmation every 5 seconds…
                </div>
                <button onClick={() => setPaymentStep('confirm')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 24px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
              </>
            )}

            {paymentStep === 'done' && (
              <>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#00e5b0' }}>Payment Confirmed!</div>
                <div style={{ color: '#64748b', fontSize: 14 }}>Your subscription is now active. Gateway access enabled.</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}