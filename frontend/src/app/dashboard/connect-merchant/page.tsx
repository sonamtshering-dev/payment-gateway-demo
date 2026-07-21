'use client';
import React, { useEffect, useState } from 'react';
import {
  Building2, Smartphone, Server, ShieldCheck, Lock,
  BookOpen, Mail, Zap, Layers, BarChart3, TrendingUp, ArrowRight,
} from 'lucide-react';

interface Provider {
  id: string; provider: string; merchant_name: string;
  merchant_mid: string; upi_id: string; is_active: boolean; is_default: boolean;
}

const ACCOUNT_TYPES = [
  {
    id: 'bank', icon: Building2, title: 'Bank Account',
    subtitle: 'Receive payments in your bank account',
    features: ['IMPS / NEFT / RTGS', 'All UPI Apps Supported', 'Best for Businesses'],
    provider: 'bank_transfer',
  },
  {
    id: 'upi', icon: Smartphone, title: 'UPI ID',
    subtitle: 'Receive payments directly in your UPI ID',
    features: ['Instant Settlements', 'All UPI Apps Supported', 'Perfect for Individuals'],
    provider: 'upi_direct',
  },
  {
    id: 'virtual', icon: Server, title: 'Virtual Account',
    subtitle: 'Dedicated virtual account for your business',
    features: ['Unique Account Number', 'Easy Reconciliation', 'Best for Enterprises'],
    provider: 'bharatpe',
  },
];

const PAYMENT_METHODS = [
  { name: 'PhonePe',    logo: '/payment-logos/phonepe.jpeg' },
  { name: 'Google Pay', logo: '/payment-logos/gpay.png'     },
  { name: 'Paytm',      logo: '/payment-logos/paytm.jpeg'   },
];

const STEPS = ['Account Type', 'Business Details', 'Bank / UPI Details', 'Verification', 'Review & Confirm'];

const WHY_FEATURES = [
  { icon: TrendingUp, title: 'Receive payments directly', desc: 'No intermediaries. 100% direct transfer.' },
  { icon: Zap,        title: 'Instant settlements',       desc: 'Get paid instantly in your account.' },
  { icon: Layers,     title: 'Multiple account support',  desc: 'Connect multiple accounts for routing.' },
  { icon: BarChart3,  title: 'Advanced analytics',        desc: 'Track performance and transactions.' },
];

const REQUIREMENTS = [
  'Valid business or personal details',
  'Active Bank Account or UPI ID',
  'PAN Card',
  'Mobile number and Email ID',
  'KYC verification',
];

const inp: React.CSSProperties = {
  width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0',
  borderRadius: 8, padding: '10px 14px', color: '#0F172A', fontSize: 14,
  fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8,
};

function Tick({ color = '#2563EB' }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L4.8 9L10 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ConnectMerchantPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [step, setStep]               = useState(1);
  const [accountType, setAccountType] = useState('upi');
  const [providerType, setProviderType] = useState('paytm');
  const [form, setForm] = useState({ merchant_name: '', merchant_mid: '', upi_id: '' });
  const [saving, setSaving]           = useState(false);

  const [editTarget, setEditTarget] = useState<Provider | null>(null);
  const [showEdit, setShowEdit]     = useState(false);
  const [editForm, setEditForm]     = useState({ merchant_name: '', merchant_mid: '', upi_id: '' });

  const token   = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch('/api/v1/dashboard/providers', { headers })
      .then(r => r.json()).then(d => setProviders(d.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 3500); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); }
  };

  const handleContinue = async () => {
    if (step === 2 && !form.merchant_name.trim()) { flash('Merchant name is required', true); return; }
    if (step === 3 && !form.upi_id.includes('@'))   { flash('Enter a valid UPI ID (e.g. business@paytm)', true); return; }
    if (step === 3 && !form.merchant_mid.trim())    { flash('Merchant ID is required', true); return; }
    if (step < 5) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      const selectedType = ACCOUNT_TYPES.find(t => t.id === accountType);
      const r = await fetch('/api/v1/dashboard/providers', {
        method: 'POST', headers,
        body: JSON.stringify({
          provider: selectedType?.provider || 'upi_direct',
          merchant_name: form.merchant_name,
          merchant_mid: form.merchant_mid || 'NA',
          upi_id: form.upi_id,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Connect failed');
      flash('Merchant connected successfully!');
      setStep(1);
      setForm({ merchant_name: '', merchant_mid: '', upi_id: '' });
      setProviderType('paytm');
      load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      const body: any = { merchant_name: editForm.merchant_name, merchant_mid: editForm.merchant_mid };
      if (editForm.upi_id) body.upi_id = editForm.upi_id;
      const r = await fetch(`/api/v1/dashboard/providers/${editTarget.id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Update failed');
      flash('Merchant updated'); setShowEdit(false); load();
    } catch (e: any) { flash(e.message, true); }
  };

  const handleToggle = async (p: Provider) => {
    try {
      const r = await fetch(`/api/v1/dashboard/providers/${p.id}`, { method: 'PUT', headers, body: JSON.stringify({ is_active: !p.is_active }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      flash(p.is_active ? 'Merchant disabled' : 'Merchant enabled'); load();
    } catch (e: any) { flash(e.message, true); }
  };

  const handleDelete = async (p: Provider) => {
    if (!confirm(`Delete ${p.merchant_name}? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/v1/dashboard/providers/${p.id}`, { method: 'DELETE', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      flash('Merchant deleted'); load();
    } catch (e: any) { flash(e.message, true); }
  };

  const openEdit = (p: Provider) => {
    setEditTarget(p);
    setEditForm({ merchant_name: p.merchant_name, merchant_mid: p.merchant_mid, upi_id: '' });
    setShowEdit(true);
  };

  const selectedTypeName = ACCOUNT_TYPES.find(t => t.id === accountType)?.title || '';

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Responsive layout classes ── */
        .cm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .cm-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .cm-main { flex: 1; min-width: 0; }
        .cm-sidebar { width: 272px; flex-shrink: 0; }

        .cm-stepper {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px 22px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .cm-stepper::-webkit-scrollbar { display: none; }

        .cm-account-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .cm-payment-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 10px;
        }
        .cm-sec-banner {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px 22px;
          margin-bottom: 18px;
          display: flex;
        }
        .cm-sec-left {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 14px;
          padding-right: 22px;
          border-right: 1px solid #E2E8F0;
        }
        .cm-sec-right {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 14px;
          padding-left: 22px;
        }
        .cm-merchants-table {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .cm-action-row {
          display: flex;
          gap: 12px;
        }
        .cm-back-btn {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 11px 24px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: DM Sans, sans-serif;
          white-space: nowrap;
        }
        .cm-continue-btn {
          flex: 1;
          border: none;
          border-radius: 10px;
          padding: 11px 0;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: DM Sans, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* ── Tablet ── */
        @media (max-width: 900px) {
          .cm-sidebar { width: 240px; }
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .cm-layout { flex-direction: column; align-items: stretch; }
          .cm-sidebar { width: 100%; }
          .cm-account-grid { grid-template-columns: repeat(2, 1fr); }
          .cm-payment-grid { grid-template-columns: repeat(4, 1fr); }
          .cm-sec-banner { flex-direction: column; }
          .cm-sec-left {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 14px;
            margin-bottom: 14px;
            flex: none;
          }
          .cm-sec-right { padding-left: 0; flex: none; }
        }

        /* ── Small mobile ── */
        @media (max-width: 600px) {
          .cm-account-grid { grid-template-columns: 1fr; }
          .cm-payment-grid { grid-template-columns: repeat(4, 1fr); }
          .cm-header { flex-direction: column; align-items: flex-start; }
          .cm-doc-btn { width: 100%; justify-content: center; }
          .cm-step-label { display: none; }
          .cm-step-label-active { display: inline !important; }
        }
      `}</style>

      {/* Edit modal */}
      {showEdit && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)', padding: '0 16px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 24 }}>Edit Merchant</div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Merchant Name</label>
              <input style={inp} value={editForm.merchant_name} onChange={e => setEditForm(f => ({ ...f, merchant_name: e.target.value }))} placeholder="Your Business Name" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Merchant ID</label>
              <input style={inp} value={editForm.merchant_mid} onChange={e => setEditForm(f => ({ ...f, merchant_mid: e.target.value }))} placeholder="MID123456" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>New UPI ID <span style={{ color: '#94A3B8', fontWeight: 400, textTransform: 'none' as const }}>(leave blank to keep existing)</span></label>
              <input style={inp} value={editForm.upi_id} onChange={e => setEditForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="business@upi" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 0', color: '#64748B', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={handleEditSave} style={{ flex: 2, background: '#2563EB', border: 'none', borderRadius: 10, padding: '11px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Connect Merchant Account</div>
        <div style={{ color: '#64748B', fontSize: 14 }}>Add a new merchant account to start receiving payments directly.</div>
      </div>

      {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 16px', color: '#059669', fontSize: 13, marginBottom: 16 }}>{success}</div>}

      {/* Two-column layout */}
      <div className="cm-layout">

        {/* Main column */}
        <div className="cm-main">

          {/* Step progress bar */}
          <div className="cm-stepper">
            {STEPS.map((s, i) => {
              const n      = i + 1;
              const active = n === step;
              const done   = n < step;
              return (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: active || done ? '#2563EB' : '#F1F5F9',
                      border: `2px solid ${active || done ? '#2563EB' : '#E2E8F0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: active || done ? '#fff' : '#94A3B8',
                    }}>
                      {done ? <Tick color="#fff" /> : n}
                    </div>
                    <span
                      className={active ? 'cm-step-label cm-step-label-active' : 'cm-step-label'}
                      style={{
                        fontSize: 12.5, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap' as const,
                        color: active ? '#0F172A' : done ? '#2563EB' : '#94A3B8',
                        display: 'inline',
                      }}
                    >{s}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 1.5, background: done ? '#2563EB' : '#E2E8F0', margin: '0 8px', minWidth: 12, flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── STEP 1: Account Type ── */}
          {step === 1 && (
            <>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '22px 22px 20px', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Choose Account Type</div>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Select how you want to receive payments</div>
                <div className="cm-account-grid">
                  {ACCOUNT_TYPES.map(type => {
                    const Icon        = type.icon;
                    const comingSoon  = type.id === 'bank' || type.id === 'virtual';
                    const selected    = accountType === type.id && !comingSoon;
                    return (
                      <div
                        key={type.id}
                        onClick={() => { if (!comingSoon) setAccountType(type.id); }}
                        style={{
                          border: `2px solid ${selected ? '#2563EB' : '#E2E8F0'}`, borderRadius: 12,
                          padding: '16px 15px', cursor: comingSoon ? 'default' : 'pointer',
                          background: comingSoon ? '#FAFAFA' : selected ? '#F8FBFF' : '#FFFFFF',
                          position: 'relative' as const, opacity: comingSoon ? 0.75 : 1,
                        }}
                      >
                        {/* Coming Soon badge */}
                        {comingSoon && (
                          <div style={{
                            position: 'absolute' as const, top: 11, right: 11,
                            background: '#F1F5F9', border: '1px solid #E2E8F0',
                            borderRadius: 100, padding: '2px 9px',
                            fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em',
                          }}>
                            COMING SOON
                          </div>
                        )}
                        {/* Radio (only for UPI) */}
                        {!comingSoon && (
                          <div style={{
                            position: 'absolute' as const, top: 13, right: 13, width: 18, height: 18,
                            borderRadius: '50%', border: `2px solid ${selected ? '#2563EB' : '#CBD5E1'}`,
                            background: selected ? '#2563EB' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                        )}
                        {/* Icon */}
                        <div style={{ width: 42, height: 42, borderRadius: 11, background: selected ? '#DBEAFE' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <Icon size={20} color={selected ? '#2563EB' : '#94A3B8'} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: comingSoon ? '#94A3B8' : '#0F172A', marginBottom: 3 }}>{type.title}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, lineHeight: 1.5 }}>{type.subtitle}</div>
                        {type.features.map(f => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Tick color={comingSoon ? '#CBD5E1' : '#2563EB'} />
                            </div>
                            <span style={{ fontSize: 11.5, color: comingSoon ? '#CBD5E1' : '#475569' }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Supported Payment Methods</div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 18 }}>Your account will support all major payment methods</div>
                <div className="cm-payment-grid">
                  {PAYMENT_METHODS.map(pm => (
                    <div key={pm.name} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 7 }}>
                      <div style={{ width: '100%', aspectRatio: '1', minWidth: 36, maxWidth: 56, borderRadius: 12, overflow: 'hidden', border: '1px solid #E8ECF2', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                        <img src={pm.logo} alt={pm.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <span style={{ fontSize: 9.5, color: '#475569', textAlign: 'center' as const, lineHeight: 1.3, fontWeight: 500 }}>{pm.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security banner */}
              <div className="cm-sec-banner">
                <div className="cm-sec-left">
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={19} color="#2563EB" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>100% Secure & Direct Payments</div>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>Payments are routed directly to your account. NovaPay does not hold or store any funds.</div>
                  </div>
                </div>
                <div className="cm-sec-right">
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Lock size={19} color="#2563EB" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>PCI DSS Compliant</div>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>Bank-level security with 256-bit encryption</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Business Details ── */}
          {step === 2 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Business Details</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 22 }}>Tell us about your business</div>
              <label style={lbl}>Business / Merchant Name *</label>
              <input style={inp} value={form.merchant_name} onChange={e => setForm(f => ({ ...f, merchant_name: e.target.value }))} placeholder="Acme Pvt. Ltd." />
            </div>
          )}

          {/* ── STEP 3: Bank / UPI Details ── */}
          {step === 3 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>UPI ID Details</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>Enter your payment receiving details</div>

              {/* Provider selector */}
              <label style={lbl}>Payment Provider *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { id: 'paytm',   label: 'Paytm Merchant', logo: '/payment-logos/paytm.jpeg',   color: '#00BAF2', active: true  },
                  { id: 'phonepe', label: 'PhonePe',         logo: '/payment-logos/phonepe.jpeg', color: '#5F259F', active: false },
                  { id: 'gpay',    label: 'Google Pay',      logo: '/payment-logos/gpay.png',     color: '#4285F4', active: false },
                ].map(p => {
                  const sel = providerType === p.id && p.active;
                  return (
                    <div
                      key={p.id}
                      onClick={() => { if (p.active) setProviderType(p.id); }}
                      style={{
                        border: `2px solid ${sel ? p.color : '#E2E8F0'}`,
                        borderRadius: 10, padding: '12px 10px',
                        cursor: p.active ? 'pointer' : 'default',
                        background: p.active ? '#FFFFFF' : '#FAFAFA',
                        opacity: p.active ? 1 : 0.6,
                        position: 'relative' as const,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      {!p.active && (
                        <div style={{
                          position: 'absolute' as const, top: -1, right: -1,
                          background: '#F1F5F9', border: '1px solid #E2E8F0',
                          borderRadius: '0 9px 0 6px', padding: '2px 7px',
                          fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em',
                        }}>SOON</div>
                      )}
                      <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', border: `1px solid ${sel ? p.color : '#E2E8F0'}`, flexShrink: 0 }}>
                        <img src={p.logo} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: p.active ? '#0F172A' : '#94A3B8', lineHeight: 1.2 }}>{p.label}</div>
                        {sel && <div style={{ fontSize: 10, color: p.color, fontWeight: 600, marginTop: 2 }}>Selected</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* UPI ID */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>UPI ID *</label>
                <input style={inp} value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="yourbusiness@paytm" />
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>This UPI ID will be used to receive all payments</div>
              </div>

              {/* Merchant ID */}
              <div>
                <label style={lbl}>Merchant ID *</label>
                <input style={inp} value={form.merchant_mid} onChange={e => setForm(f => ({ ...f, merchant_mid: e.target.value }))} placeholder="MID123456" />
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Your Paytm Merchant ID (MID) — find it in your Paytm Business dashboard</div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Verification ── */}
          {step === 4 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '40px 24px', marginBottom: 18, textAlign: 'center' as const }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={28} color="#2563EB" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Identity Verification</div>
              <div style={{ fontSize: 13, color: '#64748B', maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Your details will be verified against government records. This process is instant and secure.
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '18px 20px', textAlign: 'left' as const, maxWidth: 380, margin: '0 auto' }}>
                {['Business name verified', 'PAN validation pending', 'UPI ID reachability check', 'Fraud risk assessment'].map((item, i) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < 2 ? '#ECFDF5' : '#F1F5F9', border: `1px solid ${i < 2 ? '#A7F3D0' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i < 2 ? <Tick color="#059669" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} />}
                    </div>
                    <span style={{ fontSize: 13, color: i < 2 ? '#0F172A' : '#94A3B8' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 5: Review & Confirm ── */}
          {step === 5 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Review & Confirm</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 22 }}>Confirm your account details before connecting</div>
              {[
                ['Account Type',    selectedTypeName],
                ['Payment Provider', providerType === 'paytm' ? 'Paytm Merchant' : providerType],
                ['Business Name',   form.merchant_name],
                ['UPI ID',          form.upi_id],
                ['Merchant ID',     form.merchant_mid || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: label === 'UPI ID' ? 'monospace' : 'inherit' }}>{value || '—'}</span>
                </div>
              ))}
              <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '12px 16px', marginTop: 18, fontSize: 12, color: '#2563EB', lineHeight: 1.6 }}>
                By connecting this account, you agree that NovaPay can route payments to this account and verify it with your payment provider.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="cm-action-row">
            <button className="cm-back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : undefined}>
              {step > 1 ? '← Back' : 'Cancel'}
            </button>
            <button
              className="cm-continue-btn"
              onClick={handleContinue}
              disabled={saving}
              style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Connecting…' : step === 5 ? 'Connect Account' : 'Continue'}
              {!saving && <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="cm-sidebar">

          {/* Why Connect */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>Why Connect Your Account?</div>
            {WHY_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2, lineHeight: 1.45 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Requirements</div>
            {REQUIREMENTS.map(req => (
              <div key={req} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Tick />
                </div>
                <span style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>{req}</span>
              </div>
            ))}
          </div>

          {/* Need Help */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Need Help?</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>
              Our support team is here to help you connect your account.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#2563EB', fontSize: 13, fontWeight: 600, marginBottom: 12, cursor: 'pointer' }}>
              <BookOpen size={15} color="#2563EB" /> View Documentation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Mail size={15} color="#2563EB" /> Contact Support
            </div>
          </div>
        </div>
      </div>

      {/* Connected Merchants */}
      {(loading || providers.length > 0) && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Connected Merchants</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Manage your payment receiving accounts</div>
            </div>
            <div style={{ background: '#EFF6FF', borderRadius: 100, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#2563EB' }}>
              {providers.length} {providers.length === 1 ? 'account' : 'accounts'}
            </div>
          </div>

          {loading ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, overflowX: 'auto' as const }}>
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' as const }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {[
                      { label: 'Merchant',    w: '22%' },
                      { label: 'Provider',    w: '18%' },
                      { label: 'UPI ID',      w: '22%' },
                      { label: 'Merchant ID', w: '18%' },
                      { label: 'Status',      w: '10%' },
                      { label: 'Actions',     w: '10%' },
                    ].map(({ label, w }) => (
                      <th key={label} style={{ width: w, padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', whiteSpace: 'nowrap' as const }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, idx) => {
                    const providerLabel = p.provider === 'upi_direct' ? 'Paytm · UPI'
                      : p.provider === 'bharatpe' ? 'BharatPe'
                      : p.provider.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                    const initials = p.merchant_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: idx < providers.length - 1 ? '1px solid #F1F5F9' : 'none',
                          opacity: p.is_active ? 1 : 0.6,
                        }}
                      >
                        {/* Merchant */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                              background: p.is_active ? '#EFF6FF' : '#F1F5F9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 800, color: p.is_active ? '#2563EB' : '#94A3B8',
                            }}>{initials}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{p.merchant_name}</div>
                              {p.is_default && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 100, padding: '1px 6px', display: 'inline-block', marginTop: 2, letterSpacing: '0.05em' }}>DEFAULT</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Provider */}
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{providerLabel}</td>

                        {/* UPI ID */}
                        <td style={{ padding: '14px 16px', maxWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#0F172A', fontFamily: 'monospace', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={p.upi_id}>{p.upi_id || '—'}</div>
                        </td>

                        {/* Merchant ID */}
                        <td style={{ padding: '14px 16px', maxWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={p.merchant_mid}>{p.merchant_mid || '—'}</div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' as const }}>
                          <span style={{
                            background: p.is_active ? '#ECFDF5' : '#F1F5F9',
                            color: p.is_active ? '#059669' : '#94A3B8',
                            fontSize: 10, fontWeight: 700, padding: '3px 9px',
                            borderRadius: 100, letterSpacing: '0.06em',
                            border: `1px solid ${p.is_active ? '#A7F3D0' : '#E2E8F0'}`,
                          }}>
                            {p.is_active ? 'ACTIVE' : 'OFF'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            <button onClick={() => openEdit(p)} title="Edit" style={{ width: 30, height: 30, border: '1px solid #E2E8F0', borderRadius: 7, background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5M1 13l1.5-4L10.5 1 13 3.5 4.5 11.5 1 13Z" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button onClick={() => handleToggle(p)} title={p.is_active ? 'Disable' : 'Enable'} style={{ width: 30, height: 30, border: `1px solid ${p.is_active ? '#FDE68A' : '#DBEAFE'}`, borderRadius: 7, background: p.is_active ? '#FFFBEB' : '#EFF6FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="7" rx="3.5" stroke={p.is_active ? '#D97706' : '#2563EB'} strokeWidth="1.4"/><circle cx={p.is_active ? 9.5 : 4.5} cy="7.5" r="2" fill={p.is_active ? '#D97706' : '#2563EB'}/></svg>
                            </button>
                            <button onClick={() => handleDelete(p)} title="Delete" style={{ width: 30, height: 30, border: '1px solid #FECACA', borderRadius: 7, background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2h3v1.5M5 6v4.5M9 6v4.5M3 3.5l.5 8h7l.5-8" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
