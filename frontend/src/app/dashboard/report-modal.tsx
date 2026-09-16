'use client';
import { useState } from 'react';

interface Props { onClose: () => void; }

const TYPES = [
  { value: 'bug',             label: 'Bug Report',       desc: 'Something is broken or not working' },
  { value: 'payment_issue',   label: 'Payment Issue',    desc: 'Problem with a transaction or UPI' },
  { value: 'feature_request', label: 'Feature Request',  desc: 'Suggest a new feature or improvement' },
  { value: 'other',           label: 'Other',            desc: 'General feedback or question' },
];

export default function ReportModal({ onClose }: Props) {
  const [type, setType]       = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { setError('Please fill in all fields.'); return; }
    setSending(true); setError('');
    try {
      const token = localStorage.getItem('upay_access_token');
      const res = await fetch('/api/v1/dashboard/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: `[${TYPES.find(t => t.value === type)?.label}] ${subject}`,
          message,
          context: `Type: ${type}\nPage: ${window.location.pathname}`,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setDone(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally { setSending(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>Report an Issue</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 3 }}>We review every report and get back to you</div>
          </div>
          <button onClick={onClose} style={{
            background: '#F1F5F9', border: 'none', borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            color: '#64748B', transition: 'background 0.12s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {done ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: '#F0FDF4',
              border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Report submitted</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>Our team will review it and follow up if needed.</div>
            <button onClick={onClose} style={{
              background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 28px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Done</button>
          </div>
        ) : (
          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Type selector */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)} style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${type === t.value ? '#2563EB' : '#E2E8F0'}`,
                    background: type === t.value ? '#EFF6FF' : '#F8FAFC',
                    transition: 'all 0.12s', fontFamily: 'inherit',
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: type === t.value ? '#2563EB' : '#0F172A' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 1.3 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                maxLength={150}
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 10, fontFamily: 'inherit',
                  border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A',
                  background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#93C5FD'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Description</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe the issue in detail — what happened, what you expected, steps to reproduce…"
                rows={5}
                maxLength={2000}
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 10, fontFamily: 'inherit',
                  border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A',
                  background: '#F8FAFC', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  transition: 'border-color 0.15s', lineHeight: 1.55,
                }}
                onFocus={e => e.target.style.borderColor = '#93C5FD'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4, textAlign: 'right' }}>{message.length}/2000</div>
            </div>

            {error && (
              <div style={{ fontSize: 12.5, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={{
                background: '#F1F5F9', border: 'none', borderRadius: 10, padding: '10px 20px',
                fontSize: 13.5, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button onClick={submit} disabled={sending} style={{
                background: sending ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 24px', fontSize: 13.5, fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s',
              }}>
                {sending ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    Sending…
                  </>
                ) : 'Submit Report'}
              </button>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
      </div>
    </div>
  );
}
