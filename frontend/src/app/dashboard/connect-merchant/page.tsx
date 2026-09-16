'use client';
import React, { useEffect, useState } from 'react';
import {
  Building2, Smartphone, Server, ShieldCheck, Lock,
  BookOpen, Mail, Zap, Layers, BarChart3, TrendingUp, ArrowRight, CheckCircle2,
} from 'lucide-react';

interface Provider {
  id: string; provider: string; merchant_name: string;
  merchant_mid: string; upi_id: string; is_active: boolean; is_default: boolean;
}

const ACCOUNT_TYPES = [
  { id: 'bank',    icon: Building2, title: 'Bank Account',    subtitle: 'IMPS / NEFT / RTGS',             provider: 'bank_transfer', comingSoon: true  },
  { id: 'upi',     icon: Smartphone, title: 'UPI ID',         subtitle: 'Instant · All apps supported',   provider: 'upi_direct',    comingSoon: false },
  { id: 'virtual', icon: Server,     title: 'Virtual Account', subtitle: 'Dedicated account number',      provider: 'bharatpe',      comingSoon: true  },
];

const PAYMENT_METHODS = [
  { name: 'PhonePe',    logo: '/payment-logos/phonepe.jpeg' },
  { name: 'Google Pay', logo: '/payment-logos/gpay.png'     },
  { name: 'Paytm',      logo: '/payment-logos/paytm.jpeg'   },
];

const PAYMENT_PROVIDERS = [
  {
    id: 'paytm',   label: 'Paytm',      logo: '/payment-logos/paytm.jpeg',
    color: '#00BAF2', active: true,
    upiHint: 'e.g. yourbusiness@paytm',
    midLabel: 'Paytm Merchant ID (MID)',
    midHint: 'Paytm Business App → Settings → Business Profile → Merchant ID',
    extraFields: false,
  },
  {
    id: 'phonepe', label: 'PhonePe',    logo: '/payment-logos/phonepe.jpeg',
    color: '#5F259F', active: true,
    upiHint: 'e.g. yourbusiness@ybl',
    midLabel: 'PhonePe Merchant ID',
    midHint: 'business.phonepe.com → API & Plugin → Merchant ID',
    extraFields: true,
  },
  {
    id: 'gpay',    label: 'Google Pay', logo: '/payment-logos/gpay.png',
    color: '#4285F4', active: false,
    upiHint: '', midLabel: '', midHint: '', extraFields: false,
  },
];

const STEPS = ['Account', 'Business', 'UPI Details', 'Verify', 'Confirm'];

const WHY = [
  { icon: TrendingUp, title: 'Direct to your account',  desc: 'No intermediaries, 100% direct transfer.' },
  { icon: Zap,        title: 'Auto-verified payments',   desc: 'Gateway polls every 5s, marks paid instantly.' },
  { icon: Layers,     title: 'Multiple UPI support',     desc: 'Smart routing across accounts.' },
  { icon: BarChart3,  title: 'Full analytics',           desc: 'Every transaction tracked with audit trail.' },
];

const REQUIREMENTS = [
  'Valid business or personal details',
  'Active UPI ID (Paytm or PhonePe)',
  'Merchant ID from your payment app',
  'Mobile number & email ID',
  'KYC verification',
];

const inp: React.CSSProperties = {
  width: '100%', background: '#FAFBFF', border: '1.5px solid #E2E8F0',
  borderRadius: 8, padding: '10px 13px', color: '#0F172A', fontSize: 13.5,
  fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
  transition: 'border-color .15s',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6,
};
const hint: React.CSSProperties = { fontSize: 11.5, color: '#94A3B8', marginTop: 5, lineHeight: 1.5 };

function Tick({ color = '#2563EB', size = 10 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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
  const [providerID, setProviderID]   = useState('paytm');
  const [form, setForm] = useState({ merchant_name: '', merchant_mid: '', upi_id: '', salt_key: '', salt_index: '1' });
  const [saving, setSaving]   = useState(false);
  const [showSalt, setShowSalt] = useState(false);

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
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const sel = PAYMENT_PROVIDERS.find(p => p.id === providerID)!;

  const handleContinue = async () => {
    if (step === 2 && !form.merchant_name.trim()) { flash('Business name is required', true); return; }
    if (step === 3) {
      if (!form.upi_id.includes('@')) { flash('Enter a valid UPI ID (e.g. business@paytm)', true); return; }
      if (!form.merchant_mid.trim())  { flash(`${sel.midLabel} is required`, true); return; }
      if (providerID === 'phonepe' && !form.salt_key.trim()) { flash('PhonePe Salt Key is required', true); return; }
    }
    if (step < 5) { setStep(s => s + 1); return; }

    setSaving(true);
    try {
      const selectedType = ACCOUNT_TYPES.find(t => t.id === accountType);
      const body: any = {
        provider: providerID === 'paytm' ? 'paytm' : providerID === 'phonepe' ? 'phonepe' : (selectedType?.provider || 'upi_direct'),
        merchant_name: form.merchant_name,
        merchant_mid:  form.merchant_mid || 'NA',
        upi_id:        form.upi_id,
      };
      if (providerID === 'phonepe') { body.phonepe_salt_key = form.salt_key; body.phonepe_salt_index = form.salt_index || '1'; }
      const r = await fetch('/api/v1/dashboard/providers', { method: 'POST', headers, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Connect failed');
      flash(`${sel.label} merchant connected! Auto-verification is active.`);
      setStep(1); setForm({ merchant_name: '', merchant_mid: '', upi_id: '', salt_key: '', salt_index: '1' }); setProviderID('paytm'); load();
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

  const openEdit = (p: Provider) => { setEditTarget(p); setEditForm({ merchant_name: p.merchant_name, merchant_mid: p.merchant_mid, upi_id: '' }); setShowEdit(true); };

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

        /* ── outer two-column layout ── */
        .cm-wrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 16px;
          align-items: start;
        }
        .cm-sidebar { min-width: 0; }

        /* ── step 1: account type — compact rows ── */
        .cm-account-list { display: flex; flex-direction: column; gap: 8px; }
        .cm-account-row {
          display: flex; align-items: center; gap: 12px;
          border: 1.5px solid #E2E8F0; border-radius: 10px;
          padding: 12px 14px; cursor: pointer; background: #fff;
          transition: border-color .15s, background .15s;
          position: relative;
        }
        .cm-account-row.selected { border-color: #2563EB; background: #F0F6FF; }
        .cm-account-row.soon { opacity: 0.55; cursor: default; }

        /* ── step 3: provider selector ── */
        .cm-provider-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px; margin-bottom: 16px;
        }
        .cm-pcard {
          border: 2px solid #E2E8F0; border-radius: 9px;
          padding: 10px; cursor: pointer; background: #fff;
          display: flex; align-items: center; gap: 8px;
          position: relative; transition: border-color .15s;
          min-width: 0;
        }

        /* ── stepper ── */
        .cm-stepper {
          background: #fff; border: 1px solid #E2E8F0; border-radius: 12px;
          padding: 12px 16px; margin-bottom: 14px;
          display: flex; align-items: center; gap: 0;
          overflow-x: auto; scrollbar-width: none;
        }
        .cm-stepper::-webkit-scrollbar { display: none; }

        /* ── payment logos ── */
        .cm-pay-row { display: flex; gap: 10px; flex-wrap: wrap; }

        /* ── security strip ── */
        .cm-sec { display: flex; flex-direction: column; gap: 10px; }

        /* ── action row ── */
        .cm-actions { display: flex; gap: 10px; margin-top: 14px; }
        .cm-back { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 11px 20px; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; font-family: DM Sans, sans-serif; white-space: nowrap; }
        .cm-next { flex: 1; border: none; border-radius: 10px; padding: 12px 0; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: DM Sans, sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; }

        @media (max-width: 860px) {
          .cm-wrap { grid-template-columns: 1fr; }
          .cm-sidebar { display: none; }
        }
        @media (max-width: 520px) {
          .cm-provider-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* Edit modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)', padding: '0 16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 26, width: '100%', maxWidth: 420, animation: 'fadeIn .2s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Merchant</div>
            {[['Business Name', 'merchant_name', 'Your Business'], ['Merchant ID', 'merchant_mid', 'MID123'], ['New UPI ID', 'upi_id', 'business@upi (leave blank to keep)']].map(([l, k, ph]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={lbl}>{l}</label>
                <input style={inp} value={(editForm as any)[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 9, padding: '10px 0', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={handleEditSave} style={{ flex: 2, background: '#2563EB', border: 'none', borderRadius: 9, padding: '11px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Connect Merchant Account</div>
        <div style={{ color: '#64748B', fontSize: 13 }}>Add a merchant account to start receiving auto-verified payments.</div>
      </div>

      {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 12.5, marginBottom: 14 }}>{error}</div>}
      {success && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', color: '#059669', fontSize: 12.5, marginBottom: 14 }}>{success}</div>}

      <div className="cm-wrap">

        {/* ── LEFT: Wizard ── */}
        <div>

          {/* Stepper */}
          <div className="cm-stepper">
            {STEPS.map((s, i) => {
              const n = i + 1; const active = n === step; const done = n < step;
              return (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: active || done ? '#2563EB' : '#F1F5F9', border: `2px solid ${active || done ? '#2563EB' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: active || done ? '#fff' : '#94A3B8' }}>
                      {done ? <Tick color="#fff" size={9} /> : n}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', color: active ? '#0F172A' : done ? '#2563EB' : '#94A3B8' }}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: done ? '#2563EB' : '#E2E8F0', margin: '0 6px', minWidth: 8 }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '18px', marginBottom: 14, animation: 'fadeIn .2s ease' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Choose Account Type</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>How do you want to receive payments?</div>

              <div className="cm-account-list">
                {ACCOUNT_TYPES.map(type => {
                  const Icon = type.icon; const isSel = accountType === type.id && !type.comingSoon;
                  return (
                    <div key={type.id} className={`cm-account-row${isSel ? ' selected' : ''}${type.comingSoon ? ' soon' : ''}`}
                      onClick={() => { if (!type.comingSoon) setAccountType(type.id); }}>
                      {type.comingSoon && (
                        <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, fontWeight: 700, color: '#94A3B8', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 100, padding: '1px 6px', letterSpacing: '0.05em' }}>SOON</span>
                      )}
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: isSel ? '#DBEAFE' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={17} color={isSel ? '#2563EB' : '#94A3B8'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: type.comingSoon ? '#94A3B8' : '#0F172A' }}>{type.title}</div>
                        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>{type.subtitle}</div>
                      </div>
                      {!type.comingSoon && (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isSel ? '#2563EB' : '#CBD5E1'}`, background: isSel ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Supported apps */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Supported on all UPI apps</div>
                <div className="cm-pay-row">
                  {PAYMENT_METHODS.map(pm => (
                    <div key={pm.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', border: '1px solid #E8ECF2', flexShrink: 0 }}>
                        <img src={pm.logo} alt={pm.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{pm.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security strip */}
              <div className="cm-sec" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                {[
                  { icon: ShieldCheck, title: '100% Secure & Direct', desc: 'Payments go directly to your account. NovaPay never holds funds.' },
                  { icon: Lock,        title: 'PCI DSS Compliant',     desc: 'Bank-level security with 256-bit AES encryption.' },
                ].map(({ icon: Icon, title: t, desc: d }) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color="#2563EB" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{t}</div>
                      <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '18px', marginBottom: 14, animation: 'fadeIn .2s ease' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Business Details</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 18 }}>Tell us about your business</div>
              <label style={lbl}>Business / Merchant Name *</label>
              <input style={inp} value={form.merchant_name} onChange={e => setForm(f => ({ ...f, merchant_name: e.target.value }))} placeholder="Acme Pvt. Ltd." autoComplete="off" />
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '18px', marginBottom: 14, animation: 'fadeIn .2s ease' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>UPI & Provider Details</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 18 }}>Select your provider and enter credentials</div>

              {/* Provider selector */}
              <label style={lbl}>Payment Provider *</label>
              <div className="cm-provider-grid">
                {PAYMENT_PROVIDERS.map(p => {
                  const isSel = providerID === p.id && p.active;
                  return (
                    <div key={p.id} className="cm-pcard"
                      onClick={() => { if (p.active) { setProviderID(p.id); setForm(f => ({ ...f, merchant_mid: '', upi_id: '', salt_key: '', salt_index: '1' })); } }}
                      style={{ border: `2px solid ${isSel ? p.color : '#E2E8F0'}`, background: isSel ? '#FAFBFF' : p.active ? '#fff' : '#FAFAFA', opacity: p.active ? 1 : 0.55, cursor: p.active ? 'pointer' : 'default' }}>
                      {!p.active && <div style={{ position: 'absolute', top: -1, right: -1, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0 7px 0 5px', padding: '2px 6px', fontSize: 8, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>SOON</div>}
                      <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', border: `1px solid ${isSel ? p.color+'44' : '#E2E8F0'}`, flexShrink: 0 }}>
                        <img src={p.logo} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: p.active ? '#0F172A' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</div>
                        {isSel && <div style={{ fontSize: 10, color: p.color, fontWeight: 600 }}>✓ Selected</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* UPI ID */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>UPI ID *</label>
                <input style={inp} value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))}
                  placeholder={sel?.upiHint || 'yourbusiness@upi'}
                  autoComplete="off" data-1p-ignore data-lpignore="true" />
                <p style={hint}>This UPI ID will receive all payments from your customers</p>
              </div>

              {/* Merchant ID */}
              <div style={{ marginBottom: providerID === 'phonepe' ? 18 : 0 }}>
                <label style={lbl}>{sel?.midLabel || 'Merchant ID'} *</label>
                <input style={inp} value={form.merchant_mid} onChange={e => setForm(f => ({ ...f, merchant_mid: e.target.value }))}
                  placeholder={providerID === 'phonepe' ? 'e.g. PGTESTPAYUAT' : 'e.g. MID123456'}
                  autoComplete="off" data-1p-ignore data-lpignore="true"
                  name={`mid-${providerID}-field`} />
                <p style={hint}>{sel?.midHint}</p>
              </div>

              {/* PhonePe credentials block */}
              {providerID === 'phonepe' && (
                <div style={{ border: '1.5px solid #DDD6FE', borderRadius: 12, overflow: 'hidden', animation: 'fadeIn .2s ease' }}>
                  {/* Header gradient */}
                  <div style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShieldCheck size={15} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Auto-Verify Credentials</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.65)' }}>AES-256 encrypted · Never stored in plaintext</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 700, color: '#fff' }}> Secure</div>
                  </div>

                  {/* Step-by-step guide */}
                  <div style={{ background: '#FAF8FF', padding: '12px 16px', borderBottom: '1px solid #EDE9FE' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>How to get your credentials</div>
                    {[
                      'Go to business.phonepe.com',
                      'Login with your PhonePe Business account',
                      'Navigate to API & Plugin section',
                      'Copy your Merchant ID, Salt Key & Salt Index',
                    ].map((text, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, marginBottom: i < 3 ? 8 : 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#7C3AED', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                        <div style={{ fontSize: 12, color: '#4C1D95', lineHeight: 1.55 }}>
                          {i === 0 ? <><span>{text.split('business.phonepe.com')[0]}</span><span style={{ color: '#7C3AED', fontWeight: 700 }}>business.phonepe.com</span></> : text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Salt Key + Index inputs */}
                  <div style={{ background: '#fff', padding: '14px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ ...lbl, color: '#7C3AED' }}>Salt Key *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            style={{ ...inp, border: '1.5px solid #DDD6FE', background: '#FAFBFF', paddingRight: form.salt_key ? 36 : 13 }}
                            type={showSalt ? 'text' : 'password'}
                            value={form.salt_key}
                            onChange={e => setForm(f => ({ ...f, salt_key: e.target.value }))}
                            placeholder="Paste your Salt Key"
                            autoComplete="new-password" data-1p-ignore data-lpignore="true"
                            name="pp-salt-key-x7k"
                          />
                          {form.salt_key && (
                            <button type="button" onClick={() => setShowSalt(s => !s)}
                              style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', fontSize: 11, fontWeight: 600, padding: 2 }}>
                              {showSalt ? 'hide' : 'show'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ ...lbl, color: '#7C3AED' }}>Salt Index</label>
                        <input
                          style={{ ...inp, border: '1.5px solid #DDD6FE', background: '#FAFBFF', textAlign: 'center', fontWeight: 700 }}
                          value={form.salt_index}
                          onChange={e => setForm(f => ({ ...f, salt_index: e.target.value }))}
                          placeholder="1"
                          autoComplete="off" data-1p-ignore name="pp-salt-idx-x7k"
                        />
                        <p style={{ ...hint, fontSize: 10 }}>Usually "1"</p>
                      </div>
                    </div>

                    {/* Status indicator */}
                    {form.salt_key && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '7px 12px', display: 'flex', gap: 7, alignItems: 'center' }}>
                        <CheckCircle2 size={14} color="#16A34A" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: '#15803D' }}>Salt Key entered successfully.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '32px 18px', marginBottom: 14, textAlign: 'center', animation: 'fadeIn .2s ease' }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={24} color="#2563EB" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Identity Verification</div>
              <div style={{ fontSize: 12.5, color: '#64748B', maxWidth: 320, margin: '0 auto 20px', lineHeight: 1.6 }}>
                Your details will be verified against your payment provider's records. Instant and secure.
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', textAlign: 'left', maxWidth: 320, margin: '0 auto' }}>
                {['Business name validated', 'UPI ID format checked', 'Provider credentials verified', 'Fraud risk assessment'].map((item, i) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: i < 3 ? 9 : 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: i < 2 ? '#ECFDF5' : '#F1F5F9', border: `1px solid ${i < 2 ? '#A7F3D0' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i < 2 ? <Tick color="#059669" /> : <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1' }} />}
                    </div>
                    <span style={{ fontSize: 12.5, color: i < 2 ? '#0F172A' : '#94A3B8' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 5 ── */}
          {step === 5 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '18px', marginBottom: 14, animation: 'fadeIn .2s ease' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Review & Confirm</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 18 }}>Confirm details before connecting</div>
              {[
                ['Account Type',    ACCOUNT_TYPES.find(t => t.id === accountType)?.title || ''],
                ['Provider',        sel?.label],
                ['Business Name',   form.merchant_name],
                ['UPI ID',          form.upi_id],
                ['Merchant ID',     form.merchant_mid || '—'],
                ...(providerID === 'phonepe' ? [['Salt Key', '••••••••••']] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 12.5, color: '#64748B' }}>{label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', fontFamily: label === 'UPI ID' ? 'monospace' : 'inherit' }}>{value || '—'}</span>
                </div>
              ))}

            </div>
          )}

          {/* Actions */}
          <div className="cm-actions">
            <button className="cm-back" onClick={() => step > 1 ? setStep(s => s - 1) : undefined}>
              {step > 1 ? '← Back' : 'Cancel'}
            </button>
            <button className="cm-next" onClick={handleContinue} disabled={saving}
              style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Connecting…' : step === 5 ? 'Connect Account' : 'Continue'}
              {!saving && <ArrowRight size={14} />}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="cm-sidebar">
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>Why Connect?</div>
            {WHY.map(({ icon: Icon, title: t, desc: d }) => (
              <div key={t} style={{ display: 'flex', gap: 9, marginBottom: 13 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>{t}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>Requirements</div>
            {REQUIREMENTS.map(req => (
              <div key={req} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Tick size={8} />
                </div>
                <span style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>{req}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, padding: '16px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Need Help?</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>Our team is here to help you connect.</div>
            {[{ icon: BookOpen, label: 'View Documentation' }, { icon: Mail, label: 'Contact Support' }].map(({ icon: Icon, label: l }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#2563EB', fontSize: 12, fontWeight: 600, marginBottom: 8, cursor: 'pointer' }}>
                <Icon size={13} color="#2563EB" /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Connected Merchants table ── */}
      {(loading || providers.length > 0) && (
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Connected Merchants</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>Manage your payment receiving accounts</div>
            </div>
            <div style={{ background: '#EFF6FF', borderRadius: 100, padding: '3px 12px', fontSize: 11.5, fontWeight: 700, color: '#2563EB' }}>
              {providers.length} {providers.length === 1 ? 'account' : 'accounts'}
            </div>
          </div>

          {loading ? (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, display: 'flex', justifyContent: 'center', padding: 44 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 13, overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Merchant', 'Provider', 'UPI ID', 'Merchant ID', 'Status', 'Actions'].map(col => (
                      <th key={col} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, idx) => {
                    const provLabel = p.provider === 'upi_direct' ? 'Paytm · UPI' : p.provider === 'phonepe' ? 'PhonePe' : p.provider === 'bharatpe' ? 'BharatPe' : p.provider.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                    const initials  = p.merchant_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                    const provColor = p.provider === 'phonepe' ? '#5F259F' : '#00BAF2';
                    return (
                      <tr key={p.id} style={{ borderBottom: idx < providers.length - 1 ? '1px solid #F1F5F9' : 'none', opacity: p.is_active ? 1 : 0.6 }}>
                        <td style={{ padding: '12px 13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: p.is_active ? '#EFF6FF' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: p.is_active ? '#2563EB' : '#94A3B8' }}>{initials}</div>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.merchant_name}</div>
                              {p.is_default && <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 100, padding: '1px 6px', display: 'inline-block', marginTop: 2 }}>DEFAULT</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 13px' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: provColor, background: `${provColor}14`, border: `1px solid ${provColor}30`, borderRadius: 100, padding: '3px 8px', whiteSpace: 'nowrap' }}>{provLabel}</span>
                        </td>
                        <td style={{ padding: '12px 13px', maxWidth: 140 }}>
                          <div style={{ fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.upi_id}>{p.upi_id || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 13px', maxWidth: 130 }}>
                          <div style={{ fontSize: 11.5, color: '#64748B', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.merchant_mid}>{p.merchant_mid || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 13px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: p.is_active ? '#ECFDF5' : '#F1F5F9', color: p.is_active ? '#059669' : '#94A3B8', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, border: `1px solid ${p.is_active ? '#A7F3D0' : '#E2E8F0'}` }}>
                            {p.is_active ? 'ACTIVE' : 'OFF'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 13px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {[
                              { title: 'Edit',   color: '#475569', bg: '#F8FAFC', bdr: '#E2E8F0', fn: () => openEdit(p),     icon: <path d="M9.5 2L12 4.5M1 13l1.5-4L10.5 1 13 3.5 4.5 11.5 1 13Z" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/> },
                              { title: p.is_active ? 'Disable' : 'Enable', color: '', bg: p.is_active ? '#FFFBEB' : '#EFF6FF', bdr: p.is_active ? '#FDE68A' : '#DBEAFE', fn: () => handleToggle(p), icon: null },
                              { title: 'Delete', color: '#DC2626', bg: '#FEF2F2', bdr: '#FECACA', fn: () => handleDelete(p), icon: <path d="M2 3.5h10M5.5 3.5V2h3v1.5M5 6v4.5M9 6v4.5M3 3.5l.5 8h7l.5-8" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/> },
                            ].map(({ title, bg, bdr, fn, icon }) => (
                              <button key={title} onClick={fn} title={title} style={{ width: 27, height: 27, border: `1px solid ${bdr}`, borderRadius: 6, background: bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {icon
                                  ? <svg width="12" height="12" viewBox="0 0 14 14" fill="none">{icon}</svg>
                                  : <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="7" rx="3.5" stroke={p.is_active ? '#D97706' : '#2563EB'} strokeWidth="1.4"/><circle cx={p.is_active ? 9.5 : 4.5} cy="7.5" r="2" fill={p.is_active ? '#D97706' : '#2563EB'}/></svg>
                                }
                              </button>
                            ))}
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
