'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Shield, CreditCard, AlertTriangle, TrendingUp, Settings,
  LogOut, Copy, Eye, EyeOff, Plus, RefreshCw,
  CheckCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight,
  Bell, Terminal, Key, Webhook, Trash2, X
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// ============================================================================
// UTILS
// ============================================================================
const formatAmount = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(paise / 100);

const formatCompact = (paise) => {
  const r = paise / 100;
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(1)}Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toFixed(0)}`;
};

const statusConfig = {
  paid:    { color: '#10b981', bg: '#ecfdf5', label: 'Paid',    icon: CheckCircle },
  pending: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending', icon: Clock },
  failed:  { color: '#ef4444', bg: '#fef2f2', label: 'Failed',  icon: XCircle },
  expired: { color: '#6b7280', bg: '#f3f4f6', label: 'Expired', icon: Clock },
};

const severityConfig = {
  critical: { color: '#dc2626', bg: '#fef2f2' },
  high:     { color: '#ea580c', bg: '#fff7ed' },
  medium:   { color: '#d97706', bg: '#fffbeb' },
  low:      { color: '#65a30d', bg: '#f7fee7' },
};

// ============================================================================
// TOAST
// ============================================================================
const ToastContext = React.createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={add}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500,
            background: t.type === 'error' ? '#fef2f2' : t.type === 'info' ? '#eef2ff' : '#ecfdf5',
            color: t.type === 'error' ? '#dc2626' : t.type === 'info' ? '#4f46e5' : '#059669',
            border: `1px solid ${t.type === 'error' ? '#fecaca' : t.type === 'info' ? '#c7d2fe' : '#a7f3d0'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 8, minWidth: 260,
            animation: 'slideIn 0.2s ease',
          }}>
            {t.type === 'error' ? <XCircle size={16}/> : <CheckCircle size={16}/>}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => React.useContext(ToastContext);

// ============================================================================
// COMPONENTS
// ============================================================================
const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg }}>
      <Icon size={12}/>{cfg.label}
    </span>
  );
};

const SeverityBadge = ({ severity }) => {
  const cfg = severityConfig[severity] || severityConfig.medium;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, backgroundColor: cfg.bg, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {severity}
    </span>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const handle = () => {
    navigator.clipboard.writeText(text || '');
    setCopied(true);
    toast('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#6b7280', padding: 4 }}>
      {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
    </button>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '8px 0 4px' }}>{value}</p>
        {subtitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {trend && (
              <span style={{ display: 'flex', alignItems: 'center', color: trendUp ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {trendUp ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}{trend}
              </span>
            )}
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{subtitle}</span>
          </div>
        )}
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color="#fff"/>
      </div>
    </div>
  </div>
);

const Skeleton = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}/>
);

// ============================================================================
// MODAL
// ============================================================================
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}><X size={20}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 14 };
const btnPrimary = { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'inherit' };

// ============================================================================
// OVERVIEW PAGE
// ============================================================================
const OverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280'];

  useEffect(() => {
    Promise.all([api.getStats(), api.getTransactions({ limit: '5' })])
      .then(([s, t]) => {
        if (s.success) setStats(s.data);
        if (t.success) setTxns(t.data?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const pieData = stats ? [
    { name: 'Paid',    value: stats.successful_payments },
    { name: 'Failed',  value: stats.failed_payments },
    { name: 'Pending', value: stats.pending_payments },
    { name: 'Expired', value: Math.max(0, stats.total_transactions - stats.successful_payments - stats.failed_payments - stats.pending_payments) },
  ] : [];

  const chartData = [
    { date: 'Mon', volume: 4200000 }, { date: 'Tue', volume: 5800000 },
    { date: 'Wed', volume: 3900000 }, { date: 'Thu', volume: 7100000 },
    { date: 'Fri', volume: 6300000 }, { date: 'Sat', volume: 8200000 },
    { date: 'Sun', volume: stats ? stats.today_volume : 5500000 },
  ];

  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginBottom: 28 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}><Skeleton h={14} w="60%" r={6}/><Skeleton h={32} w="80%" r={6}/><Skeleton h={12} w="40%" r={4}/></div>)}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginBottom: 28 }}>
        <StatCard title="Total Volume" value={formatCompact(stats?.total_volume||0)} subtitle="all time" trend="+12.5%" trendUp icon={TrendingUp}/>
        <StatCard title="Today's Revenue" value={formatCompact(stats?.today_volume||0)} subtitle={`${stats?.today_transactions||0} transactions`} trend="+8.2%" trendUp icon={CreditCard}/>
        <StatCard title="Success Rate" value={`${(stats?.success_rate||0).toFixed(1)}%`} subtitle="last 30 days" trend="+2.1%" trendUp icon={CheckCircle}/>
        <StatCard title="Pending" value={(stats?.pending_payments||0).toLocaleString()} subtitle="active sessions" icon={Clock}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Weekly Volume</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }}/>
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`}/>
              <Tooltip formatter={v => formatAmount(v)} labelStyle={{ fontWeight: 600 }}/>
              <Bar dataKey="volume" fill="url(#barGradient)" radius={[6,6,0,0]}/>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Payment Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
              </Pie>
              <Tooltip formatter={v => v.toLocaleString()}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {pieData.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: PIE_COLORS[i] }}/>
                <span style={{ color: '#6b7280' }}>{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Recent Transactions</h3>
        </div>
        {txns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            <CreditCard size={32} style={{ marginBottom: 10, opacity: 0.4 }}/>
            <p style={{ fontSize: 14 }}>No transactions yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Payment ID','Order ID','Customer','Amount','Status','UTR','Time'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>{tx.id?.slice(0,12)}... <CopyButton text={tx.id}/></td>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{tx.order_id}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{tx.customer_reference||'—'}</td>
                    <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'monospace' }}>{formatAmount(tx.amount)}</td>
                    <td style={{ padding: '12px' }}><StatusBadge status={tx.status}/></td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{tx.utr||'—'}</td>
                    <td style={{ padding: '12px', color: '#9ca3af', fontSize: 12 }}>{new Date(tx.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// TRANSACTIONS PAGE
// ============================================================================
const TransactionsPage = () => {
  const [filter, setFilter] = useState('all');
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page: String(page), limit: '20' };
    if (filter !== 'all') params.status = filter;
    api.getTransactions(params)
      .then(r => { if (r.success) { setTxns(r.data?.data || []); setTotal(r.data?.total || 0); }})
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all','paid','pending','failed','expired'].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
            background: filter === s ? '#6366f1' : '#f3f4f6',
            color: filter === s ? '#fff' : '#6b7280', transition: 'all 0.15s',
          }}>{s}</button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={44} r={8}/>)}
          </div>
        ) : txns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <CreditCard size={40} style={{ marginBottom: 12, opacity: 0.3 }}/>
            <p style={{ fontSize: 15, fontWeight: 500 }}>No transactions found</p>
            <p style={{ fontSize: 13 }}>Try changing the filter</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Payment ID','Order ID','Customer','Amount','Status','UTR','Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafe'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>{tx.id?.slice(0,12)}... <CopyButton text={tx.id}/></td>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>{tx.order_id}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>{tx.customer_reference||'—'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontFamily: 'monospace' }}>{formatAmount(tx.amount)}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={tx.status}/></td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{tx.utr||'—'}</td>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 12 }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>← Prev</button>
          <span style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280' }}>Page {page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={txns.length < 20} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Next →</button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SETTINGS PAGE
// ============================================================================
const SettingsPage = () => {
  const { merchant } = useAuth();
  const toast = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [rotatingKeys, setRotatingKeys] = useState(false);
  const [upis, setUpis] = useState([]);
  const [loadingUpis, setLoadingUpis] = useState(true);
  const [showAddUPI, setShowAddUPI] = useState(false);
  const [newUPI, setNewUPI] = useState({ upi_id: '', label: '', priority: 1 });
  const [addingUPI, setAddingUPI] = useState(false);
  const [apiKey, setApiKey] = useState(merchant?.api_key || '');

  useEffect(() => {
    api.listUPIs().then(r => { if (r.success) setUpis(r.data || []); }).finally(() => setLoadingUpis(false));
    api.getProfile().then(r => { if (r.success) { setApiKey(r.data?.api_key || ''); setWebhookUrl(r.data?.webhook_url || ''); }});
  }, []);

  const saveWebhook = async () => {
    if (!webhookUrl) return;
    setSavingWebhook(true);
    try {
      const r = await api.updateWebhook(webhookUrl);
      if (r.success) toast('Webhook URL saved!');
      else toast(r.error || 'Failed to save', 'error');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSavingWebhook(false); }
  };

  const rotateKeys = async () => {
    if (!confirm('Rotate API keys? Your current key will stop working immediately.')) return;
    setRotatingKeys(true);
    try {
      const r = await api.rotateAPIKeys();
      if (r.success) { setApiKey(r.data?.api_key || apiKey); toast('API keys rotated successfully!'); }
      else toast(r.error || 'Failed to rotate', 'error');
    } catch (e) { toast(e.message, 'error'); }
    finally { setRotatingKeys(false); }
  };

  const deleteUPI = async (id) => {
    if (!confirm('Remove this UPI ID?')) return;
    try {
      const r = await api.deleteUPI(id);
      if (r.success) { setUpis(u => u.filter(x => x.id !== id)); toast('UPI ID removed'); }
      else toast(r.error || 'Failed to remove', 'error');
    } catch (e) { toast(e.message, 'error'); }
  };

  const addUPI = async () => {
    if (!newUPI.upi_id) return;
    setAddingUPI(true);
    try {
      const r = await api.addUPI(newUPI.upi_id, newUPI.label, Number(newUPI.priority));
      if (r.success) {
        const r2 = await api.listUPIs();
        if (r2.success) setUpis(r2.data || []);
        setShowAddUPI(false);
        setNewUPI({ upi_id: '', label: '', priority: 1 });
        toast('UPI ID added successfully!');
      } else toast(r.error || 'Failed to add UPI', 'error');
    } catch (e) { toast(e.message, 'error'); }
    finally { setAddingUPI(false); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {showAddUPI && (
        <Modal title="Add UPI ID" onClose={() => setShowAddUPI(false)}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>UPI ID</label>
          <input style={inputStyle} placeholder="yourname@paytm" value={newUPI.upi_id} onChange={e => setNewUPI(u => ({...u, upi_id: e.target.value}))}/>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Label</label>
          <input style={inputStyle} placeholder="e.g. Primary Paytm" value={newUPI.label} onChange={e => setNewUPI(u => ({...u, label: e.target.value}))}/>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Priority</label>
          <input style={inputStyle} type="number" min="1" value={newUPI.priority} onChange={e => setNewUPI(u => ({...u, priority: e.target.value}))}/>
          <button onClick={addUPI} disabled={addingUPI || !newUPI.upi_id} style={btnPrimary}>
            {addingUPI ? 'Adding...' : 'Add UPI ID'}
          </button>
        </Modal>
      )}

      {/* API Credentials */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Key size={20} color="#6366f1"/>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>API Credentials</h3>
          </div>
          <button onClick={rotateKeys} disabled={rotatingKeys} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <RefreshCw size={14}/>{rotatingKeys ? 'Rotating...' : 'Rotate Keys'}
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <code style={{ flex: 1, fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{apiKey || 'Loading...'}</code>
            <CopyButton text={apiKey}/>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>⚠️ Never share your API Secret. Rotate keys immediately if compromised.</p>
      </div>

      {/* UPI IDs */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={20} color="#6366f1"/>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>UPI IDs</h3>
          </div>
          <button onClick={() => setShowAddUPI(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <Plus size={14}/> Add UPI ID
          </button>
        </div>
        {loadingUpis ? <Skeleton h={60} r={10}/> : upis.length === 0 ? (
          <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>No UPI IDs added yet. Add one to start accepting payments.</p>
        ) : upis.map(upi => (
          <div key={upi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#111827' }}>{upi.label || 'Unlabelled'}</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0', fontFamily: 'monospace' }}>{upi.upi_id}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Priority: {upi.priority}</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#10b981', background: '#ecfdf5' }}>Active</span>
              <button onClick={() => deleteUPI(upi.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 14 }}>UPI IDs are auto-rotated across payment sessions for load distribution.</p>
      </div>

      {/* Webhook */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Webhook size={20} color="#6366f1"/>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>Webhook Configuration</h3>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endpoint URL</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://yoursite.com/webhooks/upay"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'monospace' }}/>
          <button onClick={saveWebhook} disabled={savingWebhook} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            {savingWebhook ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>Webhooks are signed with HMAC-SHA256. Verify the X-Webhook-Signature header on your server.</p>
      </div>
    </div>
  );
};

// ============================================================================
// FRAUD ALERTS PAGE
// ============================================================================
const FraudAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.adminGetFraudAlerts()
      .then(r => { if (r.success) setAlerts(r.data?.data || []); })
      .catch(e => { if (e.message?.toLowerCase().includes("admin")) setAccessDenied(true); })
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id) => {
    try {
      const r = await api.adminResolveFraudAlert(id);
      if (r.success) { setAlerts(a => a.map(x => x.id === id ? {...x, resolved: true} : x)); toast('Alert resolved'); }
      else toast(r.error || 'Failed to resolve', 'error');
    } catch (e) { toast(e.message, 'error'); }
  };

  const unresolved = alerts.filter(a => !a.resolved).length;

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3].map(i => <Skeleton key={i} h={100} r={12}/>)}</div>;
  if (accessDenied) return <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}><AlertTriangle size={40} style={{ marginBottom: 12, opacity: 0.3 }}/><p style={{ fontSize: 15, fontWeight: 500 }}>Admin access required</p><p style={{ fontSize: 13 }}>Fraud alerts are only visible to admin accounts.</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 18px', borderRadius: 12, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
          {unresolved} Unresolved Alert{unresolved !== 1 ? 's' : ''}
        </div>
      </div>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <CheckCircle size={40} style={{ marginBottom: 12, opacity: 0.3 }}/>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No fraud alerts</p>
          <p style={{ fontSize: 13 }}>Your account looks clean!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${severityConfig[alert.severity]?.color || '#6b7280'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={16} color={severityConfig[alert.severity]?.color}/>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>{alert.alert_type.replace(/_/g, ' ')}</span>
                  <SeverityBadge severity={alert.severity}/>
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(alert.created_at).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px', paddingLeft: 26 }}>{alert.details}</p>
              <div style={{ paddingLeft: 26 }}>
                {!alert.resolved ? (
                  <button onClick={() => resolve(alert.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Mark Resolved
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Resolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INTEGRATION PAGE (static — no changes needed)
// ============================================================================
const IntegrationPage = () => (
  <div style={{ maxWidth: 800 }}>
    <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Terminal size={20} color="#6366f1"/>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>Quick Start Integration</h3>
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 20 }}>1. Create Payment Session</h4>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12, fontSize: 12.5, lineHeight: 1.6, overflow: 'auto', marginTop: 8 }}>{`curl -X POST http://localhost/api/v1/payments/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: upay_your_key" \\
  -H "X-TIMESTAMP: $(date +%s)" \\
  -H "X-SIGNATURE: <hmac_sha256>" \\
  -d '{"merchant_id":"uuid","order_id":"ORD-001","amount":249900,"currency":"INR"}'`}</pre>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 24 }}>2. Generate Signature (Node.js)</h4>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12, fontSize: 12.5, lineHeight: 1.6, overflow: 'auto', marginTop: 8 }}>{`const crypto = require('crypto');
function sign(secret, timestamp, body) {
  return crypto.createHmac('sha256', secret)
    .update(secret + timestamp + body).digest('hex');
}`}</pre>
    </div>
  </div>
);


// ============================================================================
// CREATE PAYMENT MODAL
// ============================================================================
const CreatePaymentModal = ({ onClose, merchantId }) => {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [orderId, setOrderId] = useState(`ORD-${Date.now()}`);
  const [customerRef, setCustomerRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState(null);

  const create = async () => {
    if (!amount || !orderId) return;
    setLoading(true);
    try {
      const r = await api.createPayment(merchantId, orderId, Math.round(parseFloat(amount) * 100), customerRef);
      if (r.success) { setPayment(r.data); pollStatus(r.data.payment_id); }
      else toast(r.error || 'Failed to create payment', 'error');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const pollStatus = (id) => {
    const interval = setInterval(async () => {
      try {
        const r = await api.getPaymentStatus(id);
        if (r.success) {
          setStatus(r.data.status);
          if (r.data.status === 'paid' || r.data.status === 'failed' || r.data.status === 'expired') {
            clearInterval(interval);
          }
        }
      } catch {}
    }, 3000);
    setTimeout(() => clearInterval(interval), 15 * 60 * 1000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Create Payment</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}><X size={20}/></button>
        </div>

        {!payment ? (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 16, outline: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' }}/>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Order ID</label>
            <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'monospace' }}/>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Customer Reference (optional)</label>
            <input type="text" value={customerRef} onChange={e => setCustomerRef(e.target.value)} placeholder="Customer name or ID" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', marginBottom: 24, boxSizing: 'border-box', fontFamily: 'inherit' }}/>

            <button onClick={create} disabled={loading || !amount || !orderId} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading || !amount ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Creating...' : `Generate QR for ₹${parseFloat(amount || 0).toFixed(2)}`}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              {status === 'paid' ? (
                <div style={{ background: '#ecfdf5', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                  <CheckCircle size={40} color="#10b981" style={{ marginBottom: 8 }}/>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#059669', margin: 0 }}>Payment Received!</p>
                </div>
              ) : status === 'failed' ? (
                <div style={{ background: '#fef2f2', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                  <XCircle size={40} color="#ef4444" style={{ marginBottom: 8 }}/>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', margin: 0 }}>Payment Failed</p>
                </div>
              ) : (
                <div style={{ background: '#fffbeb', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Clock size={16} color="#f59e0b"/>
                  <p style={{ fontSize: 13, color: '#d97706', margin: 0, fontWeight: 600 }}>Waiting for payment... polling every 3s</p>
                </div>
              )}
            </div>

            {payment.qr_code_base64 && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 16, display: 'inline-block' }}>
                <img src={`data:image/png;base64,${payment.qr_code_base64}`} alt="QR Code" style={{ width: 200, height: 200, display: 'block' }}/>
              </div>
            )}

            <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>₹{(payment.amount / 100).toFixed(2)}</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', fontFamily: 'monospace' }}>{payment.payment_id}</p>

            {payment.upi_intent_link && (
              <a href={payment.upi_intent_link} style={{ display: 'block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '12px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                Open in UPI App
              </a>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7280', fontFamily: 'inherit' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD
// ============================================================================
const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',      icon: TrendingUp },
  { id: 'transactions',  label: 'Transactions',  icon: CreditCard },
  { id: 'fraud',         label: 'Fraud Alerts',  icon: AlertTriangle },
  { id: 'settings',      label: 'Settings',      icon: Settings },
  { id: 'integration',   label: 'Integration',   icon: Terminal },
];

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const { merchant, logout } = useAuth();

  const renderPage = () => {
    switch (activePage) {
      case 'overview':     return <OverviewPage/>;
      case 'transactions': return <TransactionsPage/>;
      case 'fraud':        return <FraudAlertsPage/>;
      case 'settings':     return <SettingsPage/>;
      case 'integration':  return <IntegrationPage/>;
      default:             return <OverviewPage/>;
    }
  };

  const initials = merchant?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

  const navTo = (id) => { setActivePage(id); setSidebarOpen(false); };

  return (
    <ToastProvider>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideLeft { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .header-padding { padding: 12px 16px !important; }
          .page-padding { padding: 16px !important; }
          .stat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .sidebar-mobile-overlay { display: none !important; }
          .hamburger-btn { display: none !important; }
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>
          <aside className="sidebar-mobile-overlay" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', animation: 'slideLeft 0.2s ease', zIndex: 101 }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color="#fff"/>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>UPay</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20}/></button>
            </div>
            <nav style={{ flex: 1, padding: '12px' }}>
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button key={item.id} onClick={() => navTo(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, fontSize: 14, fontWeight: active ? 600 : 400, background: active ? '#eef2ff' : 'transparent', color: active ? '#4f46e5' : '#6b7280', fontFamily: 'inherit' }}>
                    <Icon size={18}/>{item.label}
                  </button>
                );
              })}
              {merchant?.is_admin && (
                <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, marginTop: 8, fontSize: 14, fontWeight: 500, background: '#fef2f2', color: '#dc2626', textDecoration: 'none' }}>
                  <Shield size={18}/> Master Admin
                </a>
              )}
            </nav>
            <div style={{ padding: '12px', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#6366f1' }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{merchant?.name}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{merchant?.email}</p>
                </div>
                <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><LogOut size={16}/></button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',-apple-system,sans-serif", background: '#f8f9fc' }}>
        {/* Desktop Sidebar */}
        <aside className="sidebar-desktop" style={{ width: 260, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 10 }}>
          <div style={{ padding: '24px 22px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="#fff"/>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>UPay</span>
                <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 4, fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: 4 }}>GATEWAY</span>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button key={item.id} onClick={() => setActivePage(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, fontSize: 14, fontWeight: active ? 600 : 400, background: active ? '#eef2ff' : 'transparent', color: active ? '#4f46e5' : '#6b7280', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  <Icon size={18}/>{item.label}
                </button>
              );
            })}
            {merchant?.is_admin && (
              <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, marginTop: 8, fontSize: 14, fontWeight: 500, background: '#fef2f2', color: '#dc2626', textDecoration: 'none', border: '1px solid #fecaca' }}>
                <Shield size={18}/> Master Admin
              </a>
            )}
          </nav>
          <div style={{ padding: '16px 12px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#6366f1' }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{merchant?.name || 'Merchant'}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{merchant?.email || ''}</p>
              </div>
              <button onClick={logout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af' }}><LogOut size={16}/></button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content" style={{ flex: 1, marginLeft: 260 }}>
          <header className="header-padding" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, textTransform: 'capitalize' }}>
                {activePage === 'overview' ? 'Dashboard' : activePage.replace('_', ' ')}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setShowCreatePayment(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                <Plus size={15}/> New Payment
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#ecfdf5', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#10b981' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}/>Live
              </div>
              <button style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
                <Bell size={18} color="#6b7280"/>
              </button>
            </div>
          </header>
          <div className="page-padding" style={{ padding: '28px 32px' }}>{renderPage()}</div>
        </main>
      </div>

      {showCreatePayment && (
        <CreatePaymentModal
          onClose={() => setShowCreatePayment(false)}
          merchantId={merchant?.id}
        />
      )}
    </ToastProvider>
  );
}