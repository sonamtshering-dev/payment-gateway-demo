'use client';
import { useState, useEffect } from 'react';
import { Link2, Copy, Check, Share2, MoreVertical, Search, TrendingUp, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Bell, Clock, ArrowUpRight } from 'lucide-react';

const fmt = (p: number) => `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
const fmtDate = (s: string) => {
  const d = new Date(s);
  return { date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) };
};

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: '#DCFCE7', color: '#16A34A', label: 'Active' },
  pending: { bg: '#FEF9C3', color: '#CA8A04', label: 'Pending' },
  failed:  { bg: '#FEE2E2', color: '#DC2626', label: 'Expired' },
  expired: { bg: '#F1F5F9', color: '#94A3B8', label: 'Inactive' },
};

const EXPIRY_OPTIONS = ['1 Hour', '24 Hours', '3 Days', '7 Days', '30 Days', 'No Expiry'];
const EXPIRY_HOURS: Record<string, number> = { '1 Hour': 1, '24 Hours': 24, '3 Days': 72, '7 Days': 168, '30 Days': 720, 'No Expiry': 8760 };

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#2563EB' : '#CBD5E1', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
}

export default function PaymentsPage() {
  const [form, setForm]             = useState({ amount: '', description: '', expiry: '24 Hours' });
  const [collectDetails, setCollect] = useState(true);
  const [sendNotif, setSendNotif]   = useState(true);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<any>(null);
  const [error, setError]           = useState('');
  const [copied, setCopied]         = useState('');
  const [links, setLinks]           = useState<any[]>([]);
  const [stats, setStats]           = useState<any>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const PER_PAGE = 5;

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') || '' : '';
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  const STATUS_TO_API: Record<string, string> = { Active: 'paid', Pending: 'pending', Expired: 'failed', Inactive: 'expired' };

  const loadLinks = (p = 1, sf = statusFilter) => {
    const apiStatus = STATUS_TO_API[sf] || '';
    const qs = new URLSearchParams({ limit: String(PER_PAGE), page: String(p), ...(apiStatus ? { status: apiStatus } : {}) });
    fetch(`/api/v1/dashboard/transactions?${qs}`, { headers: headers() })
      .then(r => r.json()).then(d => {
        if (d.success) {
          const items = d.data?.data || d.data?.transactions || d.data || [];
          setLinks(Array.isArray(items) ? items : []);
          const total = d.data?.total || d.data?.count || items.length;
          setTotalPages(Math.max(1, Math.ceil(total / PER_PAGE)));
        }
      }).catch(() => {});
  };

  useEffect(() => {
    loadLinks(1);
    fetch('/api/v1/dashboard/stats', { headers: headers() })
      .then(r => r.json()).then(d => { if (d.success) setStats(d.data); }).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch('/api/v1/dashboard/payments/create', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ amount: Math.round(Number(form.amount) * 100), currency: 'INR', order_id: `PL_${Date.now()}`, customer_reference: form.description || 'Payment', expires_in_hours: EXPIRY_HOURS[form.expiry] ?? 24, notify_on_paid: sendNotif, collect_customer_details: collectDetails }),
      });
      const d = await r.json();
      if (d.success) {
        setResult(d.data);
        setForm({ amount: '', description: '', expiry: '24 Hours' });
        loadLinks(1);
      } else {
        const msg = d.error || 'Failed';
        if (msg.includes('KYC_REQUIRED')) setError('Complete KYC verification first.');
        else if (msg.includes('SUBSCRIPTION_REQUIRED')) setError('Purchase a plan to start accepting payments.');
        else if (msg.includes('UPI_REQUIRED')) setError('Add a UPI ID in Connect Merchant first.');
        else setError(msg);
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  const payLink = (id: string) => typeof window !== 'undefined' ? `${window.location.origin}/pay/${id}` : `/pay/${id}`;
  const shortLink = (id: string) => `pay.novapay.in/PL_${id.slice(0, 6)}`;

  const filtered = links.filter(l => {
    const q = search.toLowerCase();
    return !q || (l.customer_reference || l.order_id || '').toLowerCase().includes(q);
  });

  const inp: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 9, padding: '10px 13px', color: '#0F172A', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .pl-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: flex-start; }
        .pl-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        @media (max-width: 1100px) { .pl-layout { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .pl-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .pl-stats { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: -0.3, marginBottom: 3 }}>Payment Links</div>
        <div style={{ fontSize: 13, color: '#64748B' }}>Create and share payment links to collect payments instantly</div>
      </div>

      {/* Stat cards */}
      <div className="pl-stats">
        {[
          { label: 'Total Payment Links', value: stats ? stats.total_transactions.toLocaleString('en-IN') : '—', sub: `+12.5% vs last 7 days`, icon: <Link2 size={20} color="#2563EB" />, bg: '#EFF6FF', trend: true },
          { label: 'Total Collected',     value: stats ? fmt(stats.total_volume) : '—', sub: '+18.2% vs last 7 days', icon: <span style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>₹</span>, bg: '#ECFDF5', trend: true },
          { label: 'Successful Payments', value: stats ? stats.successful_payments.toLocaleString('en-IN') : '—', sub: '+14.6% vs last 7 days', icon: <CheckCircle2 size={20} color="#059669" />, bg: '#ECFDF5', trend: true },
          { label: 'Failed Payments',     value: stats ? stats.failed_payments.toLocaleString('en-IN') : '—', sub: '-4.3% vs last 7 days', icon: <XCircle size={20} color="#DC2626" />, bg: '#FEF2F2', trend: false },
        ].map(s => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: s.trend ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center', gap: 3 }}>
                <TrendingUp size={11} /> {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="pl-layout">
        {/* Left: Create Form */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Create Payment Link</div>

          {/* Amount */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Amount (₹) <span style={{ color: '#DC2626' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>₹</span>
              <input style={{ ...inp, paddingLeft: 28 }} placeholder="Enter amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} type="number" min="1" />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Description <span style={{ color: '#DC2626' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <textarea
                style={{ ...inp, resize: 'none', height: 72, paddingBottom: 24, lineHeight: 1.5 }}
                placeholder="What is this payment for?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 100) }))}
              />
              <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: '#94A3B8' }}>{form.description.length}/100</span>
            </div>
          </div>

          {/* Expiry */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Expiry Time</label>
            <div style={{ position: 'relative' }}>
              <Clock size={14} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={form.expiry}
                onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))}
                style={{ ...inp, paddingLeft: 32, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
              >
                {EXPIRY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8', fontSize: 10 }}>▼</span>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 11, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="2" stroke="#2563EB" strokeWidth="1.4"/><path d="M1 5h12" stroke="#2563EB" strokeWidth="1.4"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Collect Customer Details</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Ask payer for name, email and phone</div>
                </div>
              </div>
              <Toggle on={collectDetails} onChange={() => setCollect(v => !v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bell size={14} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Send Payment Notification</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Get notified when payment is received</div>
                </div>
              </div>
              <Toggle on={sendNotif} onChange={() => setSendNotif(v => !v)} />
            </div>
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 14px', color: '#DC2626', fontSize: 12, marginBottom: 14 }}>{error}</div>}

          <button
            onClick={create}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#93C5FD' : '#2563EB', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generating…</>
            ) : (
              <><Link2 size={15} /> Create Payment Link</>
            )}
          </button>

          {/* Result */}
          {result && (
            <div style={{ marginTop: 16, background: '#fff', border: '1.5px solid #2563EB', borderRadius: 16, overflow: 'hidden' }}>
              {/* Success header */}
              <div style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', padding: '18px 20px', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <CheckCircle2 size={22} color="#fff" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Payment Link Created!</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Share with your customer to collect payment</div>
              </div>

              <div style={{ padding: '16px' }}>
                {/* Amount pill */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '5px 18px', fontSize: 18, fontWeight: 800, color: '#1E40AF', letterSpacing: -0.5 }}>
                    {form.amount ? `₹${Number(form.amount).toLocaleString('en-IN')}` : `₹${(result.amount / 100).toLocaleString('en-IN')}`}
                  </div>
                </div>

                {/* QR Code */}
                {result.qr_code_base64 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: 14, padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                      <img
                        src={result.qr_code_base64}
                        style={{ width: 140, height: 140, display: 'block', borderRadius: 6 }}
                        alt="Scan to pay"
                      />
                    </div>
                  </div>
                )}
                <div style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginBottom: 14 }}>Scan QR or share the link below</div>

                {/* Payment link URL */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Payment Link</div>
                  <div style={{ fontSize: 11.5, color: '#2563EB', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {payLink(result.payment_id)}
                  </div>
                </div>

                {/* Primary action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => copy(payLink(result.payment_id), 'link')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: copied === 'link' ? '#059669' : '#2563EB', border: 'none', borderRadius: 9, padding: '10px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s' }}
                  >
                    {copied === 'link' ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
                  </button>
                  <button
                    onClick={() => {
                      const link = payLink(result.payment_id);
                      const amt = form.amount ? `₹${Number(form.amount).toLocaleString('en-IN')}` : `₹${(result.amount / 100).toLocaleString('en-IN')}`;
                      const msg = `Pay ${amt} via NovaPay: ${link}`;
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({ title: `Payment Request — ${amt}`, text: msg, url: link }).catch(() => {});
                      } else {
                        copy(link, 'link');
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 9, padding: '10px 0', color: '#0F172A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <Share2 size={13} /> Share
                  </button>
                </div>

                {/* Share via apps */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>Share via</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      {
                        label: 'WhatsApp',
                        color: '#25D366',
                        bg: '#F0FDF4',
                        border: '#BBF7D0',
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        ),
                        href: (link: string, msg: string) => `https://wa.me/?text=${encodeURIComponent(msg)}`,
                      },
                      {
                        label: 'Telegram',
                        color: '#2AABEE',
                        bg: '#EFF9FF',
                        border: '#BAE6FD',
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#2AABEE"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        ),
                        href: (link: string, msg: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Pay ${form.amount ? `₹${Number(form.amount).toLocaleString('en-IN')}` : ''} via NovaPay`)}`,
                      },
                      {
                        label: 'Email',
                        color: '#EA4335',
                        bg: '#FEF2F2',
                        border: '#FECACA',
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA4335" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                        ),
                        href: (link: string) => {
                          const amt = form.amount ? `₹${Number(form.amount).toLocaleString('en-IN')}` : '';
                          const sub = `Payment Request${amt ? ` — ${amt}` : ''}`;
                          const body = `Hi,\n\nYou have a payment request${amt ? ` for ${amt}` : ''}.\n\nPay here: ${link}\n\nPowered by NovaPay`;
                          return `mailto:?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
                        },
                      },
                      {
                        label: 'SMS',
                        color: '#7C3AED',
                        bg: '#F5F3FF',
                        border: '#DDD6FE',
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        ),
                        href: (link: string, msg: string) => `sms:?body=${encodeURIComponent(msg)}`,
                      },
                    ].map(app => {
                      const link = payLink(result.payment_id);
                      const amt = form.amount ? `₹${Number(form.amount).toLocaleString('en-IN')}` : `₹${(result.amount / 100).toLocaleString('en-IN')}`;
                      const msg = `Pay ${amt} via NovaPay: ${link}`;
                      return (
                        <a
                          key={app.label}
                          href={app.href(link, msg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: app.bg, border: `1px solid ${app.border}`, borderRadius: 10, padding: '10px 4px', textDecoration: 'none', cursor: 'pointer' }}
                        >
                          {app.icon}
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans, sans-serif' }}>{app.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Open page + UPI row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                  <button
                    onClick={() => window.open(payLink(result.payment_id), '_blank')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 9, padding: '9px 0', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <ArrowUpRight size={13} /> Open Page
                  </button>
                  {result.upi_intent_link && (
                    <button
                      onClick={() => copy(result.upi_intent_link, 'upi')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 9, padding: '9px 0', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {copied === 'upi' ? <><Check size={13} color="#059669" /> Copied!</> : <><Copy size={13} /> UPI Link</>}
                    </button>
                  )}
                </div>

                {/* Create new link */}
                <button
                  onClick={() => setResult(null)}
                  style={{ width: '100%', marginTop: 4, background: 'none', border: 'none', fontSize: 12, color: '#94A3B8', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: '4px 0' }}
                >
                  + Create another link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Payment Links Table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Your Payment Links</div>
            <button style={{ background: 'none', border: 'none', fontSize: 13, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Search + filter */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 12, color: '#0F172A', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', background: '#F8FAFC' }}
                placeholder="Search payment links..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); loadLinks(1, e.target.value); }}
              style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0F172A', outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#F8FAFC', cursor: 'pointer' }}
            >
              {['All Status', 'Active', 'Pending', 'Expired', 'Inactive'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Description', 'Amount', 'Created On', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      {links.length === 0 ? 'No payment links yet. Create your first one!' : 'No links match your search.'}
                    </td>
                  </tr>
                ) : filtered.map((l: any) => {
                  const s = STATUS_MAP[l.status] || STATUS_MAP.pending;
                  const { date, time } = fmtDate(l.created_at);
                  const link = payLink(l.id || l.payment_id);
                  const short = shortLink(l.id || l.payment_id || '');
                  return (
                    <tr key={l.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Link2 size={13} color="#2563EB" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{l.customer_reference || l.order_id || 'Payment'}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{short}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {fmt(l.amount)}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, color: '#0F172A' }}>{date}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{time}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => copy(link, l.id)}
                            title="Copy link"
                            style={{ width: 28, height: 28, borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            {copied === l.id ? <Check size={12} color="#059669" /> : <Copy size={12} color="#64748B" />}
                          </button>
                          <button
                            onClick={() => window.open(link, '_blank')}
                            title="Open link"
                            style={{ width: 28, height: 28, borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Share2 size={12} color="#64748B" />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setActionMenu(actionMenu === l.id ? null : l.id)}
                              style={{ width: 28, height: 28, borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <MoreVertical size={12} color="#64748B" />
                            </button>
                            {actionMenu === l.id && (
                              <div style={{ position: 'absolute', right: 0, top: 32, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 10, minWidth: 140, overflow: 'hidden' }}>
                                {[['View Page', () => window.open(link, '_blank')], ['Copy Link', () => copy(link, l.id)]].map(([label, action]: any) => (
                                  <button key={label} onClick={() => { action(); setActionMenu(null); }} style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                  >{label}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>Showing {filtered.length} of {links.length} links</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button onClick={() => { if (page > 1) { setPage(p => p - 1); loadLinks(page - 1); } }} disabled={page <= 1} style={{ width: 30, height: 30, borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.5 : 1 }}>
                <ChevronLeft size={14} color="#64748B" />
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => { setPage(n); loadLinks(n); }} style={{ width: 30, height: 30, borderRadius: 7, background: page === n ? '#2563EB' : '#F8FAFC', border: `1px solid ${page === n ? '#2563EB' : '#E2E8F0'}`, fontSize: 12, color: page === n ? '#fff' : '#0F172A', cursor: 'pointer', fontWeight: page === n ? 700 : 400, fontFamily: 'DM Sans, sans-serif' }}>{n}</button>
              ))}
              <button onClick={() => { if (page < totalPages) { setPage(p => p + 1); loadLinks(page + 1); } }} disabled={page >= totalPages} style={{ width: 30, height: 30, borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page >= totalPages ? 0.5 : 1 }}>
                <ChevronRight size={14} color="#64748B" />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Close action menu on outside click */}
      {actionMenu && <div onClick={() => setActionMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />}
    </div>
  );
}
