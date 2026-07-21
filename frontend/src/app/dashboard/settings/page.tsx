'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { MerchantUPI } from '@/types';

export default function SettingsPage() {
  const [upis, setUpis]           = useState<MerchantUPI[]>([]);
  const [profile, setProfile]     = useState<any>(null);
  const [newUPI, setNewUPI]       = useState('');
  const [newLabel, setNewLabel]   = useState('');
  const [addingUPI, setAddingUPI] = useState(false);
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    api.getProfile().then((r: any) => { if (r.success) setProfile(r.data); });
    api.listUPIs().then((r: any) => { if (r.success) setUpis(r.data || []); });
  }, []);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setMessage(''); } else { setMessage(msg); setError(''); }
  };

  const handleAddUPI = async () => {
    if (!newUPI || !newUPI.includes('@')) { flash('Enter a valid UPI ID', true); return; }
    setAddingUPI(true);
    try {
      const res = await api.addUPI(newUPI, newLabel, upis.length + 1);
      if (res.success) { flash('UPI ID added'); setNewUPI(''); setNewLabel(''); api.listUPIs().then((r: any) => { if (r.success) setUpis(r.data || []); }); }
      else flash(res.error, true);
    } catch (e: any) { flash(e.message, true); }
    finally { setAddingUPI(false); }
  };

  const handleRotateKeys = async () => {
    if (!confirm('This will invalidate your current API keys. All integrations will stop working until updated. Continue?')) return;
    try {
      const res = await (api as any).request('POST', '/api/v1/dashboard/rotate-keys');
      if (res.success) { flash(`New keys generated. API Key: ${res.data.api_key}`); api.getProfile().then((r: any) => { if (r.success) setProfile(r.data); }); }
    } catch (e: any) { flash(e.message, true); }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) { flash('New password must be at least 8 characters', true); return; }
    setChangingPw(true);
    try {
      const res = await fetch('/api/v1/dashboard/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('upay_access_token')}` },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (data.success) { flash('Password changed. Please log in again.'); setCurrentPw(''); setNewPw(''); }
      else flash(data.error, true);
    } catch (e: any) { flash(e.message, true); }
    finally { setChangingPw(false); }
  };

  const card: React.CSSProperties = { background: '#FFFFFF', borderRadius: 14, padding: '22px 24px', border: '1px solid #E2E8F0', marginBottom: 16 };
  const inp: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, background: '#FFFFFF', color: '#0F172A', fontFamily: 'DM Sans, sans-serif' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 };
  const btn: React.CSSProperties = { background: '#2563EB', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' };

  return (
    <div style={{ maxWidth: 740, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 24 }}>Settings</div>

      {message && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#059669' }}>{message}</div>}
      {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>{error}</div>}

      {/* API Keys */}
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>API Credentials</div>
        {profile && (
          <>
            <label style={lbl}>API Key</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, marginBottom: 14, border: '1px solid #E2E8F0' }}>
              <code style={{ flex: 1, fontSize: 12.5, color: '#0F172A', wordBreak: 'break-all' as const, fontFamily: 'monospace' }}>{profile.api_key}</code>
              <button onClick={() => { navigator.clipboard.writeText(profile.api_key); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </>
        )}
        <button onClick={handleRotateKeys} style={{ ...btn, background: '#DC2626' }}>Rotate API keys</button>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Rotating keys will immediately invalidate your current credentials.</div>
      </div>

      {/* UPI IDs */}
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>UPI IDs</div>
        {upis.length > 0 ? upis.map(upi => (
          <div key={upi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{upi.label || 'UPI'}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2, fontFamily: 'monospace' }}>{upi.upi_id}</div>
            </div>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Priority: {upi.priority}</span>
          </div>
        )) : (
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>No UPI IDs configured yet</div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input value={newUPI} onChange={e => setNewUPI(e.target.value)} placeholder="merchant@paytm" style={{ ...inp, flex: 1 }} />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label" style={{ ...inp, width: 120 }} />
          <button onClick={handleAddUPI} disabled={addingUPI} style={{ ...btn, opacity: addingUPI ? 0.6 : 1 }}>{addingUPI ? '…' : 'Add'}</button>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>UPI IDs are encrypted at rest and auto-rotated across payment sessions.</div>
      </div>

      {/* Password */}
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Change Password</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" style={{ ...inp, flex: 1, minWidth: 180 }} />
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 chars)" style={{ ...inp, flex: 1, minWidth: 180 }} />
          <button onClick={handleChangePassword} disabled={changingPw} style={{ ...btn, opacity: changingPw ? 0.6 : 1 }}>{changingPw ? '…' : 'Change'}</button>
        </div>
      </div>
    </div>
  );
}
