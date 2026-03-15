import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  Shield, CreditCard, AlertTriangle, TrendingUp, Users, Settings,
  LogOut, ChevronRight, Copy, Eye, EyeOff, Plus, RefreshCw,
  CheckCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight,
  Bell, Search, Filter, ExternalLink, Zap, Lock, Globe,
  Terminal, Key, Webhook
} from 'lucide-react';

// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_STATS = {
  total_transactions: 24853,
  successful_payments: 22147,
  failed_payments: 1206,
  pending_payments: 1500,
  total_volume: 1847500000,
  success_rate: 89.1,
  today_transactions: 847,
  today_volume: 63250000,
};

const MOCK_TRANSACTIONS = [
  { id: 'pay_8f2a1b3c', order_id: 'ORD-20240115-001', amount: 249900, status: 'paid', utr: 'UTR123456789', created_at: '2024-01-15T10:30:00Z', customer_reference: 'Rahul S.' },
  { id: 'pay_9d4e5f6a', order_id: 'ORD-20240115-002', amount: 99900, status: 'paid', utr: 'UTR987654321', created_at: '2024-01-15T10:28:00Z', customer_reference: 'Priya M.' },
  { id: 'pay_1a2b3c4d', order_id: 'ORD-20240115-003', amount: 1500000, status: 'pending', utr: null, created_at: '2024-01-15T10:25:00Z', customer_reference: 'Amit K.' },
  { id: 'pay_5e6f7a8b', order_id: 'ORD-20240115-004', amount: 49900, status: 'failed', utr: null, created_at: '2024-01-15T10:20:00Z', customer_reference: 'Sneha R.' },
  { id: 'pay_2c3d4e5f', order_id: 'ORD-20240115-005', amount: 349900, status: 'paid', utr: 'UTR456789123', created_at: '2024-01-15T10:15:00Z', customer_reference: 'Vikram T.' },
  { id: 'pay_6a7b8c9d', order_id: 'ORD-20240115-006', amount: 199500, status: 'expired', utr: null, created_at: '2024-01-15T10:10:00Z', customer_reference: 'Deepa L.' },
  { id: 'pay_0e1f2a3b', order_id: 'ORD-20240115-007', amount: 75000, status: 'paid', utr: 'UTR741852963', created_at: '2024-01-15T10:05:00Z', customer_reference: 'Karan P.' },
];

const MOCK_CHART_DATA = [
  { date: 'Mon', volume: 4200000, count: 120 },
  { date: 'Tue', volume: 5800000, count: 156 },
  { date: 'Wed', volume: 3900000, count: 98 },
  { date: 'Thu', volume: 7100000, count: 201 },
  { date: 'Fri', volume: 6300000, count: 178 },
  { date: 'Sat', volume: 8200000, count: 234 },
  { date: 'Sun', volume: 5500000, count: 142 },
];

const MOCK_UPIS = [
  { id: '1', upi_id: 'mer****@paytm', label: 'Primary Paytm', is_active: true, priority: 1 },
  { id: '2', upi_id: 'sho****@okaxis', label: 'Axis Bank', is_active: true, priority: 2 },
  { id: '3', upi_id: 'bus****@ybl', label: 'PhonePe Business', is_active: true, priority: 3 },
];

const MOCK_FRAUD_ALERTS = [
  { id: '1', alert_type: 'duplicate_utr', severity: 'high', details: 'UTR UTR999888777 used in 2 payments', resolved: false, created_at: '2024-01-15T09:30:00Z' },
  { id: '2', alert_type: 'amount_mismatch', severity: 'critical', details: 'Expected ₹2,499.00, received ₹249.90', resolved: false, created_at: '2024-01-15T08:15:00Z' },
  { id: '3', alert_type: 'rate_limit', severity: 'medium', details: 'IP 103.x.x.x exceeded 100 req/min', resolved: true, created_at: '2024-01-14T22:00:00Z' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatAmount = (paise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
};

const formatCompact = (paise) => {
  const rupees = paise / 100;
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${rupees.toFixed(0)}`;
};

const statusConfig = {
  paid: { color: '#10b981', bg: '#ecfdf5', label: 'Paid', icon: CheckCircle },
  pending: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending', icon: Clock },
  failed: { color: '#ef4444', bg: '#fef2f2', label: 'Failed', icon: XCircle },
  expired: { color: '#6b7280', bg: '#f3f4f6', label: 'Expired', icon: Clock },
};

const severityConfig = {
  critical: { color: '#dc2626', bg: '#fef2f2' },
  high: { color: '#ea580c', bg: '#fff7ed' },
  medium: { color: '#d97706', bg: '#fffbeb' },
  low: { color: '#65a30d', bg: '#f7fee7' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: config.color, backgroundColor: config.bg,
    }}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const SeverityBadge = ({ severity }) => {
  const config = severityConfig[severity] || severityConfig.medium;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: config.color, backgroundColor: config.bg, textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {severity}
    </span>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp }) => (
  <div style={{
    background: '#fff', borderRadius: 16, padding: '24px',
    border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '8px 0 4px' }}>{value}</p>
        {subtitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {trend && (
              <span style={{ display: 'flex', alignItems: 'center', color: trendUp ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend}
              </span>
            )}
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{subtitle}</span>
          </div>
        )}
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color="#fff" />
      </div>
    </div>
  </div>
);

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: copied ? '#10b981' : '#6b7280', padding: 4,
    }}>
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
    </button>
  );
};

// ============================================================================
// PAGE VIEWS
// ============================================================================

const OverviewPage = () => {
  const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280'];
  const pieData = [
    { name: 'Paid', value: MOCK_STATS.successful_payments },
    { name: 'Failed', value: MOCK_STATS.failed_payments },
    { name: 'Pending', value: MOCK_STATS.pending_payments },
    { name: 'Expired', value: MOCK_STATS.total_transactions - MOCK_STATS.successful_payments - MOCK_STATS.failed_payments - MOCK_STATS.pending_payments },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
        <StatCard title="Total Volume" value={formatCompact(MOCK_STATS.total_volume)} subtitle="vs last week" trend="+12.5%" trendUp icon={TrendingUp} />
        <StatCard title="Today's Revenue" value={formatCompact(MOCK_STATS.today_volume)} subtitle={`${MOCK_STATS.today_transactions} transactions`} trend="+8.2%" trendUp icon={CreditCard} />
        <StatCard title="Success Rate" value={`${MOCK_STATS.success_rate}%`} subtitle="last 30 days" trend="+2.1%" trendUp icon={CheckCircle} />
        <StatCard title="Pending" value={MOCK_STATS.pending_payments.toLocaleString()} subtitle="active sessions" icon={Clock} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Weekly Volume</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={MOCK_CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip formatter={(v) => formatAmount(v)} labelStyle={{ fontWeight: 600 }} />
              <Bar dataKey="volume" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
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
                {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {pieData.map((entry, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: PIE_COLORS[idx] }} />
                <span style={{ color: '#6b7280' }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Recent Transactions</h3>
          <button style={{
            background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '6px 14px', fontSize: 13, color: '#6366f1', cursor: 'pointer', fontWeight: 500
          }}>View All →</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Payment ID', 'Order ID', 'Customer', 'Amount', 'Status', 'UTR', 'Time'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.slice(0, 5).map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>
                    {tx.id} <CopyButton text={tx.id} />
                  </td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{tx.order_id}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{tx.customer_reference}</td>
                  <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'monospace' }}>{formatAmount(tx.amount)}</td>
                  <td style={{ padding: '12px' }}><StatusBadge status={tx.status} /></td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{tx.utr || '—'}</td>
                  <td style={{ padding: '12px', color: '#9ca3af', fontSize: 12 }}>{new Date(tx.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TransactionsPage = () => {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? MOCK_TRANSACTIONS : MOCK_TRANSACTIONS.filter(t => t.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'paid', 'pending', 'failed', 'expired'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
            background: filter === s ? '#6366f1' : '#f3f4f6',
            color: filter === s ? '#fff' : '#6b7280',
            transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Payment ID', 'Order ID', 'Customer', 'Amount', 'Status', 'UTR', 'Created'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>{tx.id} <CopyButton text={tx.id} /></td>
                <td style={{ padding: '14px 16px', fontWeight: 500 }}>{tx.order_id}</td>
                <td style={{ padding: '14px 16px', color: '#6b7280' }}>{tx.customer_reference}</td>
                <td style={{ padding: '14px 16px', fontWeight: 600, fontFamily: 'monospace' }}>{formatAmount(tx.amount)}</td>
                <td style={{ padding: '14px 16px' }}><StatusBadge status={tx.status} /></td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{tx.utr || '—'}</td>
                <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 12 }}>{new Date(tx.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://myshop.com/webhooks/upay');
 const apiKey = process.env.NEXT_PUBLIC_API_KEY;
const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
  return (
    <div style={{ maxWidth: 800 }}>
      {/* API Credentials */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Key size={20} color="#6366f1" />
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>API Credentials</h3>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <code style={{ flex: 1, fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{apiKey}</code>
            <CopyButton text={apiKey} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Secret</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <code style={{ flex: 1, fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>
              {showSecret ? apiSecret : '••••••••••••••••••••••••••••••••'}
            </code>
            <button onClick={() => setShowSecret(!showSecret)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <CopyButton text={apiSecret} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          ⚠️ Never share your API Secret. Rotate keys immediately if compromised.
        </p>
      </div>

      {/* UPI IDs */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={20} color="#6366f1" />
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>UPI IDs</h3>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#6366f1', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>
            <Plus size={14} /> Add UPI ID
          </button>
        </div>
        {MOCK_UPIS.map(upi => (
          <div key={upi.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 0', borderBottom: '1px solid #f3f4f6',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#111827' }}>{upi.label}</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0', fontFamily: 'monospace' }}>{upi.upi_id}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Priority: {upi.priority}</span>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                color: '#10b981', background: '#ecfdf5',
              }}>Active</span>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 14 }}>
          UPI IDs are auto-rotated across payment sessions for load distribution.
        </p>
      </div>

      {/* Webhook */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Webhook size={20} color="#6366f1" />
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>Webhook Configuration</h3>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endpoint URL</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 14, outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button style={{
            background: '#6366f1', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>Save</button>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
          Webhooks are signed with HMAC-SHA256. Verify the X-Webhook-Signature header on your server.
        </p>
      </div>
    </div>
  );
};

const FraudAlertsPage = () => (
  <div>
    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      <div style={{ padding: '10px 18px', borderRadius: 12, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
        2 Unresolved Alerts
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {MOCK_FRAUD_ALERTS.map(alert => (
        <div key={alert.id} style={{
          background: '#fff', borderRadius: 14, padding: '18px 22px',
          border: '1px solid #e5e7eb',
          borderLeft: `4px solid ${severityConfig[alert.severity]?.color || '#6b7280'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} color={severityConfig[alert.severity]?.color} />
              <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>
                {alert.alert_type.replace('_', ' ')}
              </span>
              <SeverityBadge severity={alert.severity} />
            </div>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(alert.created_at).toLocaleString()}</span>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px', paddingLeft: 26 }}>{alert.details}</p>
          <div style={{ paddingLeft: 26 }}>
            {!alert.resolved ? (
              <button style={{
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>Mark Resolved</button>
            ) : (
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Resolved</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const IntegrationPage = () => (
  <div style={{ maxWidth: 800 }}>
    <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e5e7eb', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Terminal size={20} color="#6366f1" />
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>Quick Start Integration</h3>
      </div>

      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 20 }}>1. Create Payment Session</h4>
      <pre style={{
        background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12,
        fontSize: 12.5, lineHeight: 1.6, overflow: 'auto', marginTop: 8,
      }}>{`curl -X POST https://api.upay.dev/api/v1/payments/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: upay_your_api_key" \\
  -H "X-TIMESTAMP: $(date +%s)" \\
  -H "X-SIGNATURE: <hmac_sha256_signature>" \\
  -d '{
    "merchant_id": "uuid-here",
    "order_id": "ORD-001",
    "amount": 249900,
    "currency": "INR",
    "customer_reference": "John Doe"
  }'`}</pre>

      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 24 }}>2. Generate Signature (Node.js)</h4>
      <pre style={{
        background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12,
        fontSize: 12.5, lineHeight: 1.6, overflow: 'auto', marginTop: 8,
      }}>{`const crypto = require('crypto');

function generateSignature(secret, timestamp, body) {
  const message = secret + timestamp + body;
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify(requestPayload);
const signature = generateSignature(API_SECRET, timestamp, body);`}</pre>

      <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 24 }}>3. Verify Webhook</h4>
      <pre style={{
        background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12,
        fontSize: 12.5, lineHeight: 1.6, overflow: 'auto', marginTop: 8,
      }}>{`app.post('/webhooks/upay', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature), Buffer.from(expected)
  )) {
    return res.status(401).send('Invalid signature');
  }

  // Process the payment update
  const { payment_id, status, utr } = req.body;
  console.log('Payment', payment_id, 'status:', status);
  
  res.status(200).send('OK');
});`}</pre>
    </div>
  </div>
);

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'fraud', label: 'Fraud Alerts', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'integration', label: 'Integration', icon: Terminal },
];

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const renderPage = () => {
    switch (activePage) {
      case 'overview': return <OverviewPage />;
      case 'transactions': return <TransactionsPage />;
      case 'fraud': return <FraudAlertsPage />;
      case 'settings': return <SettingsPage />;
      case 'integration': return <IntegrationPage />;
      default: return <OverviewPage />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8f9fc' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 22px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>UPay</span>
              <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 4, fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: 4 }}>GATEWAY</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  marginBottom: 4, fontSize: 14, fontWeight: active ? 600 : 450,
                  background: active ? '#eef2ff' : 'transparent',
                  color: active ? '#4f46e5' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={18} />
                {item.label}
                {item.id === 'fraud' && (
                  <span style={{
                    marginLeft: 'auto', background: '#fef2f2', color: '#dc2626',
                    fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  }}>2</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: '#6366f1',
            }}>X</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Xenpai Store</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>xenpai@merchant.dev</p>
            </div>
            <LogOut size={16} color="#9ca3af" style={{ cursor: 'pointer' }} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 260 }}>
        {/* Top Bar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, textTransform: 'capitalize' }}>
            {activePage === 'overview' ? 'Dashboard' : activePage.replace('_', ' ')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: '#ecfdf5', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#10b981',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
              Live
            </div>
            <button style={{
              position: 'relative', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 10, padding: 8, cursor: 'pointer',
            }}>
              <Bell size={18} color="#6b7280" />
              <span style={{
                position: 'absolute', top: -2, right: -2, width: 16, height: 16,
                borderRadius: '50%', background: '#ef4444', color: '#fff',
                fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>2</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '28px 32px' }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
