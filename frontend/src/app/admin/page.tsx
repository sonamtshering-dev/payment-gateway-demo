'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, RefreshCw, Search, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const fmt = (p: number) => { const r=p/100; if(r>=10000000) return `₹${(r/10000000).toFixed(1)}Cr`; if(r>=100000) return `₹${(r/100000).toFixed(1)}L`; if(r>=1000) return `₹${(r/1000).toFixed(1)}K`; return `₹${r.toFixed(0)}`; };
const dateStr = (s: string) => { try { return new Date(s).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}); } catch { return '-'; } };
const toArr = (v: any): any[] => { if (Array.isArray(v)) return v; return []; };

const TABS = ['Overview','Merchants','Payments','KYC','Fraud Alerts','Subscriptions','Plans'];

const S = {
  page:   { minHeight:'100vh', background:'#07090f', color:'#eef2ff', fontFamily:'DM Sans,sans-serif' } as React.CSSProperties,
  topbar: { height:62, background:'#0b0f1a', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', position:'sticky' as const, top:0, zIndex:50 } as React.CSSProperties,
  body:   { padding:28, maxWidth:1200, margin:'0 auto' } as React.CSSProperties,
  tabs:   { display:'flex', gap:4, background:'#111827', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:4, marginBottom:28, flexWrap:'wrap' as const } as React.CSSProperties,
  tab:    (active:boolean) => ({ background:active?'rgba(0,229,176,0.12)':'transparent', color:active?'#00e5b0':'#64748b', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:active?700:400, cursor:'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }) as React.CSSProperties,
  card:   { background:'#111827', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:24 } as React.CSSProperties,
  grid4:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:24 } as React.CSSProperties,
  statCard: { background:'#111827', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'18px 20px' } as React.CSSProperties,
  inp:    { background:'#0b0f1a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'9px 14px', color:'#eef2ff', fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none', width:'100%', boxSizing:'border-box' as const } as React.CSSProperties,
  label:  { display:'block', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' as const, letterSpacing:'0.08em', marginBottom:6 } as React.CSSProperties,
  btn:    (color:string) => ({ background:`rgba(${color},0.08)`, border:`1px solid rgba(${color},0.2)`, borderRadius:8, padding:'6px 14px', color:`rgb(${color})`, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }) as React.CSSProperties,
  tHead:  { display:'grid', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:11, fontWeight:700, color:'#4b5563', textTransform:'uppercase' as const, letterSpacing:'0.08em' } as React.CSSProperties,
  tRow:   { padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:13, alignItems:'center', transition:'background 0.15s' } as React.CSSProperties,
  badge:  (color:string) => ({ background:`rgba(${color},0.10)`, color:`rgb(${color})`, fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, letterSpacing:'0.05em' }) as React.CSSProperties,
  overlay:{ position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 } as React.CSSProperties,
  modal:  { background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:32, width:520, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto' as const } as React.CSSProperties,
};

const EMPTY_PLAN = { name:'', price:'', billing_cycle:'per month', badge:'', is_featured:false, cta_label:'', sort_order:0, qr_limit:0, link_limit:0, api_limit:0, features:'' };

export default function AdminPage() {
  const { merchant, isLoading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats]         = useState<any>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments]   = useState<any[]>([]);
  const [kycs, setKycs]           = useState<any[]>([]);
  const [frauds, setFrauds]       = useState<any[]>([]);
  const [plans, setPlans]         = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [extendModal, setExtendModal]   = useState<any>(null);
  const [extendDays, setExtendDays]     = useState(30);
  const [rejectModal, setRejectModal]   = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [planModal, setPlanModal]       = useState<any>(null); // null=closed, 'new'=create, object=edit
  const [planForm, setPlanForm]         = useState<any>(EMPTY_PLAN);
  const [planSaving, setPlanSaving]     = useState(false);
  const [deletingPlan, setDeletingPlan] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` };

  useEffect(() => { if (!isLoading && (!merchant || !merchant.is_admin)) router.replace('/dashboard'); }, [merchant, isLoading]);

  const flash = (msg:string, isErr=false) => {
    if (isErr) { setError(msg); setTimeout(()=>setError(''),4000); }
    else { setSuccess(msg); setTimeout(()=>setSuccess(''),4000); }
  };

  const loadPlans = useCallback(async () => {
    const d = await fetch('/api/v1/admin/plans', {headers}).then(r=>r.json()).catch(()=>({}));
    if (d?.success) setPlans(toArr(d.data));
  }, []);

  const load = useCallback(async () => {
    try {
      const [s,m,f] = await Promise.all([
        fetch('/api/v1/admin/stats',{headers}).then(r=>r.json()).catch(()=>({})),
        fetch('/api/v1/admin/merchants',{headers}).then(r=>r.json()).catch(()=>({})),
        fetch('/api/v1/admin/fraud-alerts',{headers}).then(r=>r.json()).catch(()=>({})),
      ]);
      if (s?.success) setStats(s.data);
      if (m?.success) setMerchants(toArr(m.data?.data ?? m.data));
      if (f?.success) setFrauds(toArr(f.data?.data ?? f.data?.alerts ?? f.data));
    } catch(e) { console.error('load error', e); }
    fetch('/api/v1/admin/kyc',{headers}).then(r=>r.json()).then(d=>{ if(d?.success) setKycs(toArr(d.data)); }).catch(()=>{});
    fetch('/api/v1/admin/payments',{headers}).then(r=>r.json()).then(d=>{ if(d?.success) setPayments(toArr(d.data?.data ?? d.data?.transactions ?? d.data)); }).catch(()=>{});
    loadPlans();
  }, [loadPlans]);

  useEffect(() => { if (merchant?.is_admin) load(); }, [merchant]);

  const toggleMerchant = async (id:string, active:boolean) => {
    await fetch(`/api/v1/admin/merchants/${id}/toggle`,{method:'PUT',headers});
    setMerchants(ms=>toArr(ms).map((m:any)=>m.id===id?{...m,is_active:!active}:m));
    flash(active?'Merchant disabled':'Merchant enabled');
  };

  const resolveFraud = async (id:string) => {
    await fetch(`/api/v1/admin/fraud-alerts/${id}/resolve`,{method:'PUT',headers});
    setFrauds(fs=>toArr(fs).map((f:any)=>f.id===id?{...f,resolved:true}:f));
    flash('Fraud alert resolved');
  };

  const reviewKYC = async (merchantId:string, status:string, reason='') => {
    const r = await fetch(`/api/v1/admin/kyc/${merchantId}`,{method:'PUT',headers,body:JSON.stringify({status,rejection_reason:reason})});
    const d = await r.json();
    if (!r.ok) { flash(d.error||'Failed',true); return; }
    setKycs(ks=>toArr(ks).map((k:any)=>k.merchant_id===merchantId?{...k,status}:k));
    setRejectModal(null); setRejectReason('');
    flash(`KYC ${status}`);
  };

  const extendSub = async () => {
    if (!extendModal) return;
    const r = await fetch(`/api/v1/admin/subscriptions/${extendModal.id}/extend`,{method:'POST',headers,body:JSON.stringify({days:extendDays})});
    const d = await r.json();
    if (!r.ok) { flash(d.error||'Failed',true); return; }
    setExtendModal(null);
    flash(`Subscription extended by ${extendDays} days`);
  };

  const openNewPlan = () => {
    setPlanForm(EMPTY_PLAN);
    setPlanModal('new');
  };

  const openEditPlan = (plan: any) => {
    setPlanForm({
      name: plan.name || '',
      price: String((plan.price||0) / 100), // convert paise to rupees for display
      billing_cycle: plan.billing_cycle || 'per month',
      badge: plan.badge || '',
      is_featured: plan.is_featured || false,
      cta_label: plan.cta_label || '',
      sort_order: plan.sort_order || 0,
      qr_limit: plan.qr_limit || 0,
      link_limit: plan.link_limit || 0,
      api_limit: plan.api_limit || 0,
      features: toArr(plan.features).join('\n'),
    });
    setPlanModal(plan);
  };

  const savePlan = async () => {
    if (!planForm.name || !planForm.cta_label) { flash('Name and CTA Label are required', true); return; }
    setPlanSaving(true);
    const body = {
      name: planForm.name,
      price: Math.round(parseFloat(planForm.price||'0') * 100), // rupees to paise
      billing_cycle: planForm.billing_cycle,
      badge: planForm.badge,
      is_featured: planForm.is_featured,
      cta_label: planForm.cta_label,
      sort_order: parseInt(planForm.sort_order)||0,
      qr_limit: parseInt(planForm.qr_limit)||0,
      link_limit: parseInt(planForm.link_limit)||0,
      api_limit: parseInt(planForm.api_limit)||0,
      features: planForm.features.split('\n').map((f:string)=>f.trim()).filter(Boolean),
    };
    try {
      const isEdit = planModal !== 'new';
      const url = isEdit ? `/api/v1/admin/plans/${planModal.id}` : '/api/v1/admin/plans';
      const method = isEdit ? 'PUT' : 'POST';
      const r = await fetch(url, {method, headers, body: JSON.stringify(body)});
      const d = await r.json();
      if (!r.ok) { flash(d.error||'Failed to save plan', true); return; }
      flash(isEdit ? 'Plan updated!' : 'Plan created!');
      setPlanModal(null);
      loadPlans();
    } catch(e:any) { flash(e.message, true); }
    finally { setPlanSaving(false); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    setDeletingPlan(id);
    try {
      const r = await fetch(`/api/v1/admin/plans/${id}`, {method:'DELETE', headers});
      if (!r.ok) { const d = await r.json(); flash(d.error||'Failed', true); return; }
      flash('Plan deleted');
      setPlans(ps=>ps.filter(p=>p.id!==id));
    } catch(e:any) { flash(e.message, true); }
    finally { setDeletingPlan(''); }
  };

  const filtered = (arr: any[]): any[] => {
    const safe = toArr(arr);
    if (!search) return safe;
    return safe.filter(m => JSON.stringify(m).toLowerCase().includes(search.toLowerCase()));
  };

  const pf = (k:string, v:any) => setPlanForm((f:any)=>({...f,[k]:v}));

  if (isLoading) return <div style={{...S.page,display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#64748b'}}>Loading...</p></div>;

  const merchantList = toArr(merchants);
  const paymentList  = toArr(payments);
  const kycList      = toArr(kycs);
  const fraudList    = toArr(frauds);
  const planList     = toArr(plans);

  return (
    <div style={S.page}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#00e5b0,#0ea5e9)',display:'flex',alignItems:'center',justifyContent:'center',color:'#07090f',fontWeight:800,fontSize:14}}>N</div>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:800}}>NovaPay</span>
          <span style={{background:'rgba(239,68,68,0.10)',color:'#ef4444',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:6,marginLeft:4}}>ADMIN</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'rgba(0,229,176,0.08)',border:'1px solid rgba(0,229,176,0.2)',color:'#00e5b0',fontSize:11,fontWeight:700,padding:'5px 12px',borderRadius:8}}>● Live</div>
          <button onClick={logout} style={{background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#64748b',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
            <LogOut size={14}/> Logout
          </button>
        </div>
      </div>

      <div style={S.body}>
        {error   && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:8,padding:'10px 16px',color:'#f87171',fontSize:13,marginBottom:16}}>{error}</div>}
        {success && <div style={{background:'rgba(0,229,176,0.08)',border:'1px solid rgba(0,229,176,0.18)',borderRadius:8,padding:'10px 16px',color:'#00e5b0',fontSize:13,marginBottom:16}}>{success}</div>}

        {/* Tabs */}
        <div style={S.tabs}>
          {TABS.map(t => <button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>{t}</button>)}
        </div>

        {/* Search bar */}
        {['Merchants','KYC','Fraud Alerts','Payments'].includes(tab) && (
          <div style={{display:'flex',gap:10,marginBottom:20}}>
            <div style={{position:'relative' as const,flex:1}}>
              <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#64748b'}}/>
              <input style={{...S.inp,paddingLeft:36}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button onClick={load} style={{...S.btn('0,229,176'),display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap' as const}}><RefreshCw size={13}/>Refresh</button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab==='Overview' && (
          <>
            <div style={S.grid4}>
              {[
                {label:'Total Revenue',    value:fmt(stats?.total_volume||0),              color:'#00e5b0', icon:'💸'},
                {label:'Total Merchants',  value:(stats?.total_merchants||merchantList.length).toLocaleString(), color:'#0ea5e9', icon:'🏪'},
                {label:'Total Payments',   value:(stats?.total_transactions||0).toLocaleString(),  color:'#8b5cf6', icon:'💳'},
                {label:'Success Rate',     value:`${(stats?.success_rate||0).toFixed(1)}%`, color:'#00e5b0', icon:'✅'},
                {label:"Today's Volume",   value:fmt(stats?.today_volume||0),              color:'#f59e0b', icon:'📈'},
                {label:'Failed Payments',  value:(stats?.failed_payments||0).toLocaleString(),     color:'#ef4444', icon:'❌'},
                {label:'Pending KYC',      value:kycList.filter(k=>k.status==='pending').length.toLocaleString(), color:'#f59e0b', icon:'📋'},
                {label:'Active Merchants', value:merchantList.filter(m=>m.is_active).length.toLocaleString(), color:'#00e5b0', icon:'✔'},
              ].map(c=>(
                <div key={c.label} style={S.statCard}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>{c.label}</div>
                    <span style={{fontSize:18}}>{c.icon}</span>
                  </div>
                  <div style={{fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,color:c.color,letterSpacing:-1}}>{c.value}</div>
                </div>
              ))}
            </div>
            <div style={{...S.card,marginTop:0}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginBottom:16}}>Quick Actions</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
                {TABS.slice(1).map(t=>(
                  <button key={t} onClick={()=>setTab(t)} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 18px',color:'#8b9ab5',cursor:'pointer',fontSize:13,fontFamily:'DM Sans,sans-serif'}}>
                    {t} →
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MERCHANTS ── */}
        {tab==='Merchants' && (
          <div style={S.card}>
            <div style={{...S.tHead,gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 1fr'}}>
              <span>Merchant</span><span>Email</span><span>Status</span><span>Joined</span><span>Actions</span>
            </div>
            {filtered(merchantList).length===0 && <div style={{padding:'48px',textAlign:'center' as const,color:'#4b5563'}}>No merchants found</div>}
            {filtered(merchantList).map((m:any)=>(
              <div key={m.id} style={{...S.tRow,display:'grid',gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 1fr'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              >
                <span style={{fontWeight:500}}>{m.name}</span>
                <span style={{color:'#64748b',fontSize:12}}>{m.email}</span>
                <span><span style={S.badge(m.is_active?'0,229,176':'100,116,139')}>{m.is_active?'ACTIVE':'DISABLED'}</span></span>
                <span style={{color:'#4b5563',fontSize:12}}>{m.created_at?dateStr(m.created_at):'-'}</span>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>toggleMerchant(m.id,m.is_active)} style={S.btn(m.is_active?'245,158,11':'0,229,176')}>{m.is_active?'Disable':'Enable'}</button>
                  <button onClick={()=>setExtendModal(m)} style={S.btn('139,92,246')}>Extend</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {tab==='Payments' && (
          <div style={S.card}>
            {paymentList.length===0 ? (
              <div style={{padding:'48px',textAlign:'center' as const,color:'#4b5563'}}>
                <div style={{fontSize:40,marginBottom:12}}>💳</div>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700}}>No payments yet</div>
              </div>
            ) : (
              <>
                <div style={{...S.tHead,gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}>
                  <span>Order ID</span><span>Merchant</span><span>Amount</span><span>Status</span><span>Date</span>
                </div>
                {filtered(paymentList).map((p:any,i:number)=>(
                  <div key={p.id||i} style={{...S.tRow,display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                  >
                    <span style={{fontFamily:'monospace',fontSize:12,color:'#8b9ab5'}}>{p.order_id||p.id?.slice(0,8)}</span>
                    <span style={{color:'#64748b',fontSize:12}}>{p.merchant_id?.slice(0,8)||'-'}</span>
                    <span style={{fontFamily:'Syne,sans-serif',fontWeight:700}}>₹{((p.amount||0)/100).toLocaleString('en-IN')}</span>
                    <span><span style={S.badge(p.status==='paid'?'0,229,176':p.status==='pending'?'245,158,11':'239,68,68')}>{(p.status||'').toUpperCase()}</span></span>
                    <span style={{color:'#4b5563',fontSize:12}}>{p.created_at?dateStr(p.created_at):'-'}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── KYC ── */}
        {tab==='KYC' && (
          <div style={S.card}>
            <div style={{...S.tHead,gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}>
              <span>Business</span><span>PAN</span><span>Aadhaar</span><span>Status</span><span>Actions</span>
            </div>
            {filtered(kycList).length===0 && <div style={{padding:'48px',textAlign:'center' as const,color:'#4b5563'}}>No KYC submissions yet</div>}
            {filtered(kycList).map((k:any)=>(
              <div key={k.id} style={{...S.tRow,display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              >
                <span style={{fontWeight:500}}>{k.business_name}</span>
                <span style={{fontFamily:'monospace',fontSize:12,color:'#8b9ab5'}}>{k.pan_number}</span>
                <span style={{fontFamily:'monospace',fontSize:12,color:'#8b9ab5'}}>{k.aadhaar_number?.slice(0,4)+'****'+k.aadhaar_number?.slice(-4)}</span>
                <span><span style={S.badge(k.status==='approved'?'0,229,176':k.status==='rejected'?'239,68,68':'245,158,11')}>{(k.status||'').toUpperCase()}</span></span>
                <div style={{display:'flex',gap:6}}>
                  {k.status==='pending' && <>
                    <button onClick={()=>reviewKYC(k.merchant_id,'approved')} style={S.btn('0,229,176')}>Approve</button>
                    <button onClick={()=>setRejectModal(k)} style={S.btn('239,68,68')}>Reject</button>
                  </>}
                  {k.status!=='pending' && <span style={{color:'#4b5563',fontSize:12}}>Reviewed</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FRAUD ALERTS ── */}
        {tab==='Fraud Alerts' && (
          <div style={S.card}>
            <div style={{...S.tHead,gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}>
              <span>Description</span><span>Merchant</span><span>Severity</span><span>Status</span><span>Action</span>
            </div>
            {filtered(fraudList).length===0 && <div style={{padding:'48px',textAlign:'center' as const,color:'#4b5563'}}>No fraud alerts</div>}
            {filtered(fraudList).map((f:any)=>(
              <div key={f.id} style={{...S.tRow,display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              >
                <span style={{fontSize:12,color:'#8b9ab5'}}>{f.description||f.type}</span>
                <span style={{fontSize:12,color:'#64748b'}}>{f.merchant_id?.slice(0,8)||'-'}</span>
                <span><span style={S.badge(f.severity==='critical'?'239,68,68':f.severity==='high'?'249,115,22':'245,158,11')}>{(f.severity||'').toUpperCase()}</span></span>
                <span><span style={S.badge(f.resolved?'0,229,176':'245,158,11')}>{f.resolved?'RESOLVED':'OPEN'}</span></span>
                {!f.resolved && <button onClick={()=>resolveFraud(f.id)} style={S.btn('0,229,176')}>Resolve</button>}
              </div>
            ))}
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {tab==='Subscriptions' && (
          <div style={S.card}>
            <div style={{...S.tHead,gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr'}}>
              <span>Merchant</span><span>Email</span><span>Status</span><span>Actions</span>
            </div>
            {filtered(merchantList).length===0 && <div style={{padding:'48px',textAlign:'center' as const,color:'#4b5563'}}>No merchants</div>}
            {filtered(merchantList).map((m:any)=>(
              <div key={m.id} style={{...S.tRow,display:'grid',gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              >
                <span style={{fontWeight:500}}>{m.name}</span>
                <span style={{color:'#64748b',fontSize:12}}>{m.email}</span>
                <span><span style={S.badge(m.is_active?'0,229,176':'100,116,139')}>{m.is_active?'ACTIVE':'INACTIVE'}</span></span>
                <button onClick={()=>setExtendModal(m)} style={S.btn('139,92,246')}>Extend Sub</button>
              </div>
            ))}
          </div>
        )}

        {/* ── PLANS ── */}
        {tab==='Plans' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800}}>Pricing Plans</div>
                <div style={{color:'#64748b',fontSize:13,marginTop:4}}>Manage the plans shown on your landing page and subscription page.</div>
              </div>
              <button onClick={openNewPlan} style={{background:'linear-gradient(135deg,#00e5b0,#0ea5e9)',border:'none',borderRadius:10,padding:'10px 20px',color:'#07090f',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                <Plus size={15}/> New Plan
              </button>
            </div>

            {/* Plan cards grid */}
            {planList.length===0 ? (
              <div style={{...S.card,textAlign:'center' as const,padding:64}}>
                <div style={{fontSize:40,marginBottom:12}}>📦</div>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,marginBottom:8}}>No plans yet</div>
                <div style={{color:'#64748b',fontSize:14,marginBottom:24}}>Create your first pricing plan to show on the landing page.</div>
                <button onClick={openNewPlan} style={{background:'linear-gradient(135deg,#00e5b0,#0ea5e9)',border:'none',borderRadius:10,padding:'12px 28px',color:'#07090f',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,cursor:'pointer'}}>
                  Create First Plan
                </button>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
                {planList.map((plan:any)=>(
                  <div key={plan.id} style={{background:'#111827',border:plan.is_featured?'1px solid rgba(0,229,176,0.3)':'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,position:'relative' as const}}>
                    {plan.badge && (
                      <div style={{position:'absolute' as const,top:16,right:16,background:'#00e5b0',color:'#07090f',fontSize:9,fontWeight:800,padding:'4px 10px',borderRadius:5}}>
                        {plan.badge.toUpperCase()}
                      </div>
                    )}
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.1em',marginBottom:6}}>{plan.name}</div>
                        <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,letterSpacing:-1}}>
                          {plan.price===0 ? 'Free' : `₹${(plan.price/100).toLocaleString('en-IN')}`}
                        </div>
                        <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{plan.billing_cycle}</div>
                      </div>
                      {plan.is_featured && <span style={S.badge('0,229,176')}>FEATURED</span>}
                    </div>

                    {/* Limits */}
                    <div style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 12px',marginBottom:12}}>
                      {[['QR codes', plan.qr_limit===0?'Unlimited':plan.qr_limit],['Payment links',plan.link_limit===0?'Unlimited':plan.link_limit],['API calls/day',plan.api_limit===0?'Unlimited':plan.api_limit]].map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                          <span style={{color:'#64748b'}}>{k}</span>
                          <span style={{color:'#eef2ff',fontWeight:600}}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <ul style={{listStyle:'none',padding:0,margin:'0 0 16px',display:'flex',flexDirection:'column' as const,gap:5}}>
                      {toArr(plan.features).slice(0,4).map((f:string,i:number)=>(
                        <li key={i} style={{display:'flex',gap:6,fontSize:12,color:'#8b9ab5'}}>
                          <span style={{color:'#00e5b0',fontWeight:700}}>✓</span>{f}
                        </li>
                      ))}
                      {toArr(plan.features).length>4 && <li style={{fontSize:11,color:'#4b5563'}}>+{toArr(plan.features).length-4} more</li>}
                    </ul>

                    {/* CTA label preview */}
                    <div style={{fontSize:11,color:'#4b5563',marginBottom:12}}>CTA: <span style={{color:'#8b9ab5'}}>{plan.cta_label}</span></div>

                    {/* Actions */}
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>openEditPlan(plan)} style={{...S.btn('0,229,176'),flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                        <Pencil size={12}/> Edit
                      </button>
                      <button onClick={()=>deletePlan(plan.id)} disabled={deletingPlan===plan.id} style={{...S.btn('239,68,68'),flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                        <Trash2 size={12}/> {deletingPlan===plan.id?'Deleting...':'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PLAN MODAL ── */}
      {planModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h2 style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,margin:0}}>{planModal==='new'?'Create New Plan':'Edit Plan'}</h2>
              <button onClick={()=>setPlanModal(null)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',padding:4}}><X size={18}/></button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={S.label}>Plan Name *</label>
                <input style={S.inp} value={planForm.name} onChange={e=>pf('name',e.target.value)} placeholder="e.g. Starter"/>
              </div>
              <div>
                <label style={S.label}>Price (₹) — 0 for free</label>
                <input style={S.inp} type="number" min="0" value={planForm.price} onChange={e=>pf('price',e.target.value)} placeholder="999"/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={S.label}>Billing Cycle</label>
                <select style={{...S.inp}} value={planForm.billing_cycle} onChange={e=>pf('billing_cycle',e.target.value)}>
                  <option value="forever">forever</option>
                  <option value="per month">per month</option>
                  <option value="per year">per year</option>
                  <option value="contact us">contact us</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Badge (optional)</label>
                <input style={S.inp} value={planForm.badge} onChange={e=>pf('badge',e.target.value)} placeholder="Most Popular"/>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={S.label}>CTA Button Label *</label>
              <input style={S.inp} value={planForm.cta_label} onChange={e=>pf('cta_label',e.target.value)} placeholder="Get started / Start free trial"/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={S.label}>QR Limit (0=∞)</label>
                <input style={S.inp} type="number" min="0" value={planForm.qr_limit} onChange={e=>pf('qr_limit',e.target.value)}/>
              </div>
              <div>
                <label style={S.label}>Link Limit (0=∞)</label>
                <input style={S.inp} type="number" min="0" value={planForm.link_limit} onChange={e=>pf('link_limit',e.target.value)}/>
              </div>
              <div>
                <label style={S.label}>API Limit (0=∞)</label>
                <input style={S.inp} type="number" min="0" value={planForm.api_limit} onChange={e=>pf('api_limit',e.target.value)}/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={S.label}>Sort Order</label>
                <input style={S.inp} type="number" min="0" value={planForm.sort_order} onChange={e=>pf('sort_order',e.target.value)}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
                <input type="checkbox" id="featured" checked={planForm.is_featured} onChange={e=>pf('is_featured',e.target.checked)} style={{width:16,height:16,cursor:'pointer'}}/>
                <label htmlFor="featured" style={{...S.label,margin:0,cursor:'pointer'}}>Featured plan</label>
              </div>
            </div>

            <div style={{marginBottom:24}}>
              <label style={S.label}>Features (one per line)</label>
              <textarea
                style={{...S.inp, minHeight:100, resize:'vertical' as const}}
                value={planForm.features}
                onChange={e=>pf('features',e.target.value)}
                placeholder={"100 QR codes / month\n5 payment links\nBasic analytics\nEmail support"}
              />
              <div style={{fontSize:11,color:'#4b5563',marginTop:4}}>Each line becomes a feature bullet on the pricing card.</div>
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setPlanModal(null)} style={{flex:1,background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 0',color:'#64748b',cursor:'pointer',fontSize:14}}>
                Cancel
              </button>
              <button onClick={savePlan} disabled={planSaving} style={{flex:2,background:'linear-gradient(135deg,#00e5b0,#0ea5e9)',border:'none',borderRadius:10,padding:'11px 0',color:'#07090f',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <Check size={15}/>{planSaving?'Saving...':planModal==='new'?'Create Plan':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXTEND MODAL ── */}
      {extendModal && (
        <div style={S.overlay}>
          <div style={{...S.modal,maxHeight:'unset',width:400}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,marginBottom:6}}>Extend Subscription</h2>
            <p style={{color:'#64748b',fontSize:13,marginBottom:20}}>{extendModal.name}</p>
            <label style={S.label}>Days to extend</label>
            <input type="number" min={1} value={extendDays} onChange={e=>setExtendDays(parseInt(e.target.value)||1)} style={{...S.inp,marginBottom:20}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setExtendModal(null)} style={{flex:1,background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 0',color:'#64748b',cursor:'pointer',fontSize:14}}>Cancel</button>
              <button onClick={extendSub} style={{flex:2,background:'linear-gradient(135deg,#00e5b0,#0ea5e9)',border:'none',borderRadius:10,padding:'10px 0',color:'#07090f',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,cursor:'pointer'}}>Extend {extendDays} days</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectModal && (
        <div style={S.overlay}>
          <div style={{...S.modal,maxHeight:'unset',width:400}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,marginBottom:6}}>Reject KYC</h2>
            <p style={{color:'#64748b',fontSize:13,marginBottom:20}}>{rejectModal.business_name}</p>
            <label style={S.label}>Rejection Reason</label>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)}
              style={{...S.inp,minHeight:80,resize:'vertical' as const,marginBottom:20}}
              placeholder="Reason for rejection..."/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setRejectModal(null)} style={{flex:1,background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 0',color:'#64748b',cursor:'pointer',fontSize:14}}>Cancel</button>
              <button onClick={()=>reviewKYC(rejectModal.merchant_id,'rejected',rejectReason)} style={{flex:2,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 0',color:'#ef4444',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,cursor:'pointer'}}>Reject KYC</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}