'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Building2, Mail, Calendar, ShieldCheck, KeyRound, Image as ImageIcon } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  email: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  logo_url?: string;
  business_name?: string;
}

function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('upay_access_token');
  return fetch(path, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: token ? `Bearer ${token}` : '',
      ...(options?.headers || {}),
    },
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  // business name
  const [bizName, setBizName] = useState('');
  const [savingBiz, setSavingBiz] = useState(false);

  // logo
  const [logoUploading, setLogoUploading] = useState(false);

  // password
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const notify = (text: string, ok = true) => { setFlash({ ok, text }); setTimeout(() => setFlash(null), 4000); };

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/v1/dashboard/profile');
      const d = await r.json();
      if (d.success) { setProfile(d.data); setBizName(d.data.business_name || ''); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveBizName = async () => {
    if (bizName.trim().length < 2) { notify('Business name must be at least 2 characters', false); return; }
    setSavingBiz(true);
    try {
      const r = await apiFetch('/api/v1/dashboard/business-name', { method: 'PUT', body: JSON.stringify({ business_name: bizName.trim() }) });
      const d = await r.json();
      if (d.success) { notify('Business name updated'); load(); }
      else notify(d.error || 'Failed to update', false);
    } catch { notify('Network error', false); }
    finally { setSavingBiz(false); }
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { notify('Logo must be under 2 MB', false); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const r = await apiFetch('/api/v1/dashboard/logo', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success) { notify('Logo updated'); load(); }
      else notify(d.error || 'Upload failed', false);
    } catch { notify('Network error', false); }
    finally { setLogoUploading(false); }
  };

  const removeLogo = async () => {
    const r = await apiFetch('/api/v1/dashboard/logo', { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { notify('Logo removed'); load(); } else notify(d.error || 'Failed', false);
  };

  const changePassword = async () => {
    if (newPw.length < 8) { notify('New password must be at least 8 characters', false); return; }
    if (newPw !== confirmPw) { notify('Passwords do not match', false); return; }
    setSavingPw(true);
    try {
      const r = await apiFetch('/api/v1/dashboard/change-password', {
        method: 'POST', body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      const d = await r.json();
      if (d.success) { notify('Password changed'); setCurPw(''); setNewPw(''); setConfirmPw(''); }
      else notify(d.error || 'Failed to change password', false);
    } catch { notify('Network error', false); }
    finally { setSavingPw(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'pf-spin .7s linear infinite' }} />
      <style>{`@keyframes pf-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const initials = (profile?.business_name || profile?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#0F172A', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 };

  return (
    <div style={{ maxWidth: 700, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        .pf-card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:20px 22px; margin-bottom:16px; }
        .pf-input:focus { border-color:#2563EB !important; }
      `}</style>

      {flash && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, background: flash.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${flash.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius: 10, padding: '11px 16px', color: flash.ok ? '#059669' : '#DC2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          {flash.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{flash.text}
        </div>
      )}

      {/* ── Identity header ── */}
      <div className="pf-card" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="Logo" style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', border: '1px solid #E2E8F0' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>{initials}</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', letterSpacing: '-.02em' }}>{profile?.business_name || profile?.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#64748B' }}><Mail size={13} />{profile?.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#64748B' }}><Calendar size={13} />Since {profile ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: profile?.is_active ? '#059669' : '#DC2626', background: profile?.is_active ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${profile?.is_active ? '#BBF7D0' : '#FECACA'}`, borderRadius: 20, padding: '3px 10px' }}>
              <ShieldCheck size={12} />{profile?.is_active ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Business details ── */}
      <div className="pf-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={16} color="#2563EB" /></div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>Business Details</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Account name</label>
            <input className="pf-input" style={{ ...inp, background: '#F8FAFC', color: '#64748B' }} value={profile?.name || ''} readOnly />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input className="pf-input" style={{ ...inp, background: '#F8FAFC', color: '#64748B' }} value={profile?.email || ''} readOnly />
          </div>
        </div>
        <label style={lbl}>Business name <span style={{ color: '#94A3B8', fontWeight: 500 }}>(shown to customers at checkout)</span></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="pf-input" style={inp} value={bizName} onChange={e => setBizName(e.target.value)} placeholder="e.g. Acme Store" />
          <button onClick={saveBizName} disabled={savingBiz}
            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: savingBiz ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingBiz ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            {savingBiz ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Logo ── */}
      <div className="pf-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={16} color="#2563EB" /></div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>Brand Logo</div>
        </div>
        <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 14 }}>Shown on your checkout pages. PNG/JPG, up to 2 MB, square works best.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {logoUploading ? 'Uploading…' : 'Upload Logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} disabled={logoUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
          </label>
          {profile?.logo_url && (
            <button onClick={removeLogo}
              style={{ padding: '10px 16px', borderRadius: 9, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* ── Password ── */}
      <div className="pf-card" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KeyRound size={16} color="#2563EB" /></div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>Change Password</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Current password</label>
            <input className="pf-input" style={inp} type="password" value={curPw} onChange={e => setCurPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label style={lbl}>New password</label>
            <input className="pf-input" style={inp} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" placeholder="Min. 8 characters" />
          </div>
          <div>
            <label style={lbl}>Confirm new password</label>
            <input className="pf-input" style={inp} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <button onClick={changePassword} disabled={savingPw || !curPw || !newPw}
          style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: savingPw || !curPw || !newPw ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingPw || !curPw || !newPw ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {savingPw ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
