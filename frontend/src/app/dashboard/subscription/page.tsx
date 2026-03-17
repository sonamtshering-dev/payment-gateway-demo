'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const fmtRaw = (paise: number) => paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`;
const dateStr = (s: string) => { try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '-'; } };

interface Plan {
  id: string; name: string; price: number; billing_cycle: string;
  badge?: string; is_featured: boolean; cta_label: string;
  features: string[]; qr_limit: number; link_limit: number; api_limit: number;
}
interface Sub { id: string; plan_id: string; status: string; started_at: string; expires_at?: string; }

const BILLING_OPTIONS = [
  { label: '30 Days',  months: 1,  discountKey: '',               key: 'per month' },
  { label: '6 Months', months: 6,  discountKey: 'discount_6month',  key: 'per 6 months' },
  { label: '1 Year',   months: 12, discountKey: 'discount_1year',   key: 'per year' },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans]             = useState<Plan[]>([]);
  const [current, setCurrent]         = useState<Sub | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading]         = useState(true);
  const [subscribing, setSubscribing] = useState('');
  const [cancelling, setCancelling]   = useState(false);
  const [payModal, setPayModal]       = useState<Plan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'confirm'|'paying'|'done'>('confirm');
  const [payQR, setPayQR]             = useState<string|null>(null);
  const [payUPILink, setPayUPILink]   = useState<string|null>(null);
  const [billingIdx, setBillingIdx]   = useState(0);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

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

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const r = await fetch('/api/v1/dashboard/subscription', { method: 'POST', headers, body: JSON.stringify({ plan_id: planId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('Successfully subscribed!'); await load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSubscribing(''); }
  };

  const handlePay = (plan: Plan) => {
    if (plan.price === 0) { handleSubscribe(plan.id); return; }
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
      if (paymentId) {
        window.location.href = '/pay/' + paymentId;
        return;
      }
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
            } else { throw new Error(subData.error || 'Failed to activate subscription'); }
          }
        } catch (e) { console.error('poll error', e); }
      }, 5000);
    } catch (e: any) { setPaymentStep('confirm'); flash(e.message, true); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will lose access to gateway features.')) return;
    setCancelling(true);
    try {
      const r = await fetch('/api/v1/dashboard/subscription', { method: 'DELETE', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to cancel');
      flash('Subscription cancelled.'); setCurrent(null); setCurrentPlan(null);
    } catch (e: any) { flash(e.message, true); }
    finally { setCancelling(false); }
  };

  const getDisplayPrice = (plan: Plan) => {
    if (plan.price === 0) return { price: 0, perMonth: 0 };
    const opt = BILLING_OPTIONS[billingIdx];
    const discount = opt.discountKey ? ((plan as any)[opt.discountKey] || 0) : 0;
    const discounted = Math.round(plan.price * opt.months * (1 - discount / 100));
    return { price: discounted, perMonth: Math.round(discounted / opt.months) };
  };

  const billing = BILLING_OPTIONS[billingIdx];

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 980 }}>
      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', color: '#3b82f6', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      <div style={{ textAlign: 'center' as const, marginBottom: 28 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Simple, transparent pricing</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Choose the perfect plan for your business</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', background: '#0f1d35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, gap: 2 }}>
          {BILLING_OPTIONS.map((opt, i) => (
            <button key={opt.label} onClick={() => setBillingIdx(i)} style={{ background: i === billingIdx ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'transparent', border: 'none', borderRadius: 9, padding: '9px 20px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: i === billingIdx ? 700 : 400, color: i === billingIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
              <span>{opt.label}</span>
              {opt.discountKey && (plans[0] as any)?.[opt.discountKey] > 0 && <span style={{ fontSize: 10, color: i === billingIdx ? '#c4b5fd' : '#1d4ed8', fontWeight: 700 }}>Save {(plans[0] as any)?.[opt.discountKey]}%</span>}
            </button>
          ))}
        </div>
      </div>



      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {plans.map(plan => {
            const isCurrent = current?.plan_id === plan.id && current?.status === 'active';
            const isLoading = subscribing === plan.id;
            const { price, perMonth } = getDisplayPrice(plan);
            return (
              <div key={plan.id}
                style={{ background: '#030d1f', border: plan.is_featured ? '2px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 24px', position: 'relative' as const, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: plan.is_featured ? '0 0 40px rgba(29,78,216,0.12)' : 'none' }}
                onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=plan.is_featured?'0 8px 40px rgba(29,78,216,0.25)':'0 8px 24px rgba(0,0,0,0.3)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=plan.is_featured?'0 0 40px rgba(29,78,216,0.12)':'none'; }}
              >
                {plan.badge && (
                  <div style={{ position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' as const }}>
                    {plan.badge.toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>{plan.price === 0 ? 'Perfect for getting started' : `Best for ${plan.name.toLowerCase()} businesses`}</div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>{plan.price === 0 ? 'Free' : `₹${(price/100).toLocaleString('en-IN')}`}</span>
                  {plan.price > 0 && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>/{billing.label.toLowerCase()}</span>}
                </div>
                {plan.price > 0 && billingIdx > 0 && <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 4 }}>₹{(perMonth/100).toLocaleString('en-IN')}/month</div>}
                {plan.price > 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>🔢 QR Requests: {plan.qr_limit === 0 ? 'Unlimited' : (plan.qr_limit || 0).toLocaleString()}</div>}
                <button
                  onClick={() => !isCurrent && handlePay(plan)}
                  disabled={isCurrent || isLoading}
                  style={{ width: '100%', border: 'none', borderRadius: 12, padding: '13px 0', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: isCurrent ? 'default' : 'pointer', marginBottom: 20, background: isCurrent ? 'rgba(59,130,246,0.08)' : plan.is_featured ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'rgba(255,255,255,0.07)', color: isCurrent ? '#3b82f6' : '#fff', boxShadow: plan.is_featured && !isCurrent ? '0 4px 20px rgba(29,78,216,0.4)' : 'none' } as any}>
                  {isCurrent ? '✓ Current Plan' : isLoading ? 'Processing…' : plan.price === 0 ? plan.cta_label || 'Get started' : 'Get started'}
                </button>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>Included features:</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {(plan.features || []).map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                      <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  <span>QR: {plan.qr_limit === 0 ? '∞' : plan.qr_limit}</span>
                  <span>Links: {plan.link_limit === 0 ? '∞' : plan.link_limit}</span>
                  <span>API: {plan.api_limit === 0 ? '∞' : plan.api_limit}/day</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {payModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#030d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36, width: 440, maxWidth: '92vw', textAlign: 'center' as const }}>
            {paymentStep === 'confirm' && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Activate {payModal.name}</div>
                <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>You'll be charged <strong style={{ color: '#dbeafe' }}>{fmtRaw(getDisplayPrice(payModal).price)}</strong> via UPI.</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' as const }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Plan includes:</div>
                  {(payModal.features || []).slice(0, 4).map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#8b9ab5', display: 'flex', gap: 8, marginBottom: 5 }}><span style={{ color: '#3b82f6' }}>✓</span>{f}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setPayModal(null)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 0', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  <button onClick={initiatePayment} style={{ flex: 2, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Pay {fmtRaw(getDisplayPrice(payModal).price)} via UPI</button>
                </div>
              </>
            )}
            {paymentStep === 'paying' && (
              <div style={{ margin: -36, borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ background: '#0b1120', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff', fontFamily: 'Syne, sans-serif' }}>N</div>
                    <div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: '#fff' }}>NovaPay</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Secure Payment Gateway</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></div>Live
                  </div>
                </div>
                <div style={{ padding: '24px 24px 0', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>AMOUNT TO PAY</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 900, color: '#fff', marginBottom: 4 }}>₹{payModal ? (getDisplayPrice(payModal).price / 100).toLocaleString('en-IN') : ''}</div>
                  <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 20 }}>Plan: {payModal?.name} · {BILLING_OPTIONS[billingIdx].label}</div>
                  {payQR && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                      <div style={{ background: '#fff', padding: 14, borderRadius: 18, boxShadow: '0 0 40px rgba(59,130,246,0.15)' }}>
                        <img src={payQR} alt="QR" style={{ width: 200, height: 200, display: 'block' }} />
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 20 }}>Scan with any UPI app to pay</div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, letterSpacing: 2, color: '#4b5563', fontWeight: 600, marginBottom: 14 }}>OR PAY WITH</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                      <a href={payUPILink ? 'intent://pay?pa=' + payUPILink.split('pa=')[1]?.split('&')[0] + '&pn=NovaPay&am=' + (payModal ? getDisplayPrice(payModal).price/100 : '') + '&cu=INR#Intent;scheme=gpay;package=com.google.android.apps.nbu.paisa.user;end' : '#'} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 6px', textDecoration: 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#22c55e' }}></div>
                        <span style={{ fontSize: 11, color: '#8b9ab5' }}>GPay</span>
                      </a>
                      <a href={payUPILink ? payUPILink.replace('upi://', 'phonepe://') : '#'} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 6px', textDecoration: 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c3aed' }}></div>
                        <span style={{ fontSize: 11, color: '#8b9ab5' }}>PhonePe</span>
                      </a>
                      <a href={payUPILink ? payUPILink.replace('upi://', 'paytmmp://') : '#'} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 6px', textDecoration: 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6' }}></div>
                        <span style={{ fontSize: 11, color: '#8b9ab5' }}>Paytm</span>
                      </a>
                      <a href={payUPILink || '#'} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 6px', textDecoration: 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>UPI</div>
                        <span style={{ fontSize: 11, color: '#8b9ab5' }}>Any UPI</span>
                      </a>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <span style={{ fontSize: 12, color: '#4b5563' }}>⏱ Session expires in</span>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: 2 }}>05:00</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#374151' }}>🔒 256-bit encrypted · Powered by NovaPay</span>
                    <button onClick={() => setPaymentStep('confirm')} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {paymentStep === 'done' && (
              <>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#3b82f6' }}>Payment Confirmed!</div>
                <div style={{ color: '#64748b', fontSize: 14 }}>Your subscription is now active. Gateway access enabled.</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
