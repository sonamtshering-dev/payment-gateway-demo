'use client';
import React, { useEffect, useState } from 'react';

const PROVIDERS = ['upi_direct', 'phonepe', 'paytm', 'gpay', 'bharatpe', 'other'];

const PROVIDER_COLORS: Record<string, string> = {
  'PhonePe Business':      'rgba(88,5,200,0.15)',
  'Paytm Business':        'rgba(0,147,255,0.12)',
  'Google Pay Business':   'rgba(66,133,244,0.12)',
  'BharatPe':              'rgba(0,185,100,0.12)',
  'Other':                 'rgba(100,116,139,0.12)',
};

const PROVIDER_ICONS: Record<string, string> = {
  'PhonePe Business': '💜', 'Paytm Business': '💙',
  'Google Pay Business': '💳', 'BharatPe': '💚', 'Other': '🏦',
};

interface Provider {
  id: string; provider: string; merchant_name: string;
  merchant_mid: string; upi_id: string; is_active: boolean; is_default: boolean;
}

const inp: React.CSSProperties = { width: '100%', background: '#030d1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#dbeafe', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' };
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

export default function MerchantDetailsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<Provider | null>(null);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ provider: PROVIDERS[0], merchant_name: '', merchant_mid: '', upi_id: '' });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch('/api/v1/dashboard/providers', { headers })
      .then(r => r.json())
      .then(d => setProviders(d.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 3500); }
    else       { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); }
  };

  const openAdd = () => { setEditTarget(null); setForm({ provider: PROVIDERS[0], merchant_name: '', merchant_mid: '', upi_id: '' }); setShowForm(true); };
  const openEdit = (p: Provider) => { setEditTarget(p); setForm({ provider: p.provider, merchant_name: p.merchant_name, merchant_mid: p.merchant_mid, upi_id: '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.merchant_name.trim()) { flash('Merchant name is required', true); return; }
    if (!editTarget && !form.upi_id.includes('@')) { flash('Enter a valid UPI ID', true); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const body: any = { merchant_name: form.merchant_name, merchant_mid: form.merchant_mid };
        if (form.upi_id) body.upi_id = form.upi_id;
        const r = await fetch(`/api/v1/dashboard/providers/${editTarget.id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Update failed');
        flash('Merchant updated');
      } else {
        const r = await fetch('/api/v1/dashboard/providers', { method: 'POST', headers, body: JSON.stringify({...form, merchant_mid: form.merchant_mid || 'NA'}) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Connect failed');
        flash('Merchant connected');
      }
      setShowForm(false); load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleToggle = async (p: Provider) => {
    try {
      const r = await fetch(`/api/v1/dashboard/providers/${p.id}`, { method: 'PUT', headers, body: JSON.stringify({ is_active: !p.is_active }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      flash(p.is_active ? 'Merchant disabled' : 'Merchant enabled');
      load();
    } catch (e: any) { flash(e.message, true); }
  };

  const handleDelete = async (p: Provider) => {
    if (!confirm(`Delete ${p.merchant_name}? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/v1/dashboard/providers/${p.id}`, { method: 'DELETE', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      flash('Merchant deleted');
      load();
    } catch (e: any) { flash(e.message, true); }
  };

  return (
    <div style={{ padding: 32, color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Merchant Details</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Manage your connected payment providers.</p>
        </div>
        <button onClick={openAdd} style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 10, padding: '11px 22px', color: '#020817', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          + Connect Merchant
        </button>
      </div>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 16px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8, padding: '10px 16px', color: '#3b82f6', fontSize: 13, marginBottom: 16 }}>{success}</div>}

      {/* ── MODAL FORM ── */}
      {showForm && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, width: 440, maxWidth: '90vw' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>{editTarget ? 'Edit Merchant' : 'Connect Merchant'}</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b9ab5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>Payment Provider</label>
              <select style={sel} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b9ab5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>Merchant Name</label>
              <input style={inp} value={form.merchant_name} onChange={e => setForm(f => ({ ...f, merchant_name: e.target.value }))} placeholder="Your Business Name" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b9ab5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>Merchant ID</label>
              <input style={inp} value={form.merchant_mid} onChange={e => setForm(f => ({ ...f, merchant_mid: e.target.value }))} placeholder="MID123456" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b9ab5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>
                UPI ID {editTarget && <span style={{ color: '#4b5563', fontWeight: 400, textTransform: 'none' as const }}>(leave blank to keep existing)</span>}
              </label>
              <input style={inp} value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="business@upi" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 0', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 10, padding: '11px 0', color: saving ? '#4b5563' : '#020817', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CARDS ── */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 64, color: '#4b5563' }}>Loading…</div>
      ) : providers.length === 0 ? (
        <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '64px 24px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No merchants connected</div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Connect your first payment provider to start accepting payments.</div>
          <button onClick={openAdd} style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 10, padding: '11px 28px', color: '#020817', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Connect Merchant</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {providers.map(p => (
            <div key={p.id} style={{ background: '#0f1d35', border: `1px solid ${p.is_active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: 24, opacity: p.is_active ? 1 : 0.6, transition: 'all 0.2s' }}>
              {/* header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: PROVIDER_COLORS[p.provider] || PROVIDER_COLORS['Other'], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {PROVIDER_ICONS[p.provider] || '🏦'}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>{p.merchant_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.provider}</div>
                  </div>
                </div>
                <span style={{ background: p.is_active ? 'rgba(59,130,246,0.10)' : 'rgba(100,116,139,0.10)', color: p.is_active ? '#3b82f6' : '#64748b', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, letterSpacing: '0.06em' }}>
                  {p.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              {/* details */}
              {[['Merchant ID', p.merchant_mid || '—'], ['UPI ID', p.upi_id], ['Default', p.is_default ? 'Yes' : 'No']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ color: '#dbeafe', fontWeight: 500, fontFamily: k === 'UPI ID' ? 'monospace' : 'inherit', fontSize: k === 'UPI ID' ? 12 : 13 }}>{v}</span>
                </div>
              ))}

              {/* actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                <button onClick={() => openEdit(p)} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 0', color: '#8b9ab5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleToggle(p)} style={{ flex: 1, background: p.is_active ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${p.is_active ? 'rgba(245,158,11,0.20)' : 'rgba(59,130,246,0.20)'}`, borderRadius: 8, padding: '8px 0', color: p.is_active ? '#f59e0b' : '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {p.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(p)} style={{ flex: 1, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '8px 0', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}