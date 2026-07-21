'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, ArrowLeftRight, Link2, Plug,
  FileCode2, Shield, Home, LogOut, Bell, Menu, X,
  BarChart2, Palette, CreditCard, Users,
  ShieldCheck, AlertTriangle, PackagePlus, ChevronDown,
  ChevronLeft, ChevronRight, Settings, Send,
} from 'lucide-react';

// ── Navigation structure ─────────────────────────────────────────
// Top-level items render directly; groups render as collapsible dropdowns
const NAV_TOP = [
  { label: 'Overview',      href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Transactions',  href: '/dashboard/transactions', icon: ArrowLeftRight  },
  { label: 'Payment Links', href: '/dashboard/payments',    icon: Link2           },
];

const NAV_GROUPS = [
  {
    label: 'Analytics',
    icon: BarChart2,
    items: [
      { label: 'Stats', href: '/dashboard/stats', icon: BarChart2 },
    ],
  },
  {
    label: 'Merchants',
    icon: Users,
    items: [
      { label: 'Connect Merchant', href: '/dashboard/connect-merchant', icon: Plug        },
      { label: 'Referrals',        href: '/dashboard/referral',         icon: Users       },
      { label: 'KYC Verification', href: '/dashboard/kyc',              icon: ShieldCheck },
    ],
  },
  {
    label: 'Billing',
    icon: CreditCard,
    items: [
      { label: 'My Plan',    href: '/dashboard/active-subscription', icon: CreditCard  },
      { label: 'All Plans',  href: '/dashboard/subscription',        icon: PackagePlus },
    ],
  },
  {
    label: 'Developer',
    icon: FileCode2,
    items: [
      { label: 'API & Webhooks', href: '/dashboard/api-docs',  icon: FileCode2 },
      { label: 'Branding',       href: '/dashboard/branding',  icon: Palette   },
    ],
  },
  {
    label: 'Security',
    icon: AlertTriangle,
    items: [
      { label: 'Fraud Alerts', href: '/dashboard/fraud', icon: AlertTriangle },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      { label: 'Telegram Alerts', href: '/dashboard/telegram', icon: Send },
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
  '/dashboard/subscription':        'All Plans',
  '/dashboard/api-docs':            'API & Webhooks',
  '/dashboard/kyc':                 'KYC Verification',
  '/dashboard/branding':            'Branding',
  '/dashboard/telegram':            'Telegram Alerts',
};

const STYLES = `
  .np-shell {
    display: flex; min-height: 100vh;
    background: #F1F5FB;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  }

  /* ── Sidebar ── */
  .np-sidebar {
    width: 240px; flex-shrink: 0;
    background: #FFFFFF;
    border-right: 1px solid #E8ECF2;
    display: flex; flex-direction: column;
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
    transition: width 0.22s ease, transform 0.22s ease;
    overflow: hidden;
  }
  .np-sidebar.collapsed { width: 60px; }

  /* Logo */
  .np-sidebar-logo {
    height: 60px; display: flex; align-items: center; gap: 10px;
    padding: 0 16px; border-bottom: 1px solid #E8ECF2;
    overflow: hidden; flex-shrink: 0;
  }
  .np-logo-mark {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
  }
  .np-logo-text {
    font-size: 15px; font-weight: 800; color: #0F172A;
    letter-spacing: -0.04em; white-space: nowrap;
    transition: opacity 0.18s, width 0.18s;
  }
  .np-logo-text span { color: #2563EB; }
  .collapsed .np-logo-text { opacity: 0; width: 0; overflow: hidden; }

  .np-collapse-btn {
    position: absolute; top: 19px; right: -11px;
    width: 22px; height: 22px; border-radius: 50%;
    background: #FFFFFF; border: 1.5px solid #E2E8F0;
    box-shadow: 0 1px 6px rgba(0,0,0,.10);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #94A3B8; z-index: 60;
    transition: color 0.12s, border-color 0.12s, box-shadow 0.12s;
  }
  .np-collapse-btn:hover { color: #2563EB; border-color: #BFDBFE; box-shadow: 0 2px 8px rgba(37,99,235,.2); }

  /* Nav scroll area */
  .np-nav {
    flex: 1; padding: 10px 10px 6px;
    overflow-y: auto; overflow-x: hidden;
  }
  .np-nav::-webkit-scrollbar { width: 3px; }
  .np-nav::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px; }

  /* Divider between top items and groups */
  .np-nav-divider { border: none; border-top: 1px solid #E8ECF2; margin: 8px 0; }

  /* Top-level flat items */
  .np-nav-item {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 10px; border-radius: 8px; margin-bottom: 1px;
    cursor: pointer; border: none; background: transparent;
    color: #64748B; font-size: 13px; font-weight: 500;
    font-family: inherit; width: 100%; text-align: left;
    text-decoration: none; position: relative;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap; overflow: hidden;
  }
  .np-nav-item:hover { background: #F1F5FB; color: #0F172A; }
  .np-nav-item.active {
    background: #EFF6FF; color: #2563EB; font-weight: 600;
  }
  .np-nav-item.active::before {
    content: ''; position: absolute; left: 0; top: 6px; bottom: 6px;
    width: 3px; border-radius: 0 2px 2px 0; background: #2563EB;
  }
  .np-nav-icon { flex-shrink: 0; }
  .np-nav-label { flex: 1; transition: opacity 0.18s; overflow: hidden; text-overflow: ellipsis; }
  .collapsed .np-nav-label { opacity: 0; width: 0; }
  .collapsed .np-nav-item { justify-content: center; padding: 8px 0; }
  .collapsed .np-nav-item::before { display: none; }

  /* ── Dropdown groups ── */
  .np-group { margin-bottom: 2px; }

  .np-group-header {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 10px; border-radius: 8px;
    cursor: pointer; border: none; background: transparent;
    color: #64748B; font-size: 13px; font-weight: 500;
    font-family: inherit; width: 100%; text-align: left;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap; overflow: hidden;
  }
  .np-group-header:hover { background: #F1F5FB; color: #0F172A; }
  .np-group-header.has-active { color: #0F172A; font-weight: 600; }
  .np-group-chevron {
    margin-left: auto; flex-shrink: 0;
    transition: transform 0.2s ease, opacity 0.18s;
    color: #94A3B8;
  }
  .np-group-header.open .np-group-chevron { transform: rotate(180deg); }
  .collapsed .np-group-chevron { opacity: 0; width: 0; }
  .collapsed .np-group-header { justify-content: center; padding: 8px 0; }

  .np-group-items {
    overflow: hidden;
    transition: max-height 0.22s ease, opacity 0.18s;
    max-height: 0; opacity: 0;
  }
  .np-group-items.open { max-height: 300px; opacity: 1; }
  .collapsed .np-group-items { display: none; }

  .np-sub-item {
    display: flex; align-items: center; gap: 9px;
    padding: 6px 10px 6px 34px; border-radius: 8px; margin-bottom: 1px;
    cursor: pointer; border: none; background: transparent;
    color: #64748B; font-size: 12.5px; font-weight: 400;
    font-family: inherit; width: 100%; text-align: left;
    text-decoration: none; position: relative;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap; overflow: hidden;
  }
  .np-sub-item:hover { background: #F1F5FB; color: #0F172A; }
  .np-sub-item.active {
    background: #EFF6FF; color: #2563EB; font-weight: 600;
  }
  .np-sub-item.active::before {
    content: ''; position: absolute; left: 22px; top: 50%;
    transform: translateY(-50%);
    width: 4px; height: 4px; border-radius: 50%; background: #2563EB;
  }

  /* Bottom actions */
  .np-bottom-section { padding: 0 10px 6px; }
  .np-nav-item.np-danger:hover { background: #FFF1F2; color: #DC2626; }
  .np-nav-item.np-admin {
    color: #D97706; background: #FFFBEB;
    border: 1px solid #FEF3C7; margin-bottom: 4px;
  }
  .np-nav-item.np-admin:hover { background: #FEF9C3; }

  /* Footer user card */
  .np-sidebar-footer {
    padding: 10px 10px; border-top: 1px solid #E8ECF2; flex-shrink: 0;
  }
  .np-user-row {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: 10px;
    background: #F8FAFF; border: 1px solid #EEF2FF;
    overflow: hidden; cursor: pointer;
    transition: background 0.12s;
  }
  .np-user-row:hover { background: #EFF6FF; }
  .np-avatar {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg,#1D4ED8,#2563EB);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #FFFFFF;
    letter-spacing: 0.02em;
  }
  .np-user-name {
    font-size: 12.5px; font-weight: 700; color: #0F172A;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .np-user-role {
    font-size: 10.5px; color: #94A3B8; margin-top: 1px;
    white-space: nowrap;
  }
  .collapsed .np-user-info { display: none; }
  .collapsed .np-user-row { justify-content: center; background: transparent; border-color: transparent; }

  /* ── Main content ── */
  .np-main {
    flex: 1; margin-left: 240px;
    display: flex; flex-direction: column;
    min-height: 100vh; min-width: 0;
    transition: margin-left 0.22s ease;
  }
  .np-main.collapsed { margin-left: 60px; }

  .np-topbar {
    height: 60px; background: #FFFFFF;
    border-bottom: 1px solid #E8ECF2;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; position: sticky; top: 0; z-index: 40; flex-shrink: 0;
  }
  .np-topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .np-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  .np-page-title {
    font-size: 15px; font-weight: 700; color: #0F172A;
    letter-spacing: -0.02em; white-space: nowrap;
  }

  .np-hamburger {
    display: none; background: none; border: none;
    cursor: pointer; color: #64748B; padding: 5px;
    border-radius: 7px; flex-shrink: 0;
  }
  .np-hamburger:hover { background: #F1F5FB; }

  .np-topbar-btn {
    background: transparent; border: 1px solid #E2E8F0;
    border-radius: 8px; padding: 7px 9px; cursor: pointer;
    color: #64748B; display: flex; align-items: center;
    transition: all 0.12s; position: relative; flex-shrink: 0;
  }
  .np-topbar-btn:hover { color: #0F172A; border-color: #CBD5E1; background: #F8FAFC; }

  .np-user-chip {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 12px 5px 6px; border-radius: 8px; cursor: pointer;
    border: 1px solid #E2E8F0; background: transparent;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .np-user-chip:hover { background: #F8FAFC; }
  .np-chip-name { font-size: 12.5px; font-weight: 600; color: #0F172A; white-space: nowrap; }
  .np-chip-role { font-size: 10.5px; color: #94A3B8; }

  .np-content { flex: 1; padding: 24px 26px; min-width: 0; overflow-x: hidden; }

  .np-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(15,23,42,0.4); z-index: 49;
    backdrop-filter: blur(2px);
  }
  .np-overlay.visible { display: block; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .np-sidebar { transform: translateX(-100%); width: 240px !important; }
    .np-sidebar.mobile-open { transform: translateX(0); }
    .np-main { margin-left: 0 !important; }
    .np-hamburger { display: flex; }
    .np-content { padding: 14px 16px; }
    .np-collapse-btn { display: none; }
    .np-user-chip { display: none; }
  }
  @media (max-width: 480px) {
    .np-topbar { padding: 0 14px; }
  }
`;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { merchant, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href);

  // Which group contains the active route
  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => isActive(i.href)))?.label ?? null;

  // Open groups state — default open the group that has the active page
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      init[g.label] = g.items.some(i => i.href === pathname || pathname?.startsWith(i.href));
    });
    return init;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Auto-open group when navigating to a child page
  useEffect(() => {
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup]: true }));
    }
  }, [activeGroup]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5FB' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p style={{ color: '#94A3B8', fontSize: 13 }}>Loading...</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return null;

  const initials = merchant?.name
    ?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'NP';
  const pageTitle = PAGE_TITLES[pathname || ''] || 'Dashboard';

  return (
    <>
      <style>{STYLES}</style>
      <div className="np-shell">
        <div className={`np-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

        <aside className={`np-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
          <button className="np-collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>

          {/* Logo */}
          <div className="np-sidebar-logo">
            <div className="np-logo-mark">
              <img src="/np-logo.jpg" alt="NovaPay" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            </div>
            <span className="np-logo-text">Nova<span>Pay</span></span>
          </div>

          <nav className="np-nav">
            {/* Top-level flat items */}
            {NAV_TOP.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`np-nav-item ${active ? 'active' : ''}`}
                  onClick={e => { e.preventDefault(); router.push(item.href); }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={15} className="np-nav-icon" />
                  <span className="np-nav-label">{item.label}</span>
                </a>
              );
            })}

            <hr className="np-nav-divider" />

            {/* Collapsible groups */}
            {NAV_GROUPS.map(group => {
              const GroupIcon = group.icon;
              const isOpen = !collapsed && !!openGroups[group.label];
              const hasActive = group.items.some(i => isActive(i.href));

              return (
                <div key={group.label} className="np-group">
                  <button
                    className={`np-group-header ${isOpen ? 'open' : ''} ${hasActive ? 'has-active' : ''}`}
                    onClick={() => !collapsed && toggleGroup(group.label)}
                    title={collapsed ? group.label : undefined}
                  >
                    <GroupIcon size={15} className="np-nav-icon" style={{ opacity: hasActive ? 1 : 0.6 }} />
                    <span className="np-nav-label">{group.label}</span>
                    <ChevronDown size={13} className="np-group-chevron" />
                  </button>

                  <div className={`np-group-items ${isOpen ? 'open' : ''}`}>
                    {group.items.map(item => {
                      const SubIcon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          className={`np-sub-item ${active ? 'active' : ''}`}
                          onClick={e => { e.preventDefault(); router.push(item.href); }}
                        >
                          <SubIcon size={13} style={{ flexShrink: 0, opacity: active ? 1 : 0.55 }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="np-bottom-section">
            <hr className="np-nav-divider" />
            {merchant?.is_admin && (
              <a
                href="/admin"
                className="np-nav-item np-admin"
                onClick={e => { e.preventDefault(); router.push('/admin'); }}
                title={collapsed ? 'Admin Panel' : undefined}
              >
                <Shield size={15} className="np-nav-icon" />
                <span className="np-nav-label">Admin Panel</span>
              </a>
            )}
            <a
              href="/"
              className="np-nav-item"
              onClick={e => { e.preventDefault(); router.push('/'); }}
              title={collapsed ? 'Back to Home' : undefined}
            >
              <Home size={15} className="np-nav-icon" style={{ opacity: 0.6 }} />
              <span className="np-nav-label">Back to Home</span>
            </a>
            <button
              className="np-nav-item np-danger"
              onClick={logout}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={15} className="np-nav-icon" style={{ opacity: 0.6 }} />
              <span className="np-nav-label">Logout</span>
            </button>
          </div>

          {/* User footer */}
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
              <button className="np-topbar-btn" aria-label="Notifications">
                <Bell size={15} />
              </button>
              <div className="np-user-chip">
                <div className="np-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials}</div>
                <div>
                  <div className="np-chip-name">{merchant?.name || 'Merchant'}</div>
                  <div className="np-chip-role">{merchant?.is_admin ? 'Admin' : 'Merchant'}</div>
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
