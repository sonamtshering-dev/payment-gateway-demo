'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, CreditCard, AlertTriangle, TrendingUp,
  LogOut, CheckCircle, XCircle, Clock, RefreshCw, X,
  ToggleLeft, ToggleRight, Bell
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ============================================================================
// UTILS
// ============================================================================
const formatCompact = (paise: number) => {
  const r = paise / 100;
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(1)}Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toFixed(0)}`;
};

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2' },
  high:     { color: '#ea580c', bg: '#fff7ed' },
  medium:   { color: '#d97706', bg: '#fffbeb' },
  low:      { color: '#65a30d', bg: '#f7fee7' },
};

// ============================================================================
// TOAST
// ============================================================================
const ToastContext = React.createContext<((msg: string, type?: string) => void) | null>(null);
function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
  const add = useCallback((msg: string, type = 'success') => {
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
            background: t.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: t.type === 'error' ? '#dc2626' : '#059669',
            border: `1px solid ${t.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 8, minWidth: 260,
          }}>
            {t.type === 'error' ? <XCircle size={16}/> : <CheckCircle size={16}/>}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => React.useContext(ToastContext)!;

// ============================================================================
// COMPONENTS
// ============================================================================
const Skeleton = ({ h = 20, w = '100%', r = 8 }: { h?: number; w?: string | number; r?: number }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}/>
);

const StatCard = ({ title, value, sub, icon: Icon, color = '#6366f1' }: any) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '8px 0 4px' }}>{value}</p>
        {sub && <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{sub}</p>}
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color="#fff"/>
      </div>
    </div>
  </div>
);

// ============================================================================
// MERCHANTS PAGE
// ============================================================================
const MerchantsPage = () => {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.adminListMerchants().then((r: any) => { if (r.success) setMerchants(r.data?.data || []); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, current: boolean) => {
    try {
      const r: any = await api.adminToggleMerchant(id);
      if (r.success) {
        setMerchants(m => m.map((x: any) => x.id === id ? { ...x, is_active: !current } : x));
        toast(`Merchant ${current ? 'deactivated' : 'activated'}`);
      } else toast(r.error || 'Failed', 'error');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>All Merchants</h2>
        <button onClick={load} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} h={56} r={8}/>)}
          </div>
        ) : merchants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }}/>
            <p style={{ fontSize: 15 }}>No merchants found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name', 'Email', 'API Key', 'Daily Limit', 'Created', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merchants.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafe')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                    {m.name}
                    {m.is_admin && <span style={{ marginLeft: 6, fontSize: 10, background: '#eef2ff', color: '#4f46e5', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>{m.email}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{m.api_key?.slice(0, 16)}...</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>{formatCompact(m.daily_limit || 0)}</td>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: m.is_active ? '#10b981' : '#ef4444', background: m.is_active ? '#ecfdf5' : '#fef2f2' }}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => toggle(m.id, m.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: m.is_active ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: 0 }}>
                      {m.is_active ? <><ToggleRight size={18}/> Deactivate</> : <><ToggleLeft size={18}/> Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FRAUD ALERTS PAGE
// ============================================================================
const FraudPage = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.adminGetFraudAlerts().then((r: any) => { if (r.success) setAlerts(r.data?.data || []); }).finally(() => setLoading(false));
  }, []);

  const resolve = async (id: string) => {
    try {
      const r: any = await api.adminResolveFraudAlert(id);
      if (r.success) { setAlerts(a => a.map((x: any) => x.id === id ? { ...x, resolved: true } : x)); toast('Alert resolved'); }
      else toast(r.error || 'Failed', 'error');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const unresolved = alerts.filter((a: any) => !a.resolved).length;

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3].map(i => <Skeleton key={i} h={100} r={12}/>)}</div>;

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
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map((alert: any) => (
            <div key={alert.id} style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${severityConfig[alert.severity]?.color || '#6b7280'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={16} color={severityConfig[alert.severity]?.color}/>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>{alert.alert_type.replace(/_/g, ' ')}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: severityConfig[alert.severity]?.color, backgroundColor: severityConfig[alert.severity]?.bg, textTransform: 'uppercase' }}>{alert.severity}</span>
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(alert.created_at).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px', paddingLeft: 26 }}>{alert.details}</p>
              <div style={{ paddingLeft: 26 }}>
                {!alert.resolved ? (
                  <button onClick={() => resolve(alert.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Mark Resolved</button>
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
// OVERVIEW PAGE
// ============================================================================
const OverviewPage = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetStats().then((r: any) => { if (r.success) setStats(r.data); }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}><Skeleton h={14} w="60%" r={6}/><Skeleton h={32} w="80%" r={6}/></div>)}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginBottom: 28 }}>
        <StatCard title="Total Merchants" value={(stats?.total_merchants || 0).toLocaleString()} sub="Registered" icon={Users} color="linear-gradient(135deg,#6366f1,#8b5cf6)"/>
        <StatCard title="Active Merchants" value={(stats?.active_merchants || 0).toLocaleString()} sub="Currently active" icon={CheckCircle} color="linear-gradient(135deg,#10b981,#059669)"/>
        <StatCard title="Total Volume" value={formatCompact(stats?.total_volume || 0)} sub="All time" icon={TrendingUp} color="linear-gradient(135deg,#f59e0b,#d97706)"/>
        <StatCard title="Total Transactions" value={(stats?.total_transactions || 0).toLocaleString()} sub="All merchants" icon={CreditCard} color="linear-gradient(135deg,#3b82f6,#2563eb)"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
        <StatCard title="Fraud Alerts" value={(stats?.unresolved_fraud_alerts || 0).toLocaleString()} sub="Unresolved" icon={AlertTriangle} color="linear-gradient(135deg,#ef4444,#dc2626)"/>
        <StatCard title="Success Rate" value={`${(stats?.success_rate || 0).toFixed(1)}%`} sub="System-wide" icon={TrendingUp} color="linear-gradient(135deg,#8b5cf6,#7c3aed)"/>
        <StatCard title="Today's Volume" value={formatCompact(stats?.today_volume || 0)} sub={`${stats?.today_transactions || 0} transactions`} icon={CreditCard} color="linear-gradient(135deg,#06b6d4,#0891b2)"/>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ADMIN LAYOUT
// ============================================================================
const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',       icon: TrendingUp },
  { id: 'merchants', label: 'Merchants',       icon: Users },
  { id: 'fraud',     label: 'Fraud Alerts',    icon: AlertTriangle },
];

export default function AdminPage() {
  const { merchant, logout, isLoading } = useAuth();
  const router = useRouter();
  const [activePage, setActivePage] = useState('overview');

  useEffect(() => {
    if (!isLoading && merchant && !merchant.is_admin) {
      router.replace('/dashboard');
    }
    if (!isLoading && !merchant) {
      router.replace('/auth/login');
    }
  }, [merchant, isLoading, router]);

  if (isLoading || !merchant) return null;

  const renderPage = () => {
    switch (activePage) {
      case 'overview':  return <OverviewPage/>;
      case 'merchants': return <MerchantsPage/>;
      case 'fraud':     return <FraudPage/>;
      default:          return <OverviewPage/>;
    }
  };

  const initials = merchant.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'A';

  return (
    <ToastProvider>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',-apple-system,sans-serif", background: '#f8f9fc' }}>
        {/* Sidebar */}
        <aside style={{ width: 260, background: '#111827', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 10 }}>
          <div style={{ padding: '24px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="#fff"/>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>UPay</span>
                <span style={{ fontSize: 10, color: '#ef4444', marginLeft: 4, fontWeight: 700, background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 4 }}>MASTER ADMIN</span>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '16px 12px' }}>
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button key={item.id} onClick={() => setActivePage(item.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  marginBottom: 4, fontSize: 14, fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(239,68,68,0.15)' : 'transparent',
                  color: active ? '#ef4444' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                  <Icon size={18}/>{item.label}
                </button>
              );
            })}

            <div style={{ marginTop: 16, padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => router.push('/dashboard')} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 14, background: 'transparent', color: 'rgba(255,255,255,0.4)',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                <CreditCard size={18}/> Merchant Dashboard
              </button>
            </div>
          </nav>

          <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#ef4444' }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{merchant.name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Master Admin</p>
              </div>
              <button onClick={logout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)' }}>
                <LogOut size={16}/>
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, marginLeft: 260 }}>
          <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, textTransform: 'capitalize' }}>
              {activePage === 'overview' ? 'System Overview' : activePage}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: '6px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={13}/> Admin Mode
              </div>
              <button style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
                <Bell size={18} color="#6b7280"/>
              </button>
            </div>
          </header>
          <div style={{ padding: '28px 32px' }}>{renderPage()}</div>
        </main>
      </div>
    </ToastProvider>
  );
}