'use client';
import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Payment } from '@/types';

const fmt = (p: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6', label: 'Paid'    },
  pending: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pending' },
  failed:  { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Failed'  },
  expired: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Expired' },
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
    if (!search) return true;
    const q = search.toLowerCase();
    return tx.order_id?.toLowerCase().includes(q) || tx.id?.toLowerCase().includes(q) || tx.customer_reference?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(total / limit);

  const exportCSV = () => {
    const rows = [['Payment ID','Order ID','Amount','Status','Date']];
    filtered.forEach(tx => rows.push([tx.id, tx.order_id, String(tx.amount/100), tx.status, new Date(tx.created_at).toLocaleString()]));
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const inp: React.CSSProperties = { background: '#0f1d35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 14px', color: '#dbeafe', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>Orders</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Total {total.toLocaleString('en-IN')} orders</div>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 18px', color: '#dbeafe', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>↓ Export</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' as const }}>
          <span style={{ position: 'absolute' as const, left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
          <input style={{ ...inp, width: '100%', paddingLeft: 36, boxSizing: 'border-box' as const }} placeholder="Search by Order ID or Customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={inp} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
          {[10,25,50,100].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select style={inp} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Start Date</label>
          <input type="date" style={{ ...inp, width: '100%', boxSizing: 'border-box' as const }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>End Date</label>
          <input type="date" style={{ ...inp, width: '100%', boxSizing: 'border-box' as const }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr 0.8fr 1fr 1fr 0.8fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
          <span>Order ID</span><span>Client TXN ID</span><span>Customer</span><span>Amount</span><span>Date</span><span>Status</span><span>Actions</span>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' as const, color: '#4b5563' }}>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' as const, color: '#4b5563' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#dbeafe', marginBottom: 6 }}>No orders found</div>
            <div style={{ fontSize: 13 }}>Orders will appear here once payments are created</div>
          </div>
        ) : filtered.map((tx, i) => {
          const s = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
          return (
            <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr 0.8fr 1fr 1fr 0.8fr', padding: '14px 20px', borderBottom: i < filtered.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', fontSize: 13, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b9ab5' }}>{tx.order_id}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{tx.id?.slice(0,12)}...</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{tx.customer_reference || '—'}</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>{fmt(tx.amount)}</span>
              <div><div style={{ fontSize: 12 }}>{fmtDate(tx.created_at)}</div><div style={{ fontSize: 11, color: '#4b5563' }}>{fmtTime(tx.created_at)}</div></div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
              </span>
              <button onClick={() => navigator.clipboard?.writeText(tx.order_id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Copy</button>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 16px', color: page===1?'#4b5563':'#dbeafe', fontSize: 13, cursor: page===1?'default':'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Prev</button>
          <span style={{ fontSize: 13, color: '#64748b', padding: '0 8px' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 16px', color: page===totalPages?'#4b5563':'#dbeafe', fontSize: 13, cursor: page===totalPages?'default':'pointer', fontFamily: 'DM Sans, sans-serif' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
