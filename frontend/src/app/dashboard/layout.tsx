'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle, Settings,
  Link2, Plug, Package, PackagePlus, FileCode2, ShieldCheck,
  Home, LogOut, ChevronLeft, ChevronRight, Bell, Menu, X, BarChart2,
} from 'lucide-react';

const NAV = [
  { label: 'Overview',            href: '/dashboard',                   icon: LayoutDashboard },
  { label: 'Stats',               href: '/dashboard/stats',             icon: BarChart2       },
  { label: 'Orders',              href: '/dashboard/transactions',      icon: ArrowLeftRight  },
  { label: 'Payment Link',        href: '/dashboard/payments',          icon: Link2           },
  { label: 'Connect Merchant',    href: '/dashboard/connect-merchant',  icon: Plug            },
  { label: 'Fraud Alerts',        href: '/dashboard/fraud',             icon: AlertTriangle   },
  { label: 'Webhook Config',      href: '/dashboard/webhooks',          icon: Package         },
  { label: 'New Subscription',    href: '/dashboard/subscription',      icon: PackagePlus     },
  { label: 'API Documentation',   href: '/dashboard/api-docs',          icon: FileCode2       },
  { label: 'KYC',                 href: '/dashboard/kyc',               icon: ShieldCheck     },
  { label: 'Settings',            href: '/dashboard/settings',          icon: Settings        },
];

const STYLES = `
  .np-shell { display: flex; min-height: 100vh; background: #07090f; font-family: 'DM Sans', -apple-system, sans-serif; }

  .np-sidebar {
    width: 240px; flex-shrink: 0;
    background: #0b0f1a;
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
    transition: width 0.25s ease, transform 0.25s ease;
  }
  .np-sidebar.collapsed { width: 64px; }
  .np-sidebar.mobile-hidden { transform: translateX(-100%); }

  .np-sidebar-logo {
    height: 62px; display: flex; align-items: center; gap: 10px;
    padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
    overflow: hidden; flex-shrink: 0;
  }
  .np-logo-mark {
    width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
    background: linear-gradient(135deg, #00e5b0, #0ea5e9);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: #07090f;
  }
  .np-logo-text {
    font-size: 17px; font-weight: 800; color: #eef2ff;
    letter-spacing: -0.4px; white-space: nowrap;
    font-family: 'Syne', sans-serif;
    transition: opacity 0.2s;
  }
  .collapsed .np-logo-text { opacity: 0; width: 0; }

  .np-collapse-btn {
    position: absolute; top: 18px; right: -12px;
    width: 24px; height: 24px; border-radius: 50%;
    background: #16202e; border: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #64748b; z-index: 10;
    transition: all 0.2s;
  }
  .np-collapse-btn:hover { color: #00e5b0; border-color: rgba(0,229,176,0.3); }

  .np-nav { flex: 1; padding: 10px 8px; overflow-y: auto; overflow-x: hidden; }
  .np-nav::-webkit-scrollbar { width: 3px; }
  .np-nav::-webkit-scrollbar-thumb { background: #1f2d4a; border-radius: 3px; }

  .np-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 9px; margin-bottom: 1px;
    cursor: pointer; border: none; background: transparent;
    color: rgba(255,255,255,0.38); font-size: 13px; font-weight: 400;
    font-family: inherit; width: 100%; text-align: left;
    text-decoration: none; transition: all 0.15s; white-space: nowrap;
    overflow: hidden;
  }
  .np-nav-item:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); }
  .np-nav-item.active {
    background: rgba(0,229,176,0.1); color: #00e5b0;
    font-weight: 600;
  }
  .np-nav-item.active .np-nav-icon { color: #00e5b0; }
  .np-nav-icon { flex-shrink: 0; width: 16px; height: 16px; }
  .np-nav-label { transition: opacity 0.2s; }
  .collapsed .np-nav-label { opacity: 0; width: 0; }
  .collapsed .np-nav-item { justify-content: center; padding: 9px 0; }

  .np-nav-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 8px 0; }

  .np-nav-item.danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
  .np-nav-item.danger:hover .np-nav-icon { color: #ef4444; }

  .np-sidebar-footer {
    padding: 10px 8px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
  }
  .np-user-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 9px;
    background: rgba(255,255,255,0.03); overflow: hidden;
  }
  .np-avatar {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    background: rgba(0,229,176,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #00e5b0;
  }
  .np-user-name { font-size: 12px; font-weight: 600; color: #eef2ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-user-role { font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 1px; }
  .collapsed .np-user-info { display: none; }
  .collapsed .np-user-row { justify-content: center; }

  .np-main { flex: 1; margin-left: 240px; display: flex; flex-direction: column; min-height: 100vh; transition: margin-left 0.25s ease; }
  .np-main.collapsed { margin-left: 64px; }
  .np-main.mobile { margin-left: 0; }

  .np-topbar {
    height: 62px; background: rgba(11,15,26,0.9); backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; position: sticky; top: 0; z-index: 40;
    flex-shrink: 0;
  }
  .np-topbar-left { display: flex; align-items: center; gap: 12px; }
  .np-topbar-right { display: flex; align-items: center; gap: 10px; }
  .np-page-title { font-size: 17px; font-weight: 800; color: #eef2ff; letter-spacing: -0.3px; font-family: 'Syne', sans-serif; }
  .np-hamburger {
    display: none; background: none; border: none; cursor: pointer;
    color: #64748b; padding: 6px; border-radius: 8px;
  }
  .np-topbar-btn {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px; padding: 7px 9px; cursor: pointer; color: #64748b;
    display: flex; align-items: center; transition: all 0.15s;
  }
  .np-topbar-btn:hover { color: #eef2ff; border-color: rgba(255,255,255,0.15); }
  .np-live-badge {
    display: flex; align-items: center; gap: 6px;
    background: rgba(0,229,176,0.08); border: 1px solid rgba(0,229,176,0.2);
    color: #00e5b0; font-size: 11px; font-weight: 700;
    padding: 5px 11px; border-radius: 8px; letter-spacing: 0.04em;
  }
  .np-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e5b0; animation: blink 2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .np-content { flex: 1; padding: 24px; }

  .np-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); z-index: 49;
    backdrop-filter: blur(4px);
  }
  .np-overlay.visible { display: block; }

  @media (max-width: 768px) {
    .np-sidebar { transform: translateX(-100%); }
    .np-sidebar.mobile-open { transform: translateX(0); }
    .np-main { margin-left: 0 !important; }
    .np-hamburger { display: flex; }
    .np-content { padding: 16px; }
    .np-collapse-btn { display: none; }
  }
`;

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':                    'Overview',
  '/dashboard/stats':              'Stats',
  '/dashboard/transactions':       'Orders',
  '/dashboard/payments':           'Payment Link',
  '/dashboard/connect-merchant':   'Connect Merchant',
  '/dashboard/fraud':              'Fraud Alerts',
  '/dashboard/webhooks':           'Webhook Config',
  '/dashboard/subscription':       'New Subscription',
  '/dashboard/api-docs':           'API Documentation',
  '/dashboard/kyc':                'KYC Verification',
  '/dashboard/settings':           'Settings',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { merchant, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090f' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#00e5b0,#0ea5e9)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#07090f', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>N</div>
          <p style={{ color: '#4b5563', fontSize: 13 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = merchant?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'NP';
  const pageTitle = PAGE_TITLES[pathname || ''] || 'Dashboard';

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="np-shell">
        <div className={`np-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

        <aside className={`np-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
          <button className="np-collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
          <div className="np-sidebar-logo">
            <div className="np-logo-mark">N</div>
            <span className="np-logo-text">NovaPay</span>
          </div>
          <nav className="np-nav">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <a key={item.href + item.label} href={item.href}
                  className={`np-nav-item ${active ? 'active' : ''}`}
                  onClick={e => { e.preventDefault(); router.push(item.href); }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={16} className="np-nav-icon" />
                  <span className="np-nav-label">{item.label}</span>
                </a>
              );
            })}
            <hr className="np-nav-divider" />
            <a href="/" className="np-nav-item" onClick={e => { e.preventDefault(); router.push('/'); }} title={collapsed ? 'Back to Home' : undefined}>
              <Home size={16} className="np-nav-icon" />
              <span className="np-nav-label">Back to Home</span>
            </a>
            <button className="np-nav-item danger" onClick={logout} title={collapsed ? 'Logout' : undefined}>
              <LogOut size={16} className="np-nav-icon" />
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
              <button className="np-hamburger" onClick={() => setMobileOpen(o => !o)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <span className="np-page-title">{pageTitle}</span>
            </div>
            <div className="np-topbar-right">
              <div className="np-live-badge"><span className="np-live-dot" /> Live</div>
              <button className="np-topbar-btn"><Bell size={16} /></button>
            </div>
          </header>
          <div className="np-content">{children}</div>
        </main>
      </div>
    </>
  );
}