'use client';
import { useEffect, useState } from 'react';

export default function ConnectMerchantPage() {
  const [upis, setUpis]           = useState<any[]>([]);
  const [newUPI, setNewUPI]       = useState('');
  const [label, setLabel]         = useState('');
  const [paytmMID, setPaytmMID]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [savingMID, setSavingMID] = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 5000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  };

  const loadUPIs = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/v1/dashboard/upi', { headers });
      const d = await r.json();
      if (d.success) setUpis(d.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadUPIs(); }, []);

  const addUPI = async () => {
    if (!newUPI.trim()) { flash('Enter a UPI ID', true); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/v1/dashboard/upi', {
        method: 'POST', headers,
        body: JSON.stringify({ upi_id: newUPI.trim(), label: label.trim() || 'My UPI' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('UPI ID added!');
      setNewUPI(''); setLabel('');
      loadUPIs();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const saveMID = async (upiId: string, mid: string) => {
    if (!mid.trim()) { flash('Enter your Paytm MID', true); return; }
    setSavingMID(upiId);
    try {
      const r = await fetch('/api/v1/dashboard/paytm-mid', {
        method: 'POST', headers,
        body: JSON.stringify({ upi_id: upiId, paytm_mid: mid.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      flash('Paytm MID saved! Auto-verification is now active ✅');
      loadUPIs();
    } catch (e: any) { flash(e.message, true); }
    finally { setSavingMID(''); }
  };

  const deleteUPI = async (id: string) => {
    if (!confirm('Remove this UPI ID?')) return;
    try {
      await fetch(`/api/v1/dashboard/upi/${id}`, { method: 'DELETE', headers });
      flash('UPI ID removed'); loadUPIs();
    } catch { flash('Failed to remove', true); }
  };

  const inp: React.CSSProperties = {
    width: '100%', background: '#030d1f', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '11px 14px', color: '#dbeafe', fontSize: 13,
    fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6,
  };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 700 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        Connect Merchant
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 28 }}>
        Add your UPI ID to receive payments. Connect your Paytm MID for automatic payment verification.
      </div>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', color: '#93c5fd', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      {/* Add UPI */}
      <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Add UPI ID</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>UPI ID *</label>
            <input style={inp} placeholder="yourname@oksbi" value={newUPI} onChange={e => setNewUPI(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Label</label>
            <input style={inp} placeholder="My Primary UPI" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
        </div>
        <button onClick={addUPI} disabled={saving} style={{ background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '11px 24px', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Adding…' : 'Add UPI ID'}
        </button>
      </div>

      {/* Paytm Auto-Verify Info Banner */}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>
          ⚡ Automatic Payment Verification
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          Connect your <strong style={{ color: '#dbeafe' }}>Paytm Business MID</strong> to enable automatic payment confirmation.
          When a customer pays, your gateway checks Paytm every 5 seconds and marks the payment as paid automatically — no manual action needed.
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
          Find your MID: Paytm Business App → Settings → Business Profile → Merchant ID
        </div>
      </div>

      {/* Existing UPIs */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 40, color: '#4b5563' }}>Loading…</div>
      ) : upis.length === 0 ? (
        <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 40, textAlign: 'center' as const, color: '#4b5563' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#dbeafe', marginBottom: 6 }}>No UPI IDs yet</div>
          <div style={{ fontSize: 13 }}>Add a UPI ID above to start accepting payments</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
          {upis.map((upi: any) => (
            <div key={upi.id} style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>{upi.label || 'UPI ID'}</div>
                  <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>{upi.upi_id_display || upi.label}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {upi.paytm_enabled && (
                    <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                      ⚡ Auto-Verify ON
                    </span>
                  )}
                  <span style={{ background: upi.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: upi.is_active ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                    {upi.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => deleteUPI(upi.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 12px', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Remove</button>
                </div>
              </div>

              {/* Paytm MID section */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                <label style={{ ...lbl, marginBottom: 8 }}>
                  Paytm Business MID
                  <span style={{ marginLeft: 8, fontSize: 10, color: '#64748b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    — Enables automatic payment verification
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...inp, flex: 1 }}
                    placeholder="e.g. YOURB12345678901"
                    defaultValue={upi.paytm_mid || ''}
                    onChange={e => setPaytmMID(e.target.value)}
                    onBlur={e => setPaytmMID(e.target.value)}
                  />
                  <button
                    onClick={() => saveMID(upi.id, paytmMID)}
                    disabled={savingMID === upi.id}
                    style={{ background: savingMID === upi.id ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '0 20px', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: savingMID === upi.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const }}
                  >
                    {savingMID === upi.id ? 'Saving…' : upi.paytm_enabled ? 'Update MID' : 'Enable Auto-Verify'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}