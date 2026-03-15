'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Payment } from '@/types';

const formatAmount = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

const statusColors: Record<string, { bg: string; color: string }> = {
  paid: { bg: '#ecfdf5', color: '#059669' },
  pending: { bg: '#fffbeb', color: '#d97706' },
  failed: { bg: '#fef2f2', color: '#dc2626' },
  expired: { bg: '#f3f4f6', color: '#6b7280' },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '15' };
    if (filter) params.status = filter;

    api.getTransactions(params)
      .then((res: any) => {
        if (res.success && res.data) {
          setTransactions(res.data.data || []);
          setTotal(res.data.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Transactions</h1>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['', 'paid', 'pending', 'failed', 'expired'].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
            background: filter === s ? '#6366f1' : '#f3f4f6',
            color: filter === s ? '#fff' : '#6b7280',
          }}>{s || 'All'}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No transactions found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Payment ID', 'Order ID', 'Amount', 'Status', 'UTR', 'Date'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '11px 14px', color: '#6b7280',
                    fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const sc = statusColors[tx.status] || statusColors.pending;
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>
                      {tx.id.slice(0, 13)}...
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{tx.order_id}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {formatAmount(tx.amount)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        color: sc.color, background: sc.bg, textTransform: 'capitalize',
                      }}>{tx.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                      {tx.utr || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 12 }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', fontSize: 13, cursor: page === 1 ? 'default' : 'pointer',
              color: page === 1 ? '#d1d5db' : '#374151',
            }}>← Prev</button>
          <span style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280' }}>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', fontSize: 13, cursor: page === totalPages ? 'default' : 'pointer',
              color: page === totalPages ? '#d1d5db' : '#374151',
            }}>Next →</button>
        </div>
      )}
    </div>
  );
}
