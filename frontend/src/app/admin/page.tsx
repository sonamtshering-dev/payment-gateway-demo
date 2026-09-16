'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Users, CreditCard, ShieldAlert, Webhook,
  BadgeCheck, Package, LogOut, RefreshCw, Search,
  Plus, Pencil, Trash2, X, Check, ChevronRight,
  TrendingUp, TrendingDown, AlertTriangle, Activity,
  RotateCcw, Lock, Key, Bell, Settings, FileText,
  ArrowUpRight, Menu, Zap, Star, Clock, BarChart3
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ─── Helpers ────────────────────────────────────────────────────────────────
const rupees = (p: number) => {
  const r = p / 100;
  if (r >= 10000000) return `₹${(r/10000000).toFixed(2)}Cr`;
  if (r >= 100000)   return `₹${(r/100000).toFixed(2)}L`;
  if (r >= 1000)     return `₹${(r/1000).toFixed(1)}K`;
  return `₹${r.toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
};
const dateStr  = (s: string | null | undefined) => { if(!s) return '—'; try { return new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '—'; } };
const timeStr  = (s: string | null | undefined) => { if(!s) return ''; try { return new Date(s).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };
const toArr    = (v: any): any[] => Array.isArray(v) ? v : [];
const pct      = (n: number) => `${(n||0).toFixed(1)}%`;
const num      = (n: number) => (n||0).toLocaleString('en-IN');

type Section = 'dashboard'|'merchants'|'payments'|'kyc'|'fraud'|'webhooks'|'subscriptions'|'plans'|'audit'|'tickets';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:       '#070D1B',
  sidebar:  '#0A1228',
  surface:  '#0F1C35',
  card:     '#0F1C35',
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.12)',
  text:     '#E2E8F0',
  text2:    '#94A3B8',
  text3:    '#475569',
  blue:     '#3B82F6',
  green:    '#10B981',
  red:      '#EF4444',
  amber:    '#F59E0B',
  purple:   '#8B5CF6',
  shadow:   '0 4px 24px rgba(0,0,0,0.4)',
};

const STATUS_COLORS: Record<string, [string,string]> = {
  paid:      ['#10B981','rgba(16,185,129,0.12)'],
  pending:   ['#F59E0B','rgba(245,158,11,0.12)'],
  failed:    ['#EF4444','rgba(239,68,68,0.12)'],
  expired:   ['#64748B','rgba(100,116,139,0.12)'],
  active:    ['#10B981','rgba(16,185,129,0.12)'],
  inactive:  ['#EF4444','rgba(239,68,68,0.12)'],
  cancelled: ['#64748B','rgba(100,116,139,0.12)'],
  approved:  ['#10B981','rgba(16,185,129,0.12)'],
  rejected:  ['#EF4444','rgba(239,68,68,0.12)'],
  resolved:  ['#10B981','rgba(16,185,129,0.12)'],
  unresolved:['#EF4444','rgba(239,68,68,0.12)'],
  low:       ['#10B981','rgba(16,185,129,0.12)'],
  medium:    ['#F59E0B','rgba(245,158,11,0.12)'],
  high:      ['#EF4444','rgba(239,68,68,0.12)'],
  critical:  ['#7C3AED','rgba(124,58,237,0.12)'],
  true:      ['#10B981','rgba(16,185,129,0.12)'],
  false:     ['#EF4444','rgba(239,68,68,0.12)'],
};

function Badge({ val, label }: { val: string; label?: string }) {
  const [color, bg] = STATUS_COLORS[(val||'').toLowerCase()] || ['#94A3B8','rgba(148,163,184,0.12)'];
  return (
    <span style={{background:bg,color,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,letterSpacing:'.05em',whiteSpace:'nowrap'}}>
      {(label||val||'—').toUpperCase()}
    </span>
  );
}

function Spinner() {
  return <div style={{width:20,height:20,border:'2px solid rgba(255,255,255,0.1)',borderTopColor:C.blue,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}} />;
}

function Toast({ msg, kind, onClose }: { msg: string; kind: 'ok'|'err'; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:kind==='ok'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',border:`1px solid ${kind==='ok'?C.green:C.red}`,borderRadius:10,padding:'12px 18px',color:kind==='ok'?C.green:C.red,fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8,maxWidth:360,boxShadow:C.shadow}}>
      {kind==='ok'?<Check size={15}/>:<X size={15}/>} {msg}
    </div>
  );
}

function Modal({ title, onClose, children, width=520 }: { title: string; onClose: ()=>void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.surface,border:`1px solid ${C.border2}`,borderRadius:16,padding:28,width,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:C.shadow}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:4}}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.border2}`,
  borderRadius: 8,
  padding: '9px 13px',
  color: C.text,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

function Btn({ onClick, disabled, loading, children, variant='primary', small }: any) {
  const colors: Record<string,React.CSSProperties> = {
    primary: {background:C.blue,color:'#fff',border:`1px solid ${C.blue}`},
    danger:  {background:'rgba(239,68,68,0.1)',color:C.red,border:'1px solid rgba(239,68,68,0.25)'},
    ghost:   {background:'rgba(255,255,255,0.04)',color:C.text2,border:`1px solid ${C.border}`},
    success: {background:'rgba(16,185,129,0.1)',color:C.green,border:'1px solid rgba(16,185,129,0.25)'},
  };
  return (
    <button onClick={onClick} disabled={disabled||loading}
      style={{...colors[variant],borderRadius:8,padding:small?'5px 12px':'8px 16px',fontSize:small?11:13,fontWeight:700,cursor:(disabled||loading)?'default':'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6,whiteSpace:'nowrap',opacity:(disabled||loading)?.5:1}}>
      {loading&&<Spinner/>}{children}
    </button>
  );
}

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{padding:'10px 14px',textAlign:right?'right':'left',fontSize:10.5,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',whiteSpace:'nowrap',borderBottom:`1px solid ${C.border}`,background:C.bg}}>
      {children}
    </th>
  );
}
function TD({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td style={{padding:'11px 14px',textAlign:right?'right':'left',fontSize:12.5,color:C.text2,fontFamily:mono?'monospace':'inherit',verticalAlign:'middle'}}>
      {children}
    </td>
  );
}

function Pagination({ page, total, limit, onChange }: { page:number; total:number; limit:number; onChange:(p:number)=>void }) {
  const pages = Math.ceil(total/limit);
  if (pages <= 1) return null;
  const pgBtn = (disabled: boolean, active = false): React.CSSProperties => ({
    background: active?C.blue:'transparent',
    border: `1px solid ${active?C.blue:C.border}`,
    borderRadius: 6, padding: '4px 10px',
    color: active?'#fff':disabled?C.text3:C.text2,
    fontSize: 12, fontWeight: 600,
    cursor: disabled?'default':'pointer',
    opacity: disabled?.4:1, fontFamily: 'inherit',
  });
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderTop:`1px solid ${C.border}`,fontSize:12,color:C.text3}}>
      <span>Showing {Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {num(total)}</span>
      <div style={{display:'flex',gap:4}}>
        <button disabled={page===1} onClick={()=>onChange(page-1)} style={pgBtn(page===1)}>‹</button>
        {[...Array(Math.min(5,pages))].map((_,i)=>{
          const pg = Math.max(1,Math.min(page-2,pages-4))+i;
          return <button key={pg} onClick={()=>onChange(pg)} style={pgBtn(false,pg===page)}>{pg}</button>;
        })}
        <button disabled={page===pages} onClick={()=>onChange(page+1)} style={pgBtn(page===pages)}>›</button>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, onRefresh, children }: { title:string; sub?:string; onRefresh:()=>void; children?: React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
      <div>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:'-.03em'}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{sub}</div>}
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        {children}
        <Btn onClick={onRefresh} variant='ghost' small><RefreshCw size={12}/>Refresh</Btn>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: { label:string; value:string; sub?:string; color:string; icon:React.ReactNode }) {
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 20px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.08em'}}>{label}</div>
        <div style={{width:34,height:34,borderRadius:9,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',color,flexShrink:0}}>{icon}</div>
      </div>
      <div style={{fontSize:24,fontWeight:900,color:C.text,letterSpacing:'-.03em',lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:C.text3}}>{sub}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { merchant, isLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{msg:string;kind:'ok'|'err'}|null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const H: HeadersInit = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const flash = (msg: string, kind: 'ok'|'err' = 'ok') => setToast({ msg, kind });
  const api = async (url: string, opts?: RequestInit) => {
    const r = await fetch(url, { headers: H, ...opts });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  };

  useEffect(() => {
    if (!isLoading && (!merchant || !merchant.is_admin)) router.replace('/dashboard');
  }, [merchant, isLoading, router]);

  if (isLoading) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>
  );

  const navGroups = [
    { label: 'Operations', items: [
      { id:'dashboard'    as Section, label:'Dashboard',     icon:<LayoutDashboard size={16}/> },
      { id:'merchants'    as Section, label:'Merchants',     icon:<Users size={16}/> },
      { id:'payments'     as Section, label:'Payments',      icon:<CreditCard size={16}/> },
    ]},
    { label: 'Compliance', items: [
      { id:'kyc'          as Section, label:'KYC',           icon:<BadgeCheck size={16}/> },
      { id:'fraud'        as Section, label:'Fraud Alerts',  icon:<ShieldAlert size={16}/> },
    ]},
    { label: 'Infrastructure', items: [
      { id:'webhooks'     as Section, label:'Webhooks',          icon:<Webhook size={16}/> },
      { id:'subscriptions'as Section, label:'Subscriptions',     icon:<Star size={16}/> },
      { id:'plans'        as Section, label:'Plans',             icon:<Package size={16}/> },
      { id:'audit'        as Section, label:'Audit Logs',        icon:<FileText size={16}/> },
      { id:'tickets'      as Section, label:'Support Tickets',   icon:<Bell size={16}/> },
    ]},
  ];

  return (
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:"'Inter',system-ui,sans-serif",display:'flex'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        table{border-collapse:collapse;width:100%}
        tr:hover td{background:rgba(255,255,255,0.02)!important}
        input,select,textarea{color-scheme:dark}
        select option{background:#0F1C35}
      `}</style>

      {sidebarOpen && (
        <aside style={{width:220,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',flexShrink:0,zIndex:50}}>
          <div style={{padding:'20px 16px 16px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:'#fff',flexShrink:0}}>N</div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>NovaPay</div>
                <div style={{fontSize:9,fontWeight:700,color:C.red,textTransform:'uppercase',letterSpacing:'.1em'}}>Admin Console</div>
              </div>
            </div>
          </div>
          <nav style={{flex:1,overflowY:'auto',padding:'12px 8px'}}>
            {navGroups.map(g => (
              <div key={g.label} style={{marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.12em',padding:'4px 8px',marginBottom:4}}>{g.label}</div>
                {g.items.map(item => (
                  <button key={item.id} onClick={()=>setSection(item.id)}
                    style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:section===item.id?700:500,color:section===item.id?'#fff':C.text2,background:section===item.id?'rgba(59,130,246,0.15)':'transparent',marginBottom:2,textAlign:'left'}}>
                    <span style={{color:section===item.id?C.blue:C.text3}}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{padding:'12px 8px',borderTop:`1px solid ${C.border}`}}>
            <button onClick={()=>{localStorage.removeItem('upay_access_token');localStorage.removeItem('upay_refresh_token');window.location.replace('/auth/login');}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,color:C.text3,background:'transparent'}}>
              <LogOut size={14}/> Sign Out
            </button>
          </div>
        </aside>
      )}

      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <header style={{height:56,background:C.sidebar,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 20px',gap:12,flexShrink:0,position:'sticky',top:0,zIndex:40}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:4}}><Menu size={18}/></button>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,color:C.text3}}>Admin</span>
            <ChevronRight size={12} color={C.text3}/>
            <span style={{fontSize:13,fontWeight:700,color:C.text,textTransform:'capitalize'}}>{section.replace('-',' ')}</span>
          </div>
          <div style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',color:C.green,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:C.green,display:'inline-block'}}/>Live
          </div>
        </header>

        <main style={{flex:1,overflowY:'auto',padding:24}}>
          {section==='dashboard'     && <DashboardSection   api={api} flash={flash}/>}
          {section==='merchants'     && <MerchantsSection   api={api} flash={flash}/>}
          {section==='payments'      && <PaymentsSection    api={api} flash={flash}/>}
          {section==='kyc'           && <KYCSection         api={api} flash={flash}/>}
          {section==='fraud'         && <FraudSection       api={api} flash={flash}/>}
          {section==='webhooks'      && <WebhooksSection    api={api} flash={flash}/>}
          {section==='subscriptions' && <SubsSection        api={api} flash={flash}/>}
          {section==='plans'         && <PlansSection       api={api} flash={flash}/>}
          {section==='audit'         && <AuditSection       api={api} flash={flash}/>}
          {section==='tickets'       && <TicketsSection     api={api} flash={flash}/>}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════
function DashboardSection({ api, flash }: any) {
  const [stats, setStats] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [top,   setTop]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, t] = await Promise.all([
        api('/api/v1/admin/stats'),
        api('/api/v1/admin/revenue-chart?days=30'),
        api('/api/v1/admin/top-merchants?limit=5'),
      ]);
      if (s?.success) setStats(s.data);
      if (c?.success) setChart(toArr(c.data));
      if (t?.success) setTop(toArr(t.data));
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, []); // api/flash are never reassigned, no exhaustive-deps needed

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{textAlign:'center',padding:60}}><Spinner/></div>;

  const totalRev = chart.reduce((a:number,d:any)=>a+(d.revenue||0),0);
  const maxRev = Math.max(...chart.map((d:any)=>d.revenue||0),1);

  return (
    <div style={{maxWidth:1200}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:'-.03em'}}>Executive Dashboard</div>
          <div style={{fontSize:13,color:C.text3,marginTop:3}}>Real-time gateway overview</div>
        </div>
        <Btn onClick={load} variant='ghost' small><RefreshCw size={13}/>Refresh</Btn>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14,marginBottom:24}}>
        <StatCard label="Total Volume"    value={rupees(stats?.total_volume||0)}        color={C.blue}   icon={<TrendingUp size={16}/>}/>
        <StatCard label="Month Volume"    value={rupees(stats?.month_volume||0)}         color={C.purple} icon={<BarChart3 size={16}/>}/>
        <StatCard label="Today Volume"    value={rupees(stats?.today_volume||0)}         color={C.green}  icon={<Zap size={16}/>}/>
        <StatCard label="Success Rate"    value={pct(stats?.overall_success_rate||0)}   color={C.green}  icon={<Activity size={16}/>}/>
        <StatCard label="Total Merchants" value={num(stats?.total_merchants||0)}          color={C.blue}   icon={<Users size={16}/>}
          sub={`${num(stats?.active_merchants||0)} active`}/>
        <StatCard label="Total Payments"  value={num(stats?.total_payments||0)}           color={C.purple} icon={<CreditCard size={16}/>}
          sub={`${num(stats?.today_payments||0)} today`}/>
        <StatCard label="Failed"          value={num(stats?.failed_payments||0)}          color={C.red}    icon={<AlertTriangle size={16}/>}/>
        <StatCard label="Pending KYC"     value={num(stats?.pending_kyc||0)}              color={C.amber}  icon={<BadgeCheck size={16}/>}/>
        <StatCard label="Active Subs"     value={num(stats?.active_subscriptions||0)}     color={C.green}  icon={<Star size={16}/>}/>
        <StatCard label="Pending Alerts"  value={num(stats?.pending_alerts||0)}           color={C.amber}  icon={<Bell size={16}/>}/>
        <StatCard label="Failed Webhooks" value={num(stats?.failed_webhooks||0)}          color={C.red}    icon={<Webhook size={16}/>} sub="24h"/>
        <StatCard label="New Merchants"   value={num(stats?.new_merchants_week||0)}       color={C.blue}   icon={<ArrowUpRight size={16}/>} sub="this week"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div>
              <div style={{fontSize:14,fontWeight:800}}>Revenue – Last 30 Days</div>
              <div style={{fontSize:11,color:C.text3,marginTop:2}}>Daily paid amount</div>
            </div>
            <div style={{fontSize:18,fontWeight:900,color:C.blue}}>{rupees(totalRev)}</div>
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:2,height:100}}>
            {chart.map((d:any,i:number)=>{
              const h = Math.max(2,((d.revenue||0)/maxRev)*100);
              return (
                <div key={d.date||i} title={`${d.date}: ${rupees(d.revenue||0)} (${d.count||0} txns)`}
                  style={{flex:1,height:h,background:i>=chart.length-7?C.blue:'rgba(59,130,246,0.3)',borderRadius:'2px 2px 0 0',cursor:'default',transition:'opacity .15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.opacity='.7')}
                  onMouseLeave={e=>(e.currentTarget.style.opacity='1')}
                />
              );
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:C.text3}}>
            <span>{chart[0]?.date?.slice(5)||''}</span>
            <span>{chart[chart.length-1]?.date?.slice(5)||''}</span>
          </div>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:14}}>Top Merchants</div>
          {toArr(top).slice(0,5).map((m:any,i:number)=>(
            <div key={m.merchant_id||i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:24,height:24,borderRadius:6,background:`rgba(59,130,246,${0.3-i*0.04})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:C.blue,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                <div style={{fontSize:10,color:C.text3}}>{num(m.total_payments)} txns · {pct(m.success_rate)}</div>
              </div>
              <div style={{fontSize:12,fontWeight:800,color:C.blue,flexShrink:0}}>{rupees(m.total_volume)}</div>
            </div>
          ))}
          {top.length===0&&<div style={{color:C.text3,fontSize:12}}>No data yet</div>}
        </div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:16}}>Payment Status Breakdown</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {label:'Successful',value:stats?.successful_payments||0,color:C.green},
            {label:'Pending',   value:stats?.pending_payments||0,   color:C.amber},
            {label:'Failed',    value:stats?.failed_payments||0,    color:C.red},
            {label:'Total',     value:stats?.total_payments||0,     color:C.blue},
          ].map(s=>{
            const pctVal = stats?.total_payments ? ((s.value/stats.total_payments)*100).toFixed(1) : '0';
            return (
              <div key={s.label} style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'14px 16px',border:`1px solid rgba(255,255,255,0.05)`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8}}>{s.label}</div>
                <div style={{fontSize:22,fontWeight:900,color:s.color}}>{num(s.value)}</div>
                <div style={{height:3,borderRadius:2,background:C.border,marginTop:8}}>
                  <div style={{height:3,borderRadius:2,background:s.color,width:`${Math.min(100,Number(pctVal))}%`}}/>
                </div>
                <div style={{fontSize:10,color:C.text3,marginTop:4}}>{pctVal}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MERCHANTS
// ════════════════════════════════════════════════════════════════
function MerchantsSection({ api, flash }: any) {
  const [merchants, setMerchants]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [detail, setDetail]         = useState<any>(null);
  const [detailLoading, setDL]      = useState(false);
  const [resetModal, setResetModal] = useState<any>(null);
  const [newPwd, setNewPwd]         = useState('');
  const [limitModal, setLimitModal] = useState<any>(null);
  const [newLimit, setNewLimit]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/v1/admin/merchants?page=${page}&limit=20`);
      if (d?.success) {
        const data = toArr(d.data?.data ?? d.data);
        setMerchants(data);
        setTotal(d.data?.total||data.length);
      }
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, [page]); // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggle = async (id:string, active:boolean) => {
    try {
      await api(`/api/v1/admin/merchants/${id}/toggle`,{method:'PUT',body:JSON.stringify({active:!active})});
      setMerchants(ms=>ms.map((m:any)=>m.id===id?{...m,is_active:!active}:m));
      flash(`Merchant ${!active?'activated':'suspended'}`);
    } catch(e:any) { flash(e.message,'err'); }
  };

  const openDetail = async (id:string) => {
    setDL(true); setDetail({id});
    try {
      const d = await api(`/api/v1/admin/merchants/${id}`);
      if (d?.success) setDetail(d.data);
    } catch(e:any) { flash(e.message,'err'); setDetail(null); }
    setDL(false);
  };

  const rotateKeys = async (id:string) => {
    if (!confirm('Rotate API keys? Old keys stop working immediately.')) return;
    try {
      await api(`/api/v1/admin/merchants/${id}/rotate-keys`,{method:'POST'});
      flash('Keys rotated — re-open detail for new values'); openDetail(id);
    } catch(e:any) { flash(e.message,'err'); }
  };

  const resetPassword = async () => {
    if (!newPwd || newPwd.length<8) { flash('Password must be 8+ chars','err'); return; }
    setSaving(true);
    try {
      await api(`/api/v1/admin/merchants/${resetModal.id}/reset-password`,{method:'POST',body:JSON.stringify({new_password:newPwd})});
      flash('Password reset — all sessions revoked'); setResetModal(null); setNewPwd('');
    } catch(e:any) { flash(e.message,'err'); }
    setSaving(false);
  };

  const updateLimit = async () => {
    const lim = parseInt(newLimit);
    if (!lim||lim<1) { flash('Enter valid limit','err'); return; }
    setSaving(true);
    try {
      await api(`/api/v1/admin/merchants/${limitModal.id}/limit`,{method:'PUT',body:JSON.stringify({daily_limit_rupees:lim})});
      flash(`Daily limit set to ₹${lim.toLocaleString()}`); setLimitModal(null); setNewLimit('');
    } catch(e:any) { flash(e.message,'err'); }
    setSaving(false);
  };

  const filtered = merchants.filter(m =>
    !search || JSON.stringify(m).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{maxWidth:1200}}>
      <SectionHeader title="Merchants" sub={`${num(total)} total`} onRefresh={load}>
        <div style={{position:'relative'}}>
          <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.text3}}/>
          <input style={{...inputStyle,paddingLeft:32,width:240}} placeholder="Search merchants…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </SectionHeader>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Merchant</TH><TH>Email</TH><TH>API Key</TH>
              <TH>Status</TH><TH right>Daily Limit</TH><TH>Joined</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : filtered.length===0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:C.text3}}>No merchants found</td></tr>
              ) : filtered.map((m:any)=>(
                <tr key={m.id}>
                  <TD><button onClick={()=>openDetail(m.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.blue,fontWeight:700,fontSize:13,fontFamily:'inherit',padding:0,textAlign:'left'}}>{m.name||'—'}</button></TD>
                  <TD>{m.email}</TD>
                  <TD mono>{(m.api_key||'').slice(0,16)}…</TD>
                  <TD><Badge val={m.is_active?'active':'inactive'}/></TD>
                  <TD right>{rupees(m.daily_limit||0)}</TD>
                  <TD>{dateStr(m.created_at)}</TD>
                  <TD>
                    <div style={{display:'flex',gap:4}}>
                      <Btn onClick={()=>openDetail(m.id)} variant='ghost' small>View</Btn>
                      <Btn onClick={()=>toggle(m.id,m.is_active)} variant={m.is_active?'danger':'success'} small>{m.is_active?'Suspend':'Activate'}</Btn>
                      <Btn onClick={()=>{setResetModal(m);setNewPwd('');}} variant='ghost' small><Lock size={11}/></Btn>
                      <Btn onClick={()=>{setLimitModal(m);setNewLimit(String((m.daily_limit||0)/100));}} variant='ghost' small><Settings size={11}/></Btn>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage}/>
      </div>

      {detail && (
        <Modal title="Merchant Profile" onClose={()=>setDetail(null)} width={600}>
          {detailLoading ? <div style={{textAlign:'center',padding:40}}><Spinner/></div> : (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                {[
                  ['Name',detail.name],['Email',detail.email],
                  ['Business',detail.business_name],
                  ['Daily Limit',rupees(detail.daily_limit||0)],
                  ['Total Volume',rupees(detail.total_volume||0)],
                  ['Total Payments',num(detail.total_payments||0)],
                  ['Success Rate',pct(detail.success_rate||0)],
                  ['Joined',dateStr(detail.created_at)],
                ].map(([k,v]:any)=>(
                  <div key={k} style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 14px'}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{v||'—'}</div>
                  </div>
                ))}
                <div style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Status</div>
                  <Badge val={detail.is_active?'active':'inactive'}/>
                </div>
                <div style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>KYC</div>
                  <Badge val={detail.kyc_status||'not submitted'}/>
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 14px',marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>API Key</div>
                <div style={{fontSize:12,fontFamily:'monospace',color:C.text,wordBreak:'break-all'}}>{detail.api_key}</div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Btn onClick={()=>{setDetail(null);setResetModal(detail);setNewPwd('');}} variant='danger' small><Lock size={11}/>Reset Password</Btn>
                <Btn onClick={()=>rotateKeys(detail.id)} variant='ghost' small><Key size={11}/>Rotate Keys</Btn>
                <Btn onClick={()=>toggle(detail.id,detail.is_active)} variant={detail.is_active?'danger':'success'} small>{detail.is_active?'Suspend':'Activate'}</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {resetModal && (
        <Modal title={`Reset Password — ${resetModal.name}`} onClose={()=>setResetModal(null)}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>New Password (min 8 chars)</label>
            <input type="password" style={inputStyle} value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Enter new password"/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={resetPassword} loading={saving} variant='danger'><Lock size={13}/>Reset Password</Btn>
            <Btn onClick={()=>setResetModal(null)} variant='ghost'>Cancel</Btn>
          </div>
        </Modal>
      )}

      {limitModal && (
        <Modal title={`Daily Limit — ${limitModal.name}`} onClose={()=>setLimitModal(null)}>
          <div style={{marginBottom:6,fontSize:12,color:C.text3}}>Current: {rupees(limitModal.daily_limit||0)}/day</div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>New Daily Limit (₹)</label>
            <input type="number" style={inputStyle} value={newLimit} onChange={e=>setNewLimit(e.target.value)} placeholder="e.g. 100000"/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={updateLimit} loading={saving}><Check size={13}/>Update Limit</Btn>
            <Btn onClick={()=>setLimitModal(null)} variant='ghost'>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════
function PaymentsSection({ api, flash }: any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [updating, setUpdating] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({page:String(page),limit:'20'});
      if (status) q.set('status',status);
      if (search) q.set('search',search);
      const d = await api(`/api/v1/admin/payments-v2?${q}`);
      if (d?.success) { setPayments(toArr(d.data?.data)); setTotal(d.data?.total||0); }
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, [page, status, search]); // api/flash are stable

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id:string, ns:string) => {
    if (!confirm(`Mark as ${ns}?`)) return;
    setUpdating(id);
    try {
      await api(`/api/v1/admin/payments/${id}/status`,{method:'PUT',body:JSON.stringify({status:ns,note:'admin manual update'})});
      setPayments(ps=>ps.map((p:any)=>p.id===id?{...p,status:ns}:p));
      flash(`Payment marked as ${ns}`);
    } catch(e:any) { flash(e.message,'err'); }
    setUpdating(null);
  };

  return (
    <div style={{maxWidth:1200}}>
      <SectionHeader title="Payments" sub={`${num(total)} total`} onRefresh={load}>
        <div style={{display:'flex',gap:8}}>
          <div style={{position:'relative'}}>
            <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.text3}}/>
            <input style={{...inputStyle,paddingLeft:32,width:200}} placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
          <select style={{...inputStyle,width:140}} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </SectionHeader>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Txn ID</TH><TH>Merchant</TH><TH>Order ID</TH>
              <TH right>Amount</TH><TH>Customer</TH><TH>Status</TH>
              <TH>UTR</TH><TH>Date</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : payments.length===0 ? (
                <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:C.text3}}>No payments found</td></tr>
              ) : payments.map((p:any)=>(
                <tr key={p.id}>
                  <TD mono>
                    <span style={{background:'rgba(59,130,246,0.1)',color:C.blue,padding:'2px 6px',borderRadius:4,fontSize:10.5,fontWeight:700}}>
                      TXN-{(p.id||'').slice(0,8).toUpperCase()}
                    </span>
                  </TD>
                  <TD>{p.merchant_name||'—'}</TD>
                  <TD mono>{p.order_id}</TD>
                  <TD right><span style={{fontWeight:800}}>{rupees(p.amount||0)}</span></TD>
                  <TD>{p.customer_name||p.customer_reference||'—'}</TD>
                  <TD><Badge val={p.status}/></TD>
                  <TD mono>{p.utr||'—'}</TD>
                  <TD>
                    <div style={{fontSize:11}}>{dateStr(p.created_at)}</div>
                    <div style={{fontSize:10,color:C.text3}}>{timeStr(p.created_at)}</div>
                  </TD>
                  <TD>
                    {p.status==='pending'&&(
                      <div style={{display:'flex',gap:4}}>
                        <Btn onClick={()=>updateStatus(p.id,'paid')} variant='success' small loading={updating===p.id}><Check size={10}/>Paid</Btn>
                        <Btn onClick={()=>updateStatus(p.id,'failed')} variant='danger' small loading={updating===p.id}><X size={10}/>Fail</Btn>
                      </div>
                    )}
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={p=>{setPage(p);}}/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// KYC
// ════════════════════════════════════════════════════════════════
function KYCSection({ api, flash }: any) {
  const [kycs, setKycs]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [reason, setReason]           = useState('');
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api('/api/v1/admin/kyc');
      if (d?.success) setKycs(toArr(d.data));
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, []); // api/flash are stable

  useEffect(() => { load(); }, [load]);

  const review = async (merchantId:string, status:string, rejectionReason='') => {
    setSaving(true);
    try {
      await api(`/api/v1/admin/kyc/${merchantId}`,{method:'PUT',body:JSON.stringify({status,rejection_reason:rejectionReason})});
      setKycs(ks=>ks.map((k:any)=>k.merchant_id===merchantId?{...k,status}:k));
      setRejectModal(null); setReason('');
      flash(`KYC ${status}`);
    } catch(e:any) { flash(e.message,'err'); }
    setSaving(false);
  };

  const pending = kycs.filter((k:any)=>k.status==='pending').length;

  return (
    <div style={{maxWidth:1100}}>
      <SectionHeader title="KYC Management" sub={`${pending} pending review`} onRefresh={load}/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Merchant</TH><TH>Business</TH><TH>PAN</TH><TH>Bank</TH>
              <TH>Status</TH><TH>Submitted</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : kycs.length===0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:C.text3}}>No KYC submissions</td></tr>
              ) : kycs.map((k:any)=>(
                <tr key={k.id||k.merchant_id}>
                  <TD>{k.merchant_name||k.merchant_id?.slice(0,8)}</TD>
                  <TD>{k.business_name||'—'}</TD>
                  <TD mono>{k.pan_number||'—'}</TD>
                  <TD>{k.bank_name||'—'}{k.bank_ifsc?` · ${k.bank_ifsc}`:''}</TD>
                  <TD><Badge val={k.status}/></TD>
                  <TD>{dateStr(k.submitted_at||k.created_at)}</TD>
                  <TD>
                    {k.status==='pending' ? (
                      <div style={{display:'flex',gap:4}}>
                        <Btn onClick={()=>review(k.merchant_id,'approved')} variant='success' small loading={saving}><Check size={10}/>Approve</Btn>
                        <Btn onClick={()=>{setRejectModal(k);setReason('');}} variant='danger' small><X size={10}/>Reject</Btn>
                      </div>
                    ) : <span style={{fontSize:11,color:C.text3}}>{dateStr(k.reviewed_at)}</span>}
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectModal && (
        <Modal title="Reject KYC" onClose={()=>setRejectModal(null)}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>Rejection Reason</label>
            <textarea style={{...inputStyle,minHeight:80,resize:'vertical'}} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain why KYC is being rejected…"/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={()=>review(rejectModal.merchant_id,'rejected',reason)} loading={saving} variant='danger'><X size={13}/>Reject KYC</Btn>
            <Btn onClick={()=>setRejectModal(null)} variant='ghost'>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FRAUD
// ════════════════════════════════════════════════════════════════
function FraudSection({ api, flash }: any) {
  const [alerts, setAlerts]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({page:String(page),limit:'20'});
      if (severity) q.set('severity',severity);
      if (!showResolved) q.set('resolved','false');
      const d = await api(`/api/v1/admin/fraud-v2?${q}`);
      if (d?.success) { setAlerts(toArr(d.data?.data)); setTotal(d.data?.total||0); }
      else {
        const d2 = await api('/api/v1/admin/fraud-alerts');
        if (d2?.success) { setAlerts(toArr(d2.data?.data??d2.data?.alerts??d2.data)); setTotal(0); }
      }
    } catch { setAlerts([]); }
    setLoading(false);
  }, [page, severity, showResolved]); // api is stable

  useEffect(() => { load(); }, [load]);

  const resolve = async (id:string) => {
    try {
      await api(`/api/v1/admin/fraud-alerts/${id}/resolve`,{method:'PUT'});
      setAlerts(as=>as.map((a:any)=>a.id===id?{...a,resolved:true}:a));
      flash('Alert resolved');
    } catch(e:any) { flash(e.message,'err'); }
  };

  return (
    <div style={{maxWidth:1100}}>
      <SectionHeader title="Fraud Alerts" sub={`${num(total)} alerts`} onRefresh={load}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select style={{...inputStyle,width:140}} value={severity} onChange={e=>setSeverity(e.target.value)}>
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.text2,cursor:'pointer'}}>
            <input type="checkbox" checked={showResolved} onChange={e=>setShowResolved(e.target.checked)}/>Show resolved
          </label>
        </div>
      </SectionHeader>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Type</TH><TH>Merchant</TH><TH>Order</TH>
              <TH>Severity</TH><TH>Details</TH><TH>Status</TH><TH>Date</TH><TH>Action</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : alerts.length===0 ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:C.text3}}>No alerts</td></tr>
              ) : alerts.map((a:any)=>(
                <tr key={a.id} style={{opacity:a.resolved?.5:1}}>
                  <TD><span style={{fontFamily:'monospace',fontSize:11,color:C.amber}}>{a.alert_type}</span></TD>
                  <TD>{a.merchant_name||'—'}</TD>
                  <TD mono>{(a.order_id||'').slice(0,16)||'—'}</TD>
                  <TD><Badge val={a.severity}/></TD>
                  <TD><span style={{fontSize:11,color:C.text3,maxWidth:200,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={a.details}>{a.details}</span></TD>
                  <TD><Badge val={a.resolved?'resolved':'unresolved'}/></TD>
                  <TD>{dateStr(a.created_at)}</TD>
                  <TD>{!a.resolved&&<Btn onClick={()=>resolve(a.id)} variant='success' small><Check size={10}/>Resolve</Btn>}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage}/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// WEBHOOKS
// ════════════════════════════════════════════════════════════════
function WebhooksSection({ api, flash }: any) {
  const [logs, setLogs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [retrying, setRetrying] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/v1/admin/webhook-logs?page=${page}&limit=20`);
      if (d?.success) { setLogs(toArr(d.data?.data)); setTotal(d.data?.total||0); }
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, [page]); // api/flash are stable

  useEffect(() => { load(); }, [load]);

  const retry = async (id:string) => {
    setRetrying(id);
    try {
      await api(`/api/v1/admin/webhook-logs/${id}/retry`,{method:'POST'});
      flash('Webhook queued for retry'); load();
    } catch(e:any) { flash(e.message,'err'); }
    setRetrying(null);
  };

  return (
    <div style={{maxWidth:1200}}>
      <SectionHeader title="Webhook Logs" sub={`${num(total)} deliveries`} onRefresh={load}/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>ID</TH><TH>Merchant</TH><TH>URL</TH>
              <TH>Status</TH><TH right>Code</TH><TH right>Attempt</TH>
              <TH>Date</TH><TH>Action</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : logs.length===0 ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:C.text3}}>No webhook logs</td></tr>
              ) : logs.map((l:any)=>(
                <tr key={l.id}>
                  <TD mono><span style={{fontSize:10}}>{(l.id||'').slice(0,8)}</span></TD>
                  <TD>{l.merchant_name||'—'}</TD>
                  <TD><span style={{fontSize:11,maxWidth:180,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={l.url}>{l.url}</span></TD>
                  <TD><Badge val={l.success?'paid':'failed'}/></TD>
                  <TD right><span style={{fontFamily:'monospace',fontSize:12,color:l.response_code>=200&&l.response_code<300?C.green:C.red}}>{l.response_code||0}</span></TD>
                  <TD right>{l.attempt}</TD>
                  <TD>
                    <div style={{fontSize:11}}>{dateStr(l.created_at)}</div>
                    <div style={{fontSize:10,color:C.text3}}>{timeStr(l.created_at)}</div>
                  </TD>
                  <TD>{!l.success&&<Btn onClick={()=>retry(l.id)} variant='ghost' small loading={retrying===l.id}><RotateCcw size={10}/>Retry</Btn>}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage}/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════════
function SubsSection({ api, flash }: any) {
  const [subs, setSubs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [extModal, setExtModal] = useState<any>(null);
  const [planModal, setPlanModal] = useState<any>(null);
  const [days, setDays]         = useState('30');
  const [expiryDate, setExpiryDate] = useState('');
  const [plans, setPlans]       = useState<any[]>([]);
  const [selPlan, setSelPlan]   = useState('');
  const [saving, setSaving]     = useState(false);

  const toDateInput = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toISOString().split('T')[0];
  };
  const addDays = (d: number) => {
    const base = extModal?.expires_at && new Date(extModal.expires_at) > new Date()
      ? new Date(extModal.expires_at) : new Date();
    base.setDate(base.getDate() + d);
    setExpiryDate(base.toISOString().split('T')[0]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        api(`/api/v1/admin/subscriptions?page=${page}&limit=20`),
        api('/api/v1/admin/plans'),
      ]);
      if (d?.success) { setSubs(toArr(d.data?.data)); setTotal(d.data?.total||0); }
      if (p?.success) setPlans(toArr(p.data));
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, [page]); // api/flash are stable

  useEffect(() => { load(); }, [load]);

  const extend = async () => {
    setSaving(true);
    try {
      await api(`/api/v1/admin/subscriptions/${extModal.merchant_id}/extend`,{method:'POST',body:JSON.stringify({expires_at:expiryDate})});
      if (selPlan) {
        await api(`/api/v1/admin/subscriptions/${extModal.merchant_id}/plan`,{method:'PUT',body:JSON.stringify({plan_id:selPlan,duration_days:0})});
      }
      flash('Subscription updated'); setExtModal(null); load();
    } catch(e:any) { flash(e.message,'err'); }
    setSaving(false);
  };

  const changePlan = async () => {
    if (!selPlan) { flash('Select a plan','err'); return; }
    setSaving(true);
    try {
      await api(`/api/v1/admin/subscriptions/${planModal.merchant_id}/plan`,{method:'PUT',body:JSON.stringify({plan_id:selPlan,duration_days:0})});
      flash('Plan updated'); setPlanModal(null); load();
    } catch(e:any) { flash(e.message,'err'); }
    setSaving(false);
  };

  const cancel = async (merchantId:string) => {
    if (!confirm('Cancel this subscription?')) return;
    try {
      await api(`/api/v1/admin/subscriptions/${merchantId}/status`,{method:'PUT',body:JSON.stringify({status:'cancelled'})});
      flash('Subscription cancelled'); load();
    } catch(e:any) { flash(e.message,'err'); }
  };

  return (
    <div style={{maxWidth:1100}}>
      <SectionHeader title="Subscriptions" sub={`${num(total)} total`} onRefresh={load}/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Merchant</TH><TH>Email</TH><TH>Plan</TH>
              <TH>Status</TH><TH>Started</TH><TH>Expires</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : subs.length===0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:C.text3}}>No subscriptions</td></tr>
              ) : subs.map((s:any)=>(
                <tr key={s.id}>
                  <TD>{s.merchant_name||'—'}</TD>
                  <TD>{s.merchant_email||'—'}</TD>
                  <TD><span style={{fontWeight:700,color:C.blue}}>{s.plan_name||'—'}</span></TD>
                  <TD><Badge val={s.status}/></TD>
                  <TD>{dateStr(s.started_at)}</TD>
                  <TD>{s.expires_at?dateStr(s.expires_at):'Never'}</TD>
                  <TD>
                    <div style={{display:'flex',gap:4}}>
                      <Btn onClick={()=>{ setExtModal(s); setSelPlan(''); const base = s.expires_at && new Date(s.expires_at)>new Date() ? new Date(s.expires_at) : new Date(); base.setDate(base.getDate()+30); setExpiryDate(base.toISOString().split('T')[0]); }} variant='ghost' small><Clock size={10}/>Extend</Btn>
                      <Btn onClick={()=>{setPlanModal(s);setSelPlan('');}} variant='ghost' small><Package size={10}/>Plan</Btn>
                      {s.status==='active'&&<Btn onClick={()=>cancel(s.merchant_id)} variant='danger' small>Cancel</Btn>}
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage}/>
      </div>

      {extModal&&(
        <Modal title={`Edit Subscription — ${extModal.merchant_name}`} onClose={()=>setExtModal(null)}>
          {/* Current info */}
          <div style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 14px',marginBottom:18,fontSize:12,color:C.text3,display:'flex',gap:20,flexWrap:'wrap' as const}}>
            <span>Plan: <b style={{color:C.blue}}>{extModal.plan_name||'—'}</b></span>
            <span>Status: <b style={{color:extModal.status==='active'?C.green:C.text3}}>{extModal.status}</b></span>
            <span>Expires: <b style={{color:C.text}}>{extModal.expires_at ? new Date(extModal.expires_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Never'}</b></span>
          </div>

          {/* Plan selector */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'.07em'}}>Change Plan (optional)</label>
            <select style={inputStyle} value={selPlan} onChange={e=>setSelPlan(e.target.value)}>
              <option value="">— Keep current plan —</option>
              {plans.map((p:any)=><option key={p.id} value={p.id}>{p.name} – ₹{(p.price||0)/100}/mo</option>)}
            </select>
          </div>

          {/* Expiry date */}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'.07em'}}>Set Expiry Date</label>
            <input
              type="date"
              style={{...inputStyle, fontFamily:'inherit'}}
              value={expiryDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e=>setExpiryDate(e.target.value)}
            />
          </div>

          {/* Quick presets */}
          <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap' as const}}>
            {[['7d',7],['30d',30],['60d',60],['90d',90],['180d',180],['1yr',365]].map(([label,d])=>(
              <button key={label as string} onClick={()=>addDays(d as number)} style={{
                padding:'5px 12px',borderRadius:8,border:`1px solid ${C.border}`,
                background:'rgba(255,255,255,0.05)',color:C.text2,fontSize:11,fontWeight:700,
                cursor:'pointer',fontFamily:'inherit',transition:'all .15s'
              }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(99,102,241,0.15)')}
              onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.05)')}
              >+{label as string}</button>
            ))}
          </div>

          <div style={{display:'flex',gap:8}}>
            <Btn onClick={extend} loading={saving} disabled={!expiryDate}><Check size={13}/>Save Changes</Btn>
            <Btn onClick={()=>setExtModal(null)} variant='ghost'>Cancel</Btn>
          </div>
        </Modal>
      )}

      {planModal&&(
        <Modal title={`Change Plan — ${planModal.merchant_name}`} onClose={()=>setPlanModal(null)}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>Select New Plan</label>
            <select style={inputStyle} value={selPlan} onChange={e=>setSelPlan(e.target.value)}>
              <option value="">— Select Plan —</option>
              {plans.map((p:any)=><option key={p.id} value={p.id}>{p.name} – ₹{(p.price||0)/100}/mo</option>)}
            </select>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={changePlan} loading={saving}><Check size={13}/>Update Plan</Btn>
            <Btn onClick={()=>setPlanModal(null)} variant='ghost'>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════════

const ALL_FEATURES = [
  { key: 'upi_links',      label: 'UPI Payment Links' },
  { key: 'qr_codes',       label: 'QR Code Generation' },
  { key: 'api_access',     label: 'API Access' },
  { key: 'webhooks',       label: 'Webhook Support' },
  { key: 'basic_analytics',label: 'Basic Analytics' },
  { key: 'adv_analytics',  label: 'Advanced Analytics' },
  { key: 'telegram',       label: 'Telegram Payment Alerts' },
  { key: 'ai_assistant',   label: 'AI Assistant' },
  { key: 'team_mgmt',      label: 'Team Management' },
  { key: 'crypto',         label: 'Crypto / USDT Payments' },
  { key: 'white_label',    label: 'White-label Branding' },
  { key: 'priority_support',label:'Priority Support' },
  { key: 'email_support',  label: 'Email Support' },
  { key: 'dedicated_infra',label: 'Dedicated Infrastructure' },
  { key: 'sla',            label: 'SLA Guarantee' },
  { key: 'account_mgr',    label: 'Dedicated Account Manager' },
  { key: 'custom_limits',  label: 'Custom Rate Limits' },
];

const LIMIT_OPTS_QR   = [[-1,'Unlimited'],[10,'10'],[50,'50'],[100,'100'],[500,'500'],[1000,'1,000'],[5000,'5,000']];
const LIMIT_OPTS_LINK = [[-1,'Unlimited'],[1,'1'],[3,'3'],[5,'5'],[10,'10'],[25,'25'],[50,'50'],[100,'100']];
const LIMIT_OPTS_API  = [[-1,'Unlimited'],[100,'100/day'],[500,'500/day'],[1000,'1,000/day'],[5000,'5,000/day'],[10000,'10,000/day']];
const BILLING_OPTS    = ['forever','per month','per year','contact us'];
const BADGE_OPTS      = ['','Most popular','Best value','New','Enterprise'];
const CTA_OPTS        = ['Get Started','Start Free Trial','Contact Sales','Upgrade Now','Try for Free'];

const EMPTY_PLAN = {
  name:'', price:'0', billing_cycle:'per month', badge:'', is_featured:false,
  cta_label:'Get Started', sort_order:0,
  qr_limit:-1, link_limit:-1, api_limit:-1, qr_custom:'', link_custom:'', api_custom:'',
  discount_6month:15, discount_1year:0, price_1year:'0',
  selected_features: new Set<string>(), custom_features:''
};

function LimitSelect({ label, value, opts, onChange }: { label:string; value:number; opts:any[][]; onChange:(v:number)=>void }) {
  const isCustom = !opts.some(([v])=>v===value);
  return (
    <div>
      <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>{label}</label>
      <select style={inputStyle} value={isCustom?'custom':String(value)}
        onChange={e => {
          if (e.target.value==='custom') onChange(0);
          else onChange(Number(e.target.value));
        }}>
        {opts.map(([v,l]:any)=><option key={v} value={String(v)}>{l}</option>)}
        <option value="custom">Custom…</option>
      </select>
      {isCustom && (
        <input type="number" placeholder="Enter exact limit (-1=unlimited)"
          style={{...inputStyle,marginTop:6}} value={value===0?'':value}
          onChange={e=>onChange(parseInt(e.target.value)||0)}/>
      )}
    </div>
  );
}

function PlansSection({ api, flash }: any) {
  const [plans, setPlans]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<any>(null);
  const [form, setForm]         = useState<any>(EMPTY_PLAN);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api('/api/v1/admin/plans');
      if (d?.success) setPlans(toArr(d.data));
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (p:any) => {
    const feats = toArr(p.features);
    const knownLabels = new Set(ALL_FEATURES.map(f=>f.label));
    const selKeys = new Set(
      ALL_FEATURES.filter(f=>feats.includes(f.label)).map(f=>f.key)
    );
    const customFeats = feats.filter((f:string)=>!knownLabels.has(f)).join('\n');
    setForm({
      name:p.name||'', price:String((p.price||0)/100),
      billing_cycle:p.billing_cycle||'per month', badge:p.badge||'',
      is_featured:p.is_featured||false, cta_label:p.cta_label||'Get Started',
      sort_order:p.sort_order||0,
      qr_limit:p.qr_limit??-1, link_limit:p.link_limit??-1, api_limit:p.api_limit??-1,
      discount_6month:p.discount_6month??15, discount_1year:p.discount_1year??0, price_1year:String((p.price_1year||0)/100),
      selected_features:selKeys, custom_features:customFeats,
    });
    setModal(p);
  };

  const toggleFeature = (key:string) => {
    setForm((f:any)=>{
      const s = new Set(f.selected_features);
      if (s.has(key)) s.delete(key); else s.add(key);
      return {...f, selected_features:s};
    });
  };

  const pf = (k:string,v:any) => setForm((f:any)=>({...f,[k]:v}));

  const save = async () => {
    if (!form.name||!form.cta_label) { flash('Name and CTA label required','err'); return; }
    const selectedLabels = ALL_FEATURES.filter(f=>form.selected_features.has(f.key)).map(f=>f.label);
    const customLines = form.custom_features.split('\n').map((s:string)=>s.trim()).filter(Boolean);
    const features = [...selectedLabels, ...customLines];
    setSaving(true);
    const body = {
      name:form.name, price:Math.round(parseFloat(form.price||'0')*100),
      billing_cycle:form.billing_cycle, badge:form.badge||'',
      is_featured:form.is_featured, cta_label:form.cta_label,
      sort_order:parseInt(form.sort_order)||0,
      qr_limit:parseInt(form.qr_limit)||0,
      link_limit:parseInt(form.link_limit)||0,
      api_limit:parseInt(form.api_limit)||0,
      discount_6month:parseInt(form.discount_6month)||0,
      discount_1year:parseInt(form.discount_1year)||0,
      price_1year:Math.round(parseFloat(form.price_1year||'0')*100),
      features,
    };
    try {
      const isEdit = modal!=='new';
      await api(isEdit?`/api/v1/admin/plans/${modal.id}`:'/api/v1/admin/plans',{method:isEdit?'PUT':'POST',body:JSON.stringify(body)});
      flash(isEdit?'Plan updated':'Plan created'); setModal(null); load();
    } catch(e:any) { flash(e.message,'err'); }
    setSaving(false);
  };

  const del = async (id:string) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api(`/api/v1/admin/plans/${id}`,{method:'DELETE'});
      flash('Plan deleted'); setPlans(ps=>ps.filter((p:any)=>p.id!==id));
    } catch(e:any) { flash(e.message,'err'); }
    setDeleting('');
  };

  const fmtLimit = (v:number|null|undefined) => (v==null||v===-1)?'Unlimited':(v||0).toLocaleString('en-IN');

  return (
    <div style={{maxWidth:1100}}>
      <SectionHeader title="Plans" sub={`${plans.length} plans`} onRefresh={load}>
        <Btn onClick={()=>{setForm({...EMPTY_PLAN,selected_features:new Set()});setModal('new');}}><Plus size={13}/>New Plan</Btn>
      </SectionHeader>

      {loading ? <div style={{textAlign:'center',padding:40}}><Spinner/></div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {plans.map((p:any)=>(
            <div key={p.id} style={{background:C.card,border:`1px solid ${p.is_featured?C.blue:C.border}`,borderRadius:14,padding:20,position:'relative',display:'flex',flexDirection:'column',gap:10}}>
              {p.is_featured&&<div style={{position:'absolute',top:12,right:12,background:C.blue,color:'#fff',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,textTransform:'uppercase',letterSpacing:'.08em'}}>Featured</div>}
              <div>
                <div style={{fontSize:15,fontWeight:900,marginBottom:3}}>{p.name}</div>
                <div style={{fontSize:22,fontWeight:900,color:C.blue,letterSpacing:'-.02em'}}>
                  {(p.price||0)===0?'Free':'₹'+((p.price||0)/100).toLocaleString('en-IN')}
                  <span style={{fontSize:12,fontWeight:500,color:C.text3}}>/{p.billing_cycle}</span>
                </div>
                {p.badge&&<div style={{marginTop:6}}><Badge val={p.badge}/></div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,padding:'10px 0'}}>
                {([['QR Codes',p.qr_limit,'/ period'],['Pay Links',p.link_limit,'active'],['API Calls',p.api_limit,'/ day']] as [string,number,string][]).map(([l,v,unit])=>(
                  <div key={l} style={{textAlign:'center'}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>{l}</div>
                    <div style={{fontSize:16,fontWeight:900,color:v===-1?C.green:C.blue,letterSpacing:'-.02em'}}>{fmtLimit(v)}</div>
                    <div style={{fontSize:9,color:C.text3,marginTop:1}}>{unit}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:C.text2}}>
                {toArr(p.features).slice(0,4).map((f:string,i:number)=>(
                  <div key={i} style={{marginBottom:2,display:'flex',alignItems:'center',gap:5}}>
                    <Check size={10} color={C.green}/>{f}
                  </div>
                ))}
                {toArr(p.features).length>4&&<div style={{color:C.text3,fontSize:11,marginTop:2}}>+{toArr(p.features).length-4} more features</div>}
              </div>
              <div style={{display:'flex',gap:6,marginTop:'auto'}}>
                <Btn onClick={()=>openEdit(p)} variant='ghost' small><Pencil size={10}/>Edit</Btn>
                <Btn onClick={()=>del(p.id)} variant='danger' small loading={deleting===p.id}><Trash2 size={10}/>Delete</Btn>
              </div>
            </div>
          ))}
          {plans.length===0&&<div style={{color:C.text3,fontSize:13}}>No plans yet. Create one.</div>}
        </div>
      )}

      {modal&&(
        <Modal title={modal==='new'?'New Plan':`Edit — ${modal.name}`} onClose={()=>setModal(null)} width={640}>
          {/* Row 1: Name + Price */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Plan Name</label>
              <input style={inputStyle} value={form.name} onChange={e=>pf('name',e.target.value)} placeholder="e.g. Starter"/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Price (₹) — 0 = Free</label>
              <input type="number" style={inputStyle} value={form.price} onChange={e=>pf('price',e.target.value)} min="0"/>
            </div>
          </div>

          {/* Row 2: Billing + CTA + Badge */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Billing Cycle</label>
              <select style={inputStyle} value={form.billing_cycle} onChange={e=>pf('billing_cycle',e.target.value)}>
                {BILLING_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>CTA Button Label</label>
              <select style={inputStyle} value={form.cta_label} onChange={e=>pf('cta_label',e.target.value)}>
                {CTA_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                <option value={form.cta_label}>{form.cta_label}</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Badge</label>
              <select style={inputStyle} value={form.badge} onChange={e=>pf('badge',e.target.value)}>
                {BADGE_OPTS.map(o=><option key={o} value={o}>{o||'— None —'}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Limits */}
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Usage Limits (-1 = Unlimited)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <LimitSelect label="QR Codes / Period" value={form.qr_limit} opts={LIMIT_OPTS_QR} onChange={v=>pf('qr_limit',v)}/>
              <LimitSelect label="Active Payment Links" value={form.link_limit} opts={LIMIT_OPTS_LINK} onChange={v=>pf('link_limit',v)}/>
              <LimitSelect label="API Calls / Day" value={form.api_limit} opts={LIMIT_OPTS_API} onChange={v=>pf('api_limit',v)}/>
            </div>
          </div>

          {/* Row 4: Discounts + Yearly Price + Sort */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>6-Month Discount %</label>
              <select style={inputStyle} value={form.discount_6month} onChange={e=>pf('discount_6month',e.target.value)}>
                {[0,5,10,15,20,25,30].map(v=><option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Yearly Price (₹) <span style={{fontWeight:400,textTransform:'none',color:C.text2}}>— 0 = use discount</span></label>
              <input type="number" style={inputStyle} value={form.price_1year} onChange={e=>pf('price_1year',e.target.value)} min="0" placeholder="e.g. 9999"/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Sort Order</label>
              <input type="number" style={inputStyle} value={form.sort_order} onChange={e=>pf('sort_order',e.target.value)} min="0"/>
            </div>
          </div>

          {/* Features checkboxes */}
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Features</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {ALL_FEATURES.map(f=>(
                <label key={f.key} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',padding:'5px 8px',borderRadius:7,background:form.selected_features.has(f.key)?'rgba(59,130,246,0.12)':'transparent',border:`1px solid ${form.selected_features.has(f.key)?C.blue:'transparent'}`,transition:'all .15s'}}>
                  <input type="checkbox" checked={form.selected_features.has(f.key)} onChange={()=>toggleFeature(f.key)} style={{accentColor:C.blue}}/>
                  <span style={{color:form.selected_features.has(f.key)?C.text:C.text2}}>{f.label}</span>
                </label>
              ))}
            </div>
            <div style={{marginTop:10}}>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Additional Custom Features (one per line)</label>
              <textarea style={{...inputStyle,minHeight:60,resize:'vertical'}} value={form.custom_features} onChange={e=>pf('custom_features',e.target.value)} placeholder="e.g. Custom integration support"/>
            </div>
          </div>

          <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,fontSize:13,cursor:'pointer',padding:'8px 10px',borderRadius:8,border:`1px solid ${form.is_featured?C.blue:C.border}`,background:form.is_featured?'rgba(59,130,246,0.08)':'transparent'}}>
            <input type="checkbox" checked={form.is_featured} onChange={e=>pf('is_featured',e.target.checked)} style={{accentColor:C.blue}}/>
            <span style={{fontWeight:600}}>Mark as Featured</span>
            <span style={{fontSize:11,color:C.text3,marginLeft:'auto'}}>Highlighted with blue border on pricing page</span>
          </label>

          <div style={{display:'flex',gap:8}}>
            <Btn onClick={save} loading={saving}><Check size={13}/>{modal==='new'?'Create Plan':'Update Plan'}</Btn>
            <Btn onClick={()=>setModal(null)} variant='ghost'>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ════════════════════════════════════════════════════════════════
function TicketsSection({ api, flash }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter ? `?status=${filter}` : '';
      const d = await api(`/api/v1/admin/tickets${q}`);
      if (d?.success) setTickets(toArr(d.data));
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, status: string, adminNote?: string) => {
    try {
      await api(`/api/v1/admin/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_note: adminNote ?? noteInput[id] ?? '' }),
      });
      flash('Ticket updated','ok');
      load();
      setExpanded(null);
    } catch(e:any) { flash(e.message,'err'); }
  };

  const TICKET_COLORS: Record<string,string> = { open: C.red, in_progress: C.amber, resolved: C.green };

  return (
    <div style={{maxWidth:1100}}>
      <SectionHeader title="Support Tickets" sub={`${tickets.length} total`} onRefresh={load}>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:'6px 10px',fontSize:12}}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </SectionHeader>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Merchant</TH><TH>Subject</TH><TH>Status</TH><TH>Date</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:40,color:C.text3}}>No tickets yet</td></tr>
              ) : tickets.map((t:any) => (
                <>
                  <tr key={t.id} style={{cursor:'pointer'}} onClick={()=>setExpanded(expanded===t.id?null:t.id)}>
                    <TD>{t.merchant_name || t.merchant_id?.slice(0,8)}</TD>
                    <TD><span style={{fontWeight:500,color:C.text}}>{t.subject}</span></TD>
                    <TD>
                      <span style={{
                        fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                        background:(TICKET_COLORS[t.status]||C.text3)+'22',
                        color:TICKET_COLORS[t.status]||C.text3,
                      }}>{t.status.replace('_',' ')}</span>
                    </TD>
                    <TD>
                      <div style={{fontSize:11}}>{dateStr(t.created_at)}</div>
                      <div style={{fontSize:10,color:C.text3}}>{timeStr(t.created_at)}</div>
                    </TD>
                    <TD>
                      <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                        {t.status !== 'in_progress' && (
                          <button onClick={()=>update(t.id,'in_progress')}
                            style={{background:C.amber+'22',border:'none',color:C.amber,borderRadius:7,padding:'4px 10px',fontSize:11,cursor:'pointer',fontWeight:600}}>
                            In Progress
                          </button>
                        )}
                        {t.status !== 'resolved' && (
                          <button onClick={()=>update(t.id,'resolved')}
                            style={{background:C.green+'22',border:'none',color:C.green,borderRadius:7,padding:'4px 10px',fontSize:11,cursor:'pointer',fontWeight:600}}>
                            Resolve
                          </button>
                        )}
                      </div>
                    </TD>
                  </tr>
                  {expanded === t.id && (
                    <tr key={`${t.id}-detail`}>
                      <td colSpan={5} style={{padding:'0 16px 16px',background:C.surface+'88'}}>
                        <div style={{padding:'14px',background:C.bg,borderRadius:10,border:`1px solid ${C.border}`,marginTop:4}}>
                          <div style={{fontSize:12,color:C.text2,marginBottom:8,fontWeight:600}}>Message</div>
                          <div style={{fontSize:13,color:C.text,whiteSpace:'pre-wrap',marginBottom:12}}>{t.message}</div>
                          {t.context && (
                            <>
                              <div style={{fontSize:12,color:C.text2,marginBottom:6,fontWeight:600}}>Chat Context</div>
                              <div style={{fontSize:11,color:C.text3,whiteSpace:'pre-wrap',fontFamily:'monospace',background:C.surface,padding:10,borderRadius:8,marginBottom:12}}>{t.context}</div>
                            </>
                          )}
                          {t.admin_note && (
                            <div style={{fontSize:12,color:C.amber,marginBottom:10}}>Admin note: {t.admin_note}</div>
                          )}
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <input
                              value={noteInput[t.id]||''}
                              onChange={e=>setNoteInput(p=>({...p,[t.id]:e.target.value}))}
                              placeholder="Add admin note…"
                              style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:'7px 12px',fontSize:12,fontFamily:'inherit'}}
                            />
                            <button onClick={()=>update(t.id,t.status,noteInput[t.id])}
                              style={{background:C.blue,border:'none',color:'#fff',borderRadius:8,padding:'7px 14px',fontSize:12,cursor:'pointer',fontWeight:600}}>
                              Save Note
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditSection({ api, flash }: any) {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/v1/admin/audit-logs?page=${page}&limit=20`);
      if (d?.success) { setLogs(toArr(d.data?.data)); setTotal(d.data?.total||0); }
    } catch(e:any) { flash(e.message,'err'); }
    setLoading(false);
  }, [page]); // api/flash are stable

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{maxWidth:1100}}>
      <SectionHeader title="Audit Logs" sub={`${num(total)} events`} onRefresh={load}/>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr>
              <TH>Actor</TH><TH>Action</TH><TH>Resource</TH>
              <TH>IP</TH><TH>Details</TH><TH>Date</TH>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:40}}><Spinner/></td></tr>
              ) : logs.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:C.text3}}>No audit logs yet</td></tr>
              ) : logs.map((l:any)=>(
                <tr key={l.id}>
                  <TD>{l.name||'System'}</TD>
                  <TD><span style={{fontFamily:'monospace',fontSize:11,color:C.blue}}>{l.action}</span></TD>
                  <TD><span style={{fontSize:11,color:C.text2}}>{l.resource}</span></TD>
                  <TD mono>{l.ip||'—'}</TD>
                  <TD><span style={{fontSize:11,color:C.text3,maxWidth:200,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={l.details}>{l.details||'—'}</span></TD>
                  <TD>
                    <div style={{fontSize:11}}>{dateStr(l.created_at)}</div>
                    <div style={{fontSize:10,color:C.text3}}>{timeStr(l.created_at)}</div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={20} onChange={setPage}/>
      </div>
    </div>
  );
}
