'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { MerchantUPI } from '@/types';

export default function SettingsPage() {
  const [upis, setUpis] = useState<MerchantUPI[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [newUPI, setNewUPI] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingUPI, setAddingUPI] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    api.getProfile().then((r: any) => { if (r.success) setProfile(r.data); });
    api.listUPIs().then((r: any) => { if (r.success) setUpis(r.data || []); });
  }, []);

  const handleAddUPI = async () => {
    if (!newUPI || !newUPI.includes('@')) { setError('Enter a valid UPI ID'); return; }
    setAddingUPI(true); setError(''); setMessage('');
    try {
      const res = await api.addUPI(newUPI, newLabel, upis.length + 1);
      if (res.success) {
        setMessage('UPI ID added');
        setNewUPI(''); setNewLabel('');
        api.listUPIs().then((r: any) => { if (r.success) setUpis(r.data || []); });
      } else { setError(res.error); }
    } catch (e: any) { setError(e.message); }
    finally { setAddingUPI(false); }
  };

  const handleRotateKeys = async () => {
    if (!confirm('This will invalidate your current API keys. All integrations will stop working until updated. Continue?')) return;
    try {
      const res = await (api as any).request('POST', '/api/v1/dashboard/rotate-keys');
      if (res.success) {
        setMessage(`New keys generated. API Key: ${res.data.api_key}`);
        api.getProfile().then((r: any) => { if (r.success) setProfile(r.data); });
      }
    } catch (e: any) { setError(e.message); }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) { setError('New password must be at least 8 characters'); return; }
    setChangingPw(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/v1/dashboard/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('upay_access_token')}`,
        },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Password changed. Please log in again.');
        setCurrentPw(''); setNewPw('');
      } else { setError(data.error); }
    } catch (e: any) { setError(e.message); }
    finally { setChangingPw(false); }
  };

  const sectionStyle = {
    background: '#fff', borderRadius: 14, padding: '24px 28px',
    border: '1px solid #e5e7eb', marginBottom: 20,
  };
  const inputStyle = {
    padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  };
  const btnPrimary = {
    background: '#6366f1', color: '#fff', border: 'none',
    padding: '9px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  };

  return (
    <div style={{ maxWidth: 740 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f1d35', margin: '0 0 24px' }}>Settings</h1>

      {message && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#059669' }}>{message}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>{error}</div>}

      {/* API Keys */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f1d35', margin: '0 0 16px' }}>API credentials</h2>
        {profile && (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>API Key</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, marginBottom: 14 }}>
              <code style={{ flex: 1, fontSize: 12.5, color: '#374151', wordBreak: 'break-all' }}>{profile.api_key}</code>
              <button onClick={() => navigator.clipboard.writeText(profile.api_key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13 }}>Copy</button>
            </div>
          </>
        )}
        <button onClick={handleRotateKeys} style={{ ...btnPrimary, background: '#ef4444' }}>
          Rotate API keys
        </button>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          Rotating keys will immediately invalidate your current credentials.
        </p>
      </div>

      {/* UPI IDs */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f1d35', margin: '0 0 16px' }}>UPI IDs</h2>
        {upis.length > 0 ? upis.map(upi => (
          <div key={upi.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid #f3f4f6',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{upi.label || 'UPI'}</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0', fontFamily: 'monospace' }}>{upi.upi_id}</p>
            </div>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Priority: {upi.priority}</span>
          </div>
        )) : (
          <p style={{ fontSize: 13, color: '#6b7280' }}>No UPI IDs configured yet</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input value={newUPI} onChange={e => setNewUPI(e.target.value)}
            placeholder="merchant@paytm" style={{ ...inputStyle, flex: 1 }} />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="Label" style={{ ...inputStyle, width: 120 }} />
          <button onClick={handleAddUPI} disabled={addingUPI} style={btnPrimary}>
            {addingUPI ? '...' : 'Add'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          UPI IDs are encrypted at rest and auto-rotated across payment sessions.
        </p>
      </div>

      {/* Password */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f1d35', margin: '0 0 16px' }}>Change password</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            placeholder="Current password" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="New password (min 8 chars)" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          <button onClick={handleChangePassword} disabled={changingPw} style={btnPrimary}>
            {changingPw ? '...' : 'Change'}
          </button>
        </div>
      </div>
    </div>
  );
}
