'use client';
import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Payment } from '@/types';

const fmt = (p: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Paid'    },
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pending' },
  failed:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'Failed'  },
  expired: { bg: 'rgba(100,116,139,0.12)',color: '#64748b', label: 'Expired' },
};

export default function OrdersPage() {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params.status = status;
    api.getTransactions(params).then((res: any) => {
      if (res.success && res.data) { setTransactions(res.data.data || []); setTotal(res.data.total || 0); }
    }).finally(() => setLoading(false));
  }, [page, limit, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter(tx => {
    if (search) {
      const q = search.toLowerCase();
      if (!tx.order_id?.toLowerCase().includes(q) && !tx.id?.toLowerCase().includes(q) && !tx.customer_reference?.toLowerCase().includes(q)) return false;
    }
    if (startDate && new Date(tx.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(tx.created_at) > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  const totalPages = Math.ceil(total / limit);

  const copyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const exportCSV = () => {
    const rows = [['Payment ID', 'Order ID', 'Amount', 'Status', 'Date']];
    filtered.forEach(tx => rows.push([tx.id, tx.order_id, String(tx.amount / 100), tx.status, new Date(tx.created_at).toLocaleString()]));
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = 'orders-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
  };

  const inp: React.CSSProperties = {
    background: '#0f1d35', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '9px 14px', color: '#dbeafe',
    fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none',
  };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .order-card { animation: fadeIn 0.2s ease forwards; }
        .order-row:hover { background: rgba(255,255,255,0.02) !important; }
        .copy-btn:hover { border-color: rgba(255,255,255,0.2) !important; color: #dbeafe !important; }
        .table-wrap { display: block; }
        .card-wrap { display: none; }
        @media (max-width: 768px) {
          .table-wrap { display: none; }
          .card-wrap { display: flex; flex-direction: column; gap: 10px; }
          .filters-row { flex-direction: column !important; }
          .filters-row > * { width: 100% !important; min-width: unset !important; }
          .date-row { grid-template-columns: 1fr !important; }
          .header-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
      `}</style>

      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>Orders</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Total {total.toLocaleString('en-IN')} orders</div>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 18px', color: '#dbeafe', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>↓ Export</button>
      </div>

      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' as const }}>
          <span style={{ position: 'absolute' as const, left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
          <input style={{ ...inp, width: '100%', paddingLeft: 36, boxSizing: 'border-box' as const }} placeholder="Search by Order ID or Customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inp, minWidth: 80 }} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
          {[10, 25, 50, 100].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select style={{ ...inp, minWidth: 120 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="date-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Start Date</label>
          <input type="date" style={{ ...inp, width: '100%', boxSizing: 'border-box' as const }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>End Date</label>
          <input type="date" style={{ ...inp, width: '100%', boxSizing: 'border-box' as const }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' as const, color: '#4b5563', background: '#0f1d35', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 64, textAlign: 'center' as const, color: '#4b5563', background: '#0f1d35', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#dbeafe', marginBottom: 6 }}>No orders found</div>
          <div style={{ fontSize: 13 }}>Orders will appear here once payments are created</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-wrap" style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 0.9fr 0.7fr 1fr 0.9fr 0.6fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
              <span>Order ID</span><span>Txn ID</span><span>Customer</span><span>Amount</span><span>Date</span><span>Status</span><span>Actions</span>
            </div>
            {filtered.map((tx, i) => {
              const s = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
              return (
                <div key={tx.id} className="order-row" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 0.9fr 0.7fr 1fr 0.9fr 0.6fr', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', fontSize: 13, background: 'transparent', transition: 'background 0.15s' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8b9ab5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, paddingRight: 8 }}>{tx.order_id}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4b5563' }}>{tx.id?.slice(0, 12)}...</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{tx.customer_reference || '—'}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13 }}>{fmt(tx.amount)}</span>
                  <div><div style={{ fontSize: 12 }}>{fmtDate(tx.created_at)}</div><div style={{ fontSize: 11, color: '#4b5563' }}>{fmtTime(tx.created_at)}</div></div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, width: 'fit-content' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
                  </span>
                  <button className="copy-btn" onClick={() => copyText(tx.order_id, tx.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', color: copied === tx.id ? '#22c55e' : '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                    {copied === tx.id ? '✓' : 'Copy'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="card-wrap">
            {filtered.map((tx) => {
              const s = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
              return (
                <div key={tx.id} className="order-card" style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b9ab5', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, paddingRight: 8 }}>{tx.order_id}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, flexShrink: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />{s.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#dbeafe' }}>{fmt(tx.amount)}</span>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{fmtDate(tx.created_at)}</div>
                      <div style={{ fontSize: 11, color: '#4b5563' }}>{fmtTime(tx.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {tx.customer_reference && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Customer</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tx.customer_reference}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Txn ID</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4b5563' }}>{tx.id?.slice(0, 16)}...</span>
                    </div>
                  </div>
                  <button className="copy-btn" onClick={() => copyText(tx.order_id, tx.id)} style={{ marginTop: 12, width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px', color: copied === tx.id ? '#22c55e' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                    {copied === tx.id ? '✓ Copied!' : 'Copy Order ID'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 16px', color: page === 1 ? '#4b5563' : '#dbeafe', fontSize: 13, cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Prev</button>
          <span style={{ fontSize: 13, color: '#64748b', padding: '0 8px' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 16px', color: page === totalPages ? '#4b5563' : '#dbeafe', fontSize: 13, cursor: page === totalPages ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Next →</button>
        </div>
      )}
    </div>
  );
}