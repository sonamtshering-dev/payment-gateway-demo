'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Copy, Check, Clock } from 'lucide-react';

const API = '/api/v1/dashboard/telegram';

// SVG icon renderer — returns JSX at call time, never at module init
function NotifIcon({ id }: { id: string }) {
  const s = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'payment_received':    return <svg {...s}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
    case 'payment_failed':      return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
    case 'payment_expired':     return <svg {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'kyc_approved':        return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
    case 'kyc_rejected':        return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>;
    case 'subscription_activated': return <svg {...s}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'subscription_expiring':  return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case 'webhook_failure':     return <svg {...s}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
    case 'api_key_rotated':     return <svg {...s}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
    case 'suspicious_activity': return <svg {...s}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'daily_summary':       return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'weekly_summary':      return <svg {...s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    default:                    return <svg {...s}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
  }
}

const TYPE_META: Record<string, { label: string; group: string }> = {
  payment_received:       { label: 'Payment Received',      group: 'Payments'  },
  payment_failed:         { label: 'Payment Failed',         group: 'Payments'  },
  payment_expired:        { label: 'Payment Expired',        group: 'Payments'  },
  kyc_approved:           { label: 'KYC Approved',           group: 'Account'   },
  kyc_rejected:           { label: 'KYC Rejected',           group: 'Account'   },
  subscription_activated: { label: 'Subscription Active',    group: 'Billing'   },
  subscription_expiring:  { label: 'Subscription Expiring',  group: 'Billing'   },
  webhook_failure:        { label: 'Webhook Failure',         group: 'Developer' },
  api_key_rotated:        { label: 'API Key Rotated',         group: 'Security'  },
  suspicious_activity:    { label: 'Suspicious Activity',    group: 'Security'  },
  daily_summary:          { label: 'Daily Summary',          group: 'Reports'   },
  weekly_summary:         { label: 'Weekly Summary',         group: 'Reports'   },
};

const GROUP_ORDER = ['Payments', 'Account', 'Billing', 'Developer', 'Security', 'Reports'];
const GROUP_COLORS: Record<string, string> = {
  Payments: '#2563EB', Account: '#7C3AED', Billing: '#059669',
  Developer: '#D97706', Security: '#DC2626', Reports: '#0891B2',
};

interface Status {
  connected: boolean;
  is_enabled: boolean;
  notification_types: string[];
  connected_at?: string;
  bot_name: string;
}

interface ConnectInfo {
  code: string;
  bot_name: string;
  expires_in_seconds: number;
}

interface HistoryItem {
  id: string;
  notification_type: string;
  success: boolean;
  sent_at: string;
}

function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('upay_access_token');
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options?.headers || {}),
    },
  });
}

// Option A — Settings list row: icon + label on left, toggle switch on right
function NotifToggle({ id, label, groupColor, on, onChange }: {
  id: string; label: string; groupColor: string; on: boolean; onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="tg-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 20px', width: '100%', textAlign: 'left',
        border: 'none', background: 'transparent',
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background .1s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: on ? (groupColor + '18') : '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: on ? groupColor : '#94A3B8',
        transition: 'all .15s',
      }}>
        <NotifIcon id={id} />
      </div>
      <span style={{
        flex: 1, fontSize: 13.5, fontWeight: 500,
        color: on ? '#0F172A' : '#64748B',
        transition: 'color .15s',
      }}>{label}</span>
      {/* Toggle switch */}
      <div style={{
        width: 38, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? '#2563EB' : '#CBD5E1',
        position: 'relative', transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', top: 3,
          left: on ? 19 : 3,
          width: 16, height: 16, borderRadius: 8, background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
    </button>
  );
}

export default function TelegramPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectInfo, setConnectInfo] = useState<ConnectInfo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [copied, setCopied] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await apiFetch(API);
      const d = await r.json();
      if (d.success) {
        setStatus(d.data);
        setTypes(d.data.notification_types || []);
        setEnabled(d.data.is_enabled ?? true);
      }
    } finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const r = await apiFetch(`${API}/history?page=${page}&limit=10`);
      const d = await r.json();
      if (d.success) {
        setHistory(d.data.data || []);
        setHistoryTotal(d.data.total || 0);
      }
    } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { if (status?.connected) fetchHistory(historyPage); }, [status?.connected, historyPage, fetchHistory]);

  useEffect(() => {
    if (!connectInfo) return;
    setCountdown(connectInfo.expires_in_seconds);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [connectInfo]);

  const startConnect = async () => {
    setConnecting(true);
    try {
      const r = await apiFetch(`${API}/connect`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        setConnectInfo(d.data);
        const timer = setInterval(async () => {
          const sr = await apiFetch(API);
          const sd = await sr.json();
          if (sd.success && sd.data.connected) {
            setStatus(sd.data); setTypes(sd.data.notification_types || []);
            setEnabled(sd.data.is_enabled ?? true); setConnectInfo(null); clearInterval(timer);
          }
        }, 3000);
        setPollTimer(timer);
      }
    } finally { setConnecting(false); }
  };

  useEffect(() => () => { if (pollTimer) clearInterval(pollTimer); }, [pollTimer]);

  const copyCode = () => {
    if (!connectInfo) return;
    navigator.clipboard.writeText(`/connect ${connectInfo.code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const sendTest = async () => {
    setTestSending(true); setTestResult(null);
    try {
      const r = await apiFetch(`${API}/test`, { method: 'POST' });
      const d = await r.json();
      setTestResult({ ok: d.success, msg: d.success ? 'Test notification sent to Telegram.' : 'Failed to send. Please reconnect and try again.' });
    } catch { setTestResult({ ok: false, msg: 'Something went wrong. Please try again.' }); }
    finally { setTestSending(false); setTimeout(() => setTestResult(null), 5000); }
  };

  const saveSettings = async () => {
    setSaving(true); setSaved(false);
    try {
      const r = await apiFetch(`${API}/settings`, { method: 'PUT', body: JSON.stringify({ is_enabled: enabled, notification_types: types }) });
      const d = await r.json();
      if (d.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally { setSaving(false); }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Telegram? You will stop receiving notifications.')) return;
    await apiFetch(API, { method: 'DELETE' });
    setStatus(prev => prev ? { ...prev, connected: false } : null);
    setConnectInfo(null); setTypes([]); setHistory([]);
  };

  const toggleType = (id: string) =>
    setTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const grouped = GROUP_ORDER.map(g => ({
    group: g,
    color: GROUP_COLORS[g] || '#2563EB',
    items: Object.entries(TYPE_META).filter(([, m]) => m.group === g),
  }));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'tg-spin .7s linear infinite' }} />
      <style>{`@keyframes tg-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const botName = status?.bot_name || connectInfo?.bot_name || 'NovaPayAlerts_Bot';

  return (
    <div style={{ maxWidth: 700, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes tg-spin { to { transform: rotate(360deg); } }
        @keyframes tg-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .tg-card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; }
        .tg-btn-ghost:hover { background:#F1F5F9 !important; }
        .tg-btn-danger:hover { background:#FEF2F2 !important; border-color:#FECACA !important; color:#DC2626 !important; }
        .tg-notif-row:hover { background:#F8FAFC !important; }
        .tg-row:hover { background:#F8FAFC !important; }
        details summary::-webkit-details-marker { display:none; }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #229ED9 0%, #1a8fc7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(34,158,217,.3)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-.03em' }}>Telegram Alerts</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 2 }}>
            Real-time payment and account notifications via Telegram.
          </p>
        </div>
      </div>

      {/* Connection card */}
      <div className="tg-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        {status?.connected ? (
          <div>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #229ED9, #1a8fc7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>@{botName}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: '#059669',
                      background: '#F0FDF4', border: '1px solid #BBF7D0',
                      borderRadius: 5, padding: '2px 7px', letterSpacing: '.02em',
                    }}>Connected</span>
                  </div>
                  {status.connected_at && (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      Since {new Date(status.connected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={sendTest}
                  disabled={testSending}
                  className="tg-btn-ghost"
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                    border: '1.5px solid #E2E8F0', background: '#FAFAFA', color: '#334155',
                    cursor: testSending ? 'wait' : 'pointer', fontFamily: 'inherit',
                    transition: 'all .12s',
                  }}
                >
                  {testSending ? 'Sending…' : 'Send Test'}
                </button>
                <button
                  onClick={disconnect}
                  className="tg-btn-danger"
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                    border: '1.5px solid #E2E8F0', background: '#FAFAFA', color: '#64748B',
                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all .12s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
            {testResult && (
              <div style={{
                margin: '0 20px 16px',
                padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 500,
                background: testResult.ok ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${testResult.ok ? '#BBF7D0' : '#FECACA'}`,
                color: testResult.ok ? '#059669' : '#DC2626',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'tg-fade .25s ease',
              }}>
                {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {testResult.msg}
              </div>
            )}
          </div>
        ) : connectInfo ? (
          /* Connecting state */
          <div style={{ padding: '24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20 }}>
              <RefreshCw size={16} color="#2563EB" style={{ animation: 'tg-spin 1.2s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Waiting for connection…</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </span>
            </div>
            <a
              href={`https://t.me/${botName}?start=${connectInfo.code}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px', borderRadius: 12, textDecoration: 'none',
                background: 'linear-gradient(135deg, #229ED9 0%, #1e8fc5 100%)',
                color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 12,
                boxShadow: '0 2px 12px rgba(34,158,217,.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Open @{botName} in Telegram
            </a>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 }}>
              Tap above — Telegram opens and connects automatically. No typing needed.
            </p>
            <details>
              <summary style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                Using Telegram on another device?
              </summary>
              <div style={{ marginTop: 10, background: '#0F172A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <code style={{ color: '#60A5FA', fontSize: 13, fontFamily: 'monospace', letterSpacing: .5 }}>/connect {connectInfo.code}</code>
                <button onClick={copyCode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ADE80' : '#64748B', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'inherit' }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </details>
          </div>
        ) : (
          /* Not connected state */
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: '0 auto 18px',
              background: 'linear-gradient(135deg, #229ED9, #1a8fc7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(34,158,217,.25)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-.03em' }}>Connect Telegram</h2>
            <p style={{ margin: '0 0 6px', fontSize: 13.5, color: '#475569', lineHeight: 1.7, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
              Get instant alerts for payments, KYC updates, and account events — directly in Telegram.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '14px 0 22px', flexWrap: 'wrap' }}>
              {['Payment alerts', 'KYC updates', 'Daily reports'].map(f => (
                <span key={f} style={{ fontSize: 11.5, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 6, padding: '4px 10px' }}>{f}</span>
              ))}
            </div>
            <button
              onClick={startConnect}
              disabled={connecting}
              style={{
                padding: '12px 32px', fontSize: 14, fontWeight: 700, borderRadius: 10,
                border: 'none', background: 'linear-gradient(135deg, #229ED9, #1a8fc7)',
                color: '#fff', cursor: connecting ? 'not-allowed' : 'pointer',
                opacity: connecting ? 0.7 : 1, fontFamily: 'inherit',
                boxShadow: '0 2px 10px rgba(34,158,217,.3)',
              }}
            >
              {connecting ? 'Generating link…' : 'Connect Telegram'}
            </button>
          </div>
        )}
      </div>

      {/* Notification preferences — only when connected */}
      {status?.connected && (
        <>
          <div className="tg-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
            {/* Header with master toggle */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Notification Preferences</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                  {types.length} of {Object.keys(TYPE_META).length} alerts enabled
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 12.5, color: enabled ? '#2563EB' : '#94A3B8', fontWeight: 600 }}>
                  {enabled ? 'Active' : 'Paused'}
                </span>
                <div
                  onClick={() => setEnabled(e => !e)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: enabled ? '#2563EB' : '#CBD5E1',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: 9, background: '#fff',
                    transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.18)',
                  }} />
                </div>
              </div>
            </div>

            {/* Groups — Option A: settings list */}
            <div style={{ padding: '8px 0' }}>
              {grouped.map(({ group, color, items }, gi) => (
                <div key={group} style={{ marginBottom: gi < grouped.length - 1 ? 4 : 0 }}>
                  {/* Group header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px 6px',
                  }}>
                    <span style={{
                      width: 4, height: 14, borderRadius: 2,
                      background: color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      {group}
                    </span>
                  </div>
                  {/* Rows */}
                  <div style={{ borderTop: '1px solid #F8FAFC' }}>
                    {items.map(([id, meta], idx) => (
                      <div key={id} style={{ borderBottom: idx < items.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                        <NotifToggle
                          id={id}
                          label={meta.label}
                          groupColor={color}
                          on={types.includes(id)}
                          onChange={() => toggleType(id)}
                        />
                      </div>
                    ))}
                  </div>
                  {gi < grouped.length - 1 && (
                    <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Save */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <button
                onClick={saveSettings}
                disabled={saving}
                style={{
                  padding: '10px 28px', fontSize: 13.5, fontWeight: 700, borderRadius: 9,
                  border: 'none', background: saving ? '#93C5FD' : '#2563EB',
                  color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  transition: 'background .15s',
                }}
              >
                {saving ? 'Saving…' : 'Save Preferences'}
              </button>
              {saved && (
                <span style={{ fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 5, animation: 'tg-fade .2s ease' }}>
                  <CheckCircle2 size={14} /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Recent notifications */}
          <div className="tg-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recent Notifications</div>
            </div>

            {historyLoading ? (
              <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'tg-spin .7s linear infinite' }} />
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                  background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94A3B8',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No notifications yet</div>
                <div style={{ fontSize: 12.5, color: '#94A3B8' }}>Notifications will appear here once sent.</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Type', 'Status', 'Time'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '9px 16px',
                            fontSize: 11, fontWeight: 700, color: '#94A3B8',
                            textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => {
                        const meta = TYPE_META[item.notification_type];
                        const color = GROUP_COLORS[meta?.group || ''] || '#64748B';
                        return (
                          <tr key={item.id} className="tg-notif-row" style={{ borderTop: '1px solid #F1F5F9', transition: 'background .1s' }}>
                            <td style={{ padding: '11px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                                  background: color + '18',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: color,
                                }}><NotifIcon id={item.notification_type} /></div>
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
                                  {meta?.label || item.notification_type}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                                background: item.success ? '#F0FDF4' : '#FEF2F2',
                                color: item.success ? '#059669' : '#DC2626',
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                                {item.success ? 'Delivered' : 'Failed'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                              {new Date(item.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {historyTotal > 10 && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{historyTotal} total · page {historyPage} of {Math.ceil(historyTotal / 10)}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['Prev', -1], ['Next', 1]].map(([label, dir]) => {
                        const isDisabled = dir === -1 ? historyPage === 1 : historyPage >= Math.ceil(historyTotal / 10);
                        return (
                          <button key={label as string}
                            onClick={() => setHistoryPage(p => p + (dir as number))}
                            disabled={isDisabled as boolean}
                            style={{
                              padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0',
                              background: '#FAFAFA', fontSize: 12, fontWeight: 500,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              opacity: isDisabled ? 0.4 : 1, fontFamily: 'inherit', color: '#334155',
                            }}
                          >{label}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
