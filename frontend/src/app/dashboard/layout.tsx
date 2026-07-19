'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle,
  Link2, Plug, PackagePlus, FileCode2, ShieldCheck, Shield,
  Home, LogOut, ChevronLeft, ChevronRight, Bell, Menu, X,
  BarChart2, Palette, CreditCard, TrendingUp, Users,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Payments',
    items: [
      { label: 'Overview',       href: '/dashboard',              icon: LayoutDashboard },
      { label: 'Transactions',   href: '/dashboard/transactions', icon: ArrowLeftRight  },
      { label: 'Payment Links',  href: '/dashboard/payments',     icon: Link2           },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Stats',          href: '/dashboard/stats',  icon: BarChart2  },
      { label: 'Profit Tracker', href: '/dashboard/profit', icon: TrendingUp },
    ],
  },
  {
    label: 'Merchants',
    items: [
      { label: 'Connect Merchant', href: '/dashboard/connect-merchant', icon: Plug        },
      { label: 'Referrals',        href: '/dashboard/referral',         icon: Users       },
      { label: 'KYC Verification', href: '/dashboard/kyc',              icon: ShieldCheck },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'My Plan',      href: '/dashboard/active-subscription', icon: CreditCard  },
      { label: 'Subscription', href: '/dashboard/subscription',        icon: PackagePlus },
    ],
  },
  {
    label: 'Developers',
    items: [
      { label: 'API & Webhooks', href: '/dashboard/api-docs',  icon: FileCode2 },
      { label: 'Branding',       href: '/dashboard/branding',  icon: Palette   },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Fraud Alerts', href: '/dashboard/fraud', icon: AlertTriangle },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':                     'Overview',
  '/dashboard/stats':               'Stats',
  '/dashboard/transactions':        'Transactions',
  '/dashboard/payments':            'Payment Links',
  '/dashboard/connect-merchant':    'Connect Merchant',
  '/dashboard/fraud':               'Fraud Alerts',
  '/dashboard/active-subscription': 'My Plan',
  '/dashboard/referral':            'Referrals',
  '/dashboard/subscription':        'Subscription',
  '/dashboard/api-docs':            'API & Webhooks',
  '/dashboard/profit':              'Profit Tracker',
  '/dashboard/kyc':                 'KYC Verification',
  '/dashboard/branding':            'Branding',
};

const STYLES = `
  /* ── Reset / Shell ────────────────────────────────────────────── */
  .np-shell {
    display: flex; min-height: 100vh;
    background: #F1F5FB;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
  }

  /* ── Sidebar ──────────────────────────────────────────────────── */
  .np-sidebar {
    width: 216px; flex-shrink: 0;
    background: #FFFFFF;
    border-right: 1px solid #E2E8F0;
    display: flex; flex-direction: column;
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
    transition: width 0.22s ease, transform 0.22s ease;
    overflow: hidden;
  }
  .np-sidebar.collapsed { width: 58px; }

  .np-sidebar-logo {
    height: 56px; display: flex; align-items: center; gap: 9px;
    padding: 0 14px; border-bottom: 1px solid #E2E8F0;
    overflow: hidden; flex-shrink: 0;
  }
  .np-logo-mark {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    background: #2563EB;
    display: flex; align-items: center; justify-content: center;
  }
  .np-logo-text {
    font-size: 15px; font-weight: 800; color: #0F172A;
    letter-spacing: -0.03em; white-space: nowrap;
    transition: opacity 0.18s;
  }
  .collapsed .np-logo-text { opacity: 0; width: 0; overflow: hidden; }

  .np-collapse-btn {
    position: absolute; top: 17px; right: -11px;
    width: 22px; height: 22px; border-radius: 50%;
    background: #FFFFFF; border: 1px solid #E2E8F0;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #94A3B8; z-index: 60;
    transition: color 0.12s, border-color 0.12s;
  }
  .np-collapse-btn:hover { color: #2563EB; border-color: #DBEAFE; }

  .np-nav {
    flex: 1; padding: 6px 8px;
    overflow-y: auto; overflow-x: hidden;
  }
  .np-nav::-webkit-scrollbar { width: 3px; }
  .np-nav::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px; }

  .np-nav-group { margin-bottom: 2px; }
  .np-nav-group-label {
    font-size: 10px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: #94A3B8;
    padding: 10px 8px 3px; white-space: nowrap;
    transition: opacity 0.18s;
  }
  .collapsed .np-nav-group-label { opacity: 0; }

  .np-nav-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: 7px; margin-bottom: 1px;
    cursor: pointer; border: none; background: transparent;
    color: #475569; font-size: 12.5px; font-weight: 500;
    font-family: inherit; width: 100%; text-align: left;
    text-decoration: none;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap; overflow: hidden;
  }
  .np-nav-item:hover { background: #F8FAFF; color: #0F172A; }
  .np-nav-item.active {
    background: #EFF6FF; color: #2563EB; font-weight: 600;
  }
  .np-nav-icon { flex-shrink: 0; opacity: 0.7; }
  .np-nav-item.active .np-nav-icon { opacity: 1; }
  .np-nav-label { transition: opacity 0.18s; overflow: hidden; }
  .collapsed .np-nav-label { opacity: 0; width: 0; }
  .collapsed .np-nav-item { justify-content: center; padding: 7px 0; }

  .np-nav-divider { border: none; border-top: 1px solid #E2E8F0; margin: 6px 0; }

  .np-nav-item.np-danger:hover { background: #FEF2F2; color: #DC2626; }
  .np-nav-item.np-admin {
    color: #D97706; background: #FFFBEB;
    border: 1px solid #FEF3C7;
  }
  .np-nav-item.np-admin:hover { background: #FEF3C7; }

  .np-sidebar-footer {
    padding: 10px 8px; border-top: 1px solid #E2E8F0; flex-shrink: 0;
  }
  .np-user-row {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 8px; border-radius: 8px;
    background: #F8FAFF; overflow: hidden;
  }
  .np-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: #2563EB;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #FFFFFF;
  }
  .np-user-name {
    font-size: 12px; font-weight: 700; color: #0F172A;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-user-role { font-size: 10px; color: #94A3B8; margin-top: 1px; }
  .collapsed .np-user-info { display: none; }
  .collapsed .np-user-row { justify-content: center; background: transparent; }

  /* ── Main ─────────────────────────────────────────────────────── */
  .np-main {
    flex: 1; margin-left: 216px;
    display: flex; flex-direction: column;
    min-height: 100vh; min-width: 0;
    transition: margin-left 0.22s ease;
  }
  .np-main.collapsed { margin-left: 58px; }

  .np-topbar {
    height: 56px; background: #FFFFFF;
    border-bottom: 1px solid #E2E8F0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 22px; position: sticky; top: 0; z-index: 40; flex-shrink: 0;
  }
  .np-topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .np-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  .np-page-title {
    font-size: 15px; font-weight: 800; color: #0F172A;
    letter-spacing: -0.03em; white-space: nowrap;
  }

  .np-hamburger {
    display: none; background: none; border: none;
    cursor: pointer; color: #64748B; padding: 5px;
    border-radius: 7px; flex-shrink: 0;
  }
  .np-hamburger:hover { background: #F1F5FB; }

  .np-topbar-btn {
    background: #F8FAFF; border: 1px solid #E2E8F0;
    border-radius: 8px; padding: 6px 8px; cursor: pointer;
    color: #64748B; display: flex; align-items: center;
    transition: all 0.12s; position: relative; flex-shrink: 0;
  }
  .np-topbar-btn:hover { color: #0F172A; border-color: #CBD5E1; }

  .np-notif-dot {
    position: absolute; top: 7px; right: 7px;
    width: 7px; height: 7px; background: #DC2626;
    border-radius: 50%; border: 1.5px solid #FFFFFF;
  }

  .np-live-badge {
    display: flex; align-items: center; gap: 5px;
    background: #EFF6FF; border: 1px solid #DBEAFE;
    color: #2563EB; font-size: 11px; font-weight: 700;
    padding: 4px 10px; border-radius: 7px;
    white-space: nowrap;
  }
  .np-live-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #059669;
    flex-shrink: 0; animation: np-blink 2s infinite;
  }
  @keyframes np-blink { 0%,100%{opacity:1} 50%{opacity:0.35} }

  .np-user-chip {
    display: flex; align-items: center; gap: 7px;
    padding: 4px 8px; border-radius: 8px; cursor: pointer;
    flex-shrink: 0;
  }
  .np-user-chip:hover { background: #F8FAFF; }
  .np-chip-name { font-size: 12.5px; font-weight: 700; color: #0F172A; white-space: nowrap; }
  .np-chip-role { font-size: 10.5px; color: #94A3B8; }

  .np-content { flex: 1; padding: 22px 24px; min-width: 0; }

  .np-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(15,23,42,0.35); z-index: 49;
  }
  .np-overlay.visible { display: block; }

  /* ── Responsive ───────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .np-sidebar {
      transform: translateX(-100%);
      width: 216px !important;
    }
    .np-sidebar.mobile-open { transform: translateX(0); }
    .np-main { margin-left: 0 !important; }
    .np-hamburger { display: flex; }
    .np-content { padding: 14px 14px; }
    .np-collapse-btn { display: none; }
    .np-user-chip { display: none; }
  }
  @media (max-width: 480px) {
    .np-topbar { padding: 0 14px; }
    .np-live-badge { display: none; }
  }
`;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { merchant, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5FB' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 13 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = merchant?.name
    ?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'NP';
  const pageTitle = PAGE_TITLES[pathname || ''] || 'Dashboard';
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href);

  return (
    <>
      <style>{STYLES}</style>
      <div className="np-shell">
        <div className={`np-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

        <aside className={`np-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
          <button className="np-collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>

          <div className="np-sidebar-logo">
            <div className="np-logo-mark">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="np-logo-text">NovaPay</span>
          </div>

          <nav className="np-nav">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="np-nav-group">
                <div className="np-nav-group-label">{group.label}</div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`np-nav-item ${isActive(item.href) ? 'active' : ''}`}
                      onClick={e => { e.preventDefault(); router.push(item.href); }}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={14} className="np-nav-icon" />
                      <span className="np-nav-label">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            ))}

            <hr className="np-nav-divider" />

            {merchant?.is_admin && (
              <a
                href="/admin"
                className="np-nav-item np-admin"
                onClick={e => { e.preventDefault(); router.push('/admin'); }}
                title={collapsed ? 'Admin Panel' : undefined}
              >
                <Shield size={14} className="np-nav-icon" />
                <span className="np-nav-label">Admin Panel</span>
              </a>
            )}
            <a
              href="/"
              className="np-nav-item"
              onClick={e => { e.preventDefault(); router.push('/'); }}
              title={collapsed ? 'Back to Home' : undefined}
            >
              <Home size={14} className="np-nav-icon" />
              <span className="np-nav-label">Back to Home</span>
            </a>
            <button
              className="np-nav-item np-danger"
              onClick={logout}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={14} className="np-nav-icon" />
              <span className="np-nav-label">Logout</span>
            </button>
          </nav>

          <div className="np-sidebar-footer">
            <div className="np-user-row">
              <div className="np-avatar">{initials}</div>
              <div className="np-user-info">
                <div className="np-user-name">{merchant?.name || 'Merchant'}</div>
                <div className="np-user-role">{merchant?.is_admin ? 'Master Admin' : 'Merchant'}</div>
              </div>
            </div>
          </div>
        </aside>

        <main className={`np-main ${collapsed ? 'collapsed' : ''}`}>
          <header className="np-topbar">
            <div className="np-topbar-left">
              <button className="np-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <span className="np-page-title">{pageTitle}</span>
            </div>
            <div className="np-topbar-right">
              <div className="np-live-badge">
                <span className="np-live-dot" />
                Live
              </div>
              <button className="np-topbar-btn" aria-label="Notifications">
                <Bell size={15} />
                <span className="np-notif-dot" />
              </button>
              <div className="np-user-chip">
                <div className="np-avatar">{initials}</div>
                <div>
                  <div className="np-chip-name">{merchant?.name || 'Merchant'}</div>
                  <div className="np-chip-role">{merchant?.is_admin ? 'Master Admin' : 'Merchant'}</div>
                </div>
              </div>
            </div>
          </header>
          <div className="np-content">{children}</div>
        </main>
      </div>
    </>
  );
}
