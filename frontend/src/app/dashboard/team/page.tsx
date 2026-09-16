'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, UserPlus, Users, Shield, Eye, Clock } from 'lucide-react';

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;   // admin | viewer
  status: string; // invited | active | disabled
  created_at: string;
}

function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('upay_access_token');
  return fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '', ...(options?.headers || {}) },
  });
}

const ROLE_META: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  admin:  { label: 'Admin',  desc: 'Can change settings, wallets and integrations', color: '#7C3AED', bg: '#F5F3FF' },
  viewer: { label: 'Viewer', desc: 'Read-only access to dashboard and reports',     color: '#0891B2', bg: '#F0F9FF' },
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [lastTgLink, setLastTgLink] = useState('');

  const notify = (text: string, ok = true) => { setFlash({ ok, text }); setTimeout(() => setFlash(null), 4000); };

  const load = useCallback(async () => {
    if (!localStorage.getItem('upay_access_token')) { setLoading(false); return; }
    try {
      const r = await apiFetch('/api/v1/dashboard/team');
      if (r.status === 403) { setForbidden(true); return; }
      const d = await r.json();
      if (d.success) setMembers(d.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!inviteEmail.includes('@')) { notify('Enter a valid email', false); return; }
    setInviting(true);
    try {
      const r = await apiFetch('/api/v1/dashboard/team/invite', {
        method: 'POST', body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const d = await r.json();
      if (d.success) {
        notify('Invitation sent');
        setInviteEmail('');
        if (d.data?.tg_link) setLastTgLink(d.data.tg_link);
        load();
      } else notify(d.error || 'Failed to invite', false);
    } catch { notify('Network error', false); }
    finally { setInviting(false); }
  };

  const updateMember = async (id: string, patch: { role?: string; status?: string }) => {
    const r = await apiFetch(`/api/v1/dashboard/team/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    const d = await r.json();
    if (d.success) { notify('Member updated'); load(); } else notify(d.error || 'Failed', false);
  };

  const removeMember = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from your team? They will lose access immediately.`)) return;
    const r = await apiFetch(`/api/v1/dashboard/team/${id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { notify('Member removed'); load(); } else notify(d.error || 'Failed', false);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'tm-spin .7s linear infinite' }} />
      <style>{`@keyframes tm-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (forbidden) return (
    <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center', fontFamily: 'inherit' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Shield size={24} color="#DC2626" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Owner access required</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>Only the account owner can manage team members.</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes tm-spin { to { transform: rotate(360deg); } }
        .tm-card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; margin-bottom:16px; }
        .tm-select { padding:7px 10px; border:1.5px solid #E2E8F0; border-radius:8px; font-size:12.5px; font-family:inherit; color:#0F172A; background:#fff; cursor:pointer; outline:none; }
      `}</style>

      {flash && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, background: flash.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${flash.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius: 10, padding: '11px 16px', color: flash.ok ? '#059669' : '#DC2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          {flash.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{flash.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(37,99,235,.3)' }}>
          <Users size={21} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-.03em' }}>Team Management</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 2 }}>Give your team access to this account with their own logins.</p>
        </div>
      </div>

      {/* Invite */}
      <div className="tm-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <UserPlus size={15} color="#2563EB" />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Invite a team member</div>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>Enter their email and role. After inviting, you&apos;ll get a Telegram link to share with them — when they tap it, the bot sends their activation link directly in Telegram.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="teammate@company.com"
            onKeyDown={e => e.key === 'Enter' && invite()}
            style={{ flex: 2, minWidth: 200, padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#0F172A', outline: 'none' }} />
          <select className="tm-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ flex: 1, minWidth: 110 }}>
            <option value="viewer">Viewer — read only</option>
            <option value="admin">Admin — can edit</option>
          </select>
          <button onClick={invite} disabled={inviting}
            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: inviting ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: inviting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        {/* Role explainer */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 14 }}>
          {Object.entries(ROLE_META).map(([id, m]) => (
            <div key={id} style={{ display: 'flex', gap: 9, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
              {id === 'admin' ? <Shield size={14} color={m.color} style={{ flexShrink: 0, marginTop: 2 }} /> : <Eye size={14} color={m.color} style={{ flexShrink: 0, marginTop: 2 }} />}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{m.label}</div>
                <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telegram invite link — shown after a successful invite */}
      {lastTgLink && (
        <div className="tm-card" style={{ padding: '20px 22px', background: 'linear-gradient(135deg,#0f172a 0%,#0c2340 100%)', border: '1px solid #1e3a5f' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#0088cc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,136,204,.4)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Share invite via Telegram</div>
              <div style={{ fontSize: 12.5, color: '#94A3B8', lineHeight: 1.6, marginBottom: 14 }}>
                Send this link to <b style={{ color: '#CBD5E1' }}>your team member</b>. When they tap it in any chat, the NovaPay bot will send their activation link directly to their Telegram.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <a href={lastTgLink} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, background: '#0088cc', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 10px rgba(0,136,204,.4)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                  Open in Telegram
                </a>
                <button onClick={() => { navigator.clipboard.writeText(lastTgLink); notify('Link copied'); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1.5px solid #334155', background: 'rgba(255,255,255,0.06)', color: '#CBD5E1', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Copy link
                </button>
                <button onClick={() => setLastTgLink('')}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="tm-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #F1F5F9', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
          Members {members.length > 0 && <span style={{ color: '#94A3B8', fontWeight: 500 }}>({members.length})</span>}
        </div>
        {members.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="#94A3B8" />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No team members yet</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8' }}>Invite someone above to give them access.</div>
          </div>
        ) : members.map((m, i) => {
          const rm = ROLE_META[m.role] || ROLE_META.viewer;
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderTop: i > 0 ? '1px solid #F8FAFC' : 'none', flexWrap: 'wrap' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>
                {(m.name || m.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{m.name || m.email}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{m.email}</div>
              </div>
              {m.status === 'invited' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 20, padding: '3px 10px' }}>
                  <Clock size={11} /> Invited
                </span>
              )}
              {m.status === 'disabled' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20, padding: '3px 10px' }}>Disabled</span>
              )}
              <select className="tm-select" value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              {m.status === 'active' ? (
                <button onClick={() => updateMember(m.id, { status: 'disabled' })}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#FAFAFA', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Disable
                </button>
              ) : m.status === 'disabled' ? (
                <button onClick={() => updateMember(m.id, { status: 'active' })}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #BBF7D0', background: '#F0FDF4', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Enable
                </button>
              ) : null}
              <button onClick={() => removeMember(m.id, m.email)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, marginBottom: 40 }}>
        Team members sign in at the normal login page with their own email and password.
        Only the account owner can manage the team, rotate API keys, or change the account password.
      </div>
    </div>
  );
}
