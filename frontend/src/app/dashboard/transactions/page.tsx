'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Download, FileText } from 'lucide-react';
import api from '@/lib/api';
import type { Payment } from '@/types';

const fmt = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100);
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: '#ECFDF5', color: '#059669', label: 'Paid'    },
  pending: { bg: '#FFFBEB', color: '#D97706', label: 'Pending' },
  failed:  { bg: '#FEF2F2', color: '#DC2626', label: 'Failed'  },
  expired: { bg: '#F8FAFF', color: '#94A3B8', label: 'Expired' },
};

const C = {
  bg:     '#F1F5FB',
  surface:'#FFFFFF',
  border: '#E2E8F0',
  text:   '#0F172A',
  text2:  '#475569',
  text3:  '#94A3B8',
  blue:   '#2563EB',
  blue50: '#EFF6FF',
  blue700:'#1D4ED8',
  shadow: '0 1px 3px rgba(15,23,42,.05),0 1px 2px rgba(15,23,42,.04)',
} as const;

const inp: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '8px 12px',
  color: C.text,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
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
      if (res.success && res.data) {
        setTransactions(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    }).finally(() => setLoading(false));
  }, [page, limit, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter(tx => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !tx.order_id?.toLowerCase().includes(q) &&
        !tx.id?.toLowerCase().includes(q) &&
        !tx.customer_reference?.toLowerCase().includes(q)
      ) return false;
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
    filtered.forEach(tx =>
      rows.push([tx.id, tx.order_id, String(tx.amount / 100), tx.status, new Date(tx.created_at).toLocaleString()])
    );
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = 'orders-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
  };

  const card: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxShadow: C.shadow,
  };

  return (
    <div style={{ color: C.text, fontFamily: 'inherit', maxWidth: 1200 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tx-row:hover td { background: #F8FAFF !important; }
        .tx-copy:hover { border-color: #CBD5E1 !important; color: ${C.text} !important; }
        .tx-pg-btn:hover:not(:disabled) { background: ${C.blue50} !important; color: ${C.blue} !important; border-color: ${C.blue} !important; }
        .tx-inp:focus { border-color: ${C.blue} !important; box-shadow: 0 0 0 3px ${C.blue50}; }

        /* Responsive */
        .tx-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .tx-filters-search { flex: 1; min-width: 180px; }
        .tx-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tx-tbl-wrap { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .tx-card-wrap { display: none; flex-direction: column; gap: 8px; }

        @media (max-width: 640px) {
          .tx-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .tx-dates { grid-template-columns: 1fr; }
          .tx-tbl-wrap { display: none; }
          .tx-card-wrap { display: flex; }
          .tx-filters { flex-direction: column; }
          .tx-filters-search { min-width: unset; }
        }
      `}</style>

      {/* Header */}
      <div
        className="tx-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.04em' }}>Transactions</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 2 }}>
            {total.toLocaleString('en-IN')} total orders
          </div>
        </div>
        <button
          onClick={exportCSV}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: C.shadow, flexShrink: 0 }}
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: '12px 14px', marginBottom: 14 }}>
        <div className="tx-filters" style={{ marginBottom: 10 }}>
          <div className="tx-filters-search" style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none' }} />
            <input
              className="tx-inp"
              style={{ ...inp, paddingLeft: 32 }}
              placeholder="Search by Order ID or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="tx-inp"
            style={{ ...inp, width: 'auto', minWidth: 100, flexShrink: 0 }}
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            {[10, 25, 50, 100].map(l => <option key={l} value={l}>{l} / page</option>)}
          </select>
          <select
            className="tx-inp"
            style={{ ...inp, width: 'auto', minWidth: 130, flexShrink: 0 }}
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="tx-dates">
          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>From</label>
            <input type="date" className="tx-inp" style={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>To</label>
            <input type="date" className="tx-inp" style={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ ...card, padding: 48, textAlign: 'center', color: C.text3 }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
          Loading transactions...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 64, textAlign: 'center', color: C.text3 }}>
          <FileText size={36} style={{ margin: '0 auto 12px', opacity: .25 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 5 }}>No transactions found</div>
          <div style={{ fontSize: 13 }}>Orders will appear here once payments are created.</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="tx-tbl-wrap" style={{ ...card, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Order ID', 'Txn ID', 'Customer', 'Amount', 'Date', 'Status', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px 8px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap', background: C.bg }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, i) => {
                  const s = STATUS_MAP[tx.status] || STATUS_MAP.pending;
                  return (
                    <tr key={tx.id} className="tx-row" style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 11.5, color: C.text2, overflow: 'hidden', maxWidth: 140, whiteSpace: 'nowrap' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.order_id}</div>
                      </td>
                      <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 11, color: C.text3, whiteSpace: 'nowrap' }}>{tx.id?.slice(0, 13)}...</td>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: C.text2, maxWidth: 120 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.customer_reference || '—'}</div>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 800, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(tx.amount)}</td>
                      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, color: C.text2 }}>{fmtDate(tx.created_at)}</div>
                        <div style={{ fontSize: 10.5, color: C.text3 }}>{fmtTime(tx.created_at)}</div>
                      </td>
                      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <button
                          className="tx-copy"
                          onClick={() => copyText(tx.order_id, tx.id)}
                          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 10px', color: copied === tx.id ? '#059669' : C.text3, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', whiteSpace: 'nowrap' }}
                        >
                          {copied === tx.id ? 'Copied' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="tx-card-wrap">
            {filtered.map(tx => {
              const s = STATUS_MAP[tx.status] || STATUS_MAP.pending;
              return (
                <div key={tx.id} style={{ ...card, padding: '13px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{tx.order_id}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
                      {s.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(tx.amount)}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: C.text2 }}>{fmtDate(tx.created_at)}</div>
                      <div style={{ fontSize: 10.5, color: C.text3 }}>{fmtTime(tx.created_at)}</div>
                    </div>
                  </div>
                  {tx.customer_reference && (
                    <div style={{ fontSize: 11.5, color: C.text3, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.customer_reference}
                    </div>
                  )}
                  <button
                    onClick={() => copyText(tx.order_id, tx.id)}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px', color: copied === tx.id ? '#059669' : C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}
                  >
                    {copied === tx.id ? 'Copied!' : 'Copy Order ID'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.text3 }}>
            Page {page} of {totalPages} &mdash; {total.toLocaleString('en-IN')} total
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              className="tx-pg-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 14px', color: page === 1 ? C.text3 : C.text2, fontSize: 12.5, fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all .12s', opacity: page === 1 ? .5 : 1 }}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={pg}
                  className="tx-pg-btn"
                  onClick={() => setPage(pg)}
                  style={{ background: pg === page ? C.blue : C.surface, border: `1px solid ${pg === page ? C.blue : C.border}`, borderRadius: 7, padding: '6px 11px', color: pg === page ? '#fff' : C.text2, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minWidth: 36, transition: 'all .12s' }}
                >
                  {pg}
                </button>
              );
            })}
            <button
              className="tx-pg-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 14px', color: page === totalPages ? C.text3 : C.text2, fontSize: 12.5, fontWeight: 600, cursor: page === totalPages ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all .12s', opacity: page === totalPages ? .5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
