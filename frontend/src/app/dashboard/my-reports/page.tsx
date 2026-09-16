'use client';
import { useState, useEffect, useCallback } from 'react';
import ReportModal from '../report-modal';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_note: string;
  created_at: string;
  updated_at: string;
}

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  open:        { label: 'Open',        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  in_progress: { label: 'In Progress', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  resolved:    { label: 'Resolved',    color: '#047857', bg: '#F0FDF4', border: '#BBF7D0', dot: '#10B981' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MyReportsPage() {
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upay_access_token');
      const d = await fetch('/api/v1/dashboard/tickets', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      if (d.success) setTickets(d.data ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter ? tickets.filter(t => t.status === filter) : tickets;
  const counts = { open: 0, in_progress: 0, resolved: 0 };
  tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes mr-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .mr-card { background: #fff; border: 1px solid #E8ECF2; border-radius: 14px; overflow: hidden; transition: box-shadow 0.18s, border-color 0.18s; animation: mr-fade 0.2s ease; }
        .mr-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); border-color: #D1D9E6; }
        .mr-row { display: flex; align-items: center; gap: 14px; padding: 16px 20px; cursor: pointer; user-select: none; }
        .mr-row:hover { background: #FAFBFC; }
        .mr-detail { border-top: 1px solid #F1F5F9; padding: 20px; background: #FAFBFD; }
        .mr-filter-btn { padding: 6px 16px; border-radius: 8px; border: 1.5px solid #E2E8F0; background: #fff; color: #64748B; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .mr-filter-btn.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }
        .mr-filter-btn:hover:not(.active) { border-color: #CBD5E1; background: #F8FAFC; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>My Reports</h1>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>Submit bugs, feature requests, or issues — our team reviews every one</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            letterSpacing: '-0.01em',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Report
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {([
            { key: 'open',        label: 'Open',        icon: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01' },
            { key: 'in_progress', label: 'In Progress', icon: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' },
            { key: 'resolved',    label: 'Resolved',    icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' },
          ] as const).map(({ key, label, icon }) => {
            const s = STATUS[key];
            return (
              <div key={key} onClick={() => setFilter(filter === key ? '' : key)} style={{
                background: '#fff', border: `1.5px solid ${filter === key ? s.border : '#E8ECF2'}`,
                borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: filter === key ? `0 4px 16px ${s.dot}22` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={s.dot} strokeWidth="2" strokeLinecap="round">
                      <path d={icon}/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '2px 9px', borderRadius: 100 }}>{label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>{counts[key]}</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>{counts[key] === 1 ? 'ticket' : 'tickets'}</div>
              </div>
            );
          })}
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
          {(['', 'open', 'in_progress', 'resolved'] as const).map(f => (
            <button key={f} className={`mr-filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === '' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13 }}>Loading your reports…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fff', borderRadius: 16, border: '1px solid #E8ECF2' }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>No reports {filter ? 'with this status' : 'yet'}</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 22, maxWidth: 300, margin: '0 auto 22px' }}>
              {filter ? 'Try selecting a different filter above.' : 'Found a bug or have a suggestion? Let us know — we read every report.'}
            </div>
            {!filter && (
              <button onClick={() => setShowModal(true)} style={{
                background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Submit a Report</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((ticket, idx) => {
              const s = STATUS[ticket.status] ?? STATUS.open;
              const open = expanded === ticket.id;
              return (
                <div key={ticket.id} className="mr-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className="mr-row" onClick={() => setExpanded(open ? null : ticket.id)}>
                    {/* Status indicator */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: `0 0 0 3px ${s.bg}` }} />

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</div>
                      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{fmt(ticket.created_at)}</div>
                    </div>

                    {/* Admin replied indicator */}
                    {ticket.admin_note && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        Reply
                      </div>
                    )}

                    {/* Status badge */}
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                      {s.label}
                    </span>

                    {/* Chevron */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>

                  {/* Expanded */}
                  {open && (
                    <div className="mr-detail">
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Your report</div>
                        <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #E8ECF2', borderRadius: 10, padding: '14px 16px' }}>
                          {ticket.message}
                        </div>
                      </div>

                      {ticket.admin_note ? (
                        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 7, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>Support team replied</span>
                            <span style={{ fontSize: 11, color: '#93C5FD', marginLeft: 2 }}>{fmt(ticket.updated_at)}</span>
                          </div>
                          <div style={{ fontSize: 13.5, color: '#1E3A8A', lineHeight: 1.65 }}>{ticket.admin_note}</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, padding: '12px 16px' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, boxShadow: '0 0 0 3px #FFFBEB' }} />
                          <span style={{ fontSize: 12.5, color: '#64748B' }}>
                            {ticket.status === 'in_progress'
                              ? 'Our team is actively working on this.'
                              : 'Awaiting review — we typically respond within 24 hours.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <ReportModal onClose={() => { setShowModal(false); load(); }} />}
    </>
  );
}
