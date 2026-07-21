'use client';
import { useState, useEffect } from 'react';

const getToken = () => localStorage.getItem('upay_access_token') || '';
const api = (path: string, opts?: RequestInit) =>
  fetch(`/api/v1${path}`, { ...opts, headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(opts?.headers || {}) } }).then(r => r.json());

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProfitPage() {
  const [summary, setSummary]         = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statements, setStatements]   = useState<any[]>([]);
  const [suppliers, setSuppliers]     = useState<any[]>([]);
  const [period, setPeriod]           = useState('month');
  const [tab, setTab]                 = useState<'overview'|'add'|'suppliers'|'statements'>('overview');
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState('');

  const [form, setForm] = useState({ product_name: '', supplier_name: 'smile', stock_price: '', selling_price: '', quantity: '1', smile_number: '', smile_multiplier: '', notes: '' });
  const [supForm, setSupForm] = useState({ supplier_name: 'smile', base_value: '', default_multiplier: '2', default_number: '1.37', is_active: true });

  const load = async () => {
    const [s, t, st, sup] = await Promise.all([
      api(`/dashboard/profit/summary?period=${period}`),
      api('/dashboard/profit/transactions?limit=20'),
      api('/dashboard/profit/statements'),
      api('/dashboard/profit/suppliers'),
    ]);
    if (s.success) setSummary(s.data);
    if (t.success) setTransactions(t.data || []);
    if (st.success) setStatements(st.data || []);
    if (sup.success) {
      setSuppliers(sup.data || []);
      const smile = (sup.data || []).find((s: any) => s.supplier_name === 'smile');
      if (smile) setSupForm({ supplier_name: 'smile', base_value: smile.base_value, default_multiplier: smile.default_multiplier, default_number: smile.default_number, is_active: smile.is_active });
    }
  };

  useEffect(() => { load(); }, [period]);

  const addTransaction = async () => {
    setLoading(true); setMsg('');
    const body: any = { ...form, selling_price: parseFloat(form.selling_price), quantity: parseInt(form.quantity) };
    if (form.supplier_name === 'smile') { if (form.smile_number) body.smile_number = parseFloat(form.smile_number); if (form.smile_multiplier) body.smile_multiplier = parseFloat(form.smile_multiplier); }
    else body.stock_price = parseFloat(form.stock_price);
    const r = await api('/dashboard/profit/transactions', { method: 'POST', body: JSON.stringify(body) });
    setLoading(false);
    if (r.success) { setMsg('Transaction added!'); setForm({ product_name: '', supplier_name: 'smile', stock_price: '', selling_price: '', quantity: '1', smile_number: '', smile_multiplier: '', notes: '' }); load(); }
    else setMsg('Error: ' + r.error);
  };

  const saveSupplier = async () => {
    setLoading(true); setMsg('');
    const r = await api('/dashboard/profit/suppliers', { method: 'POST', body: JSON.stringify({ ...supForm, base_value: parseFloat(supForm.base_value), default_multiplier: parseFloat(supForm.default_multiplier), default_number: parseFloat(supForm.default_number) }) });
    setLoading(false);
    if (r.success) { setMsg('Supplier config saved!'); load(); } else setMsg('Error: ' + r.error);
  };

  const generateStatement = async () => {
    setLoading(true); setMsg('');
    const r = await api(`/dashboard/profit/statements/generate?month=${new Date().toISOString().slice(0, 7)}`, { method: 'POST' });
    setLoading(false);
    if (r.success) { setMsg('Statement generated and emailed!'); load(); } else setMsg('Error: ' + r.error);
  };

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: 14, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: '#64748B', marginBottom: 6, fontWeight: 600 };
  const TABS = [['overview', 'Overview'], ['add', '+ Add Transaction'], ['suppliers', 'Suppliers'], ['statements', 'Statements']] as const;

  return (
    <div style={{ maxWidth: 1100, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        select option{background:#fff;color:#0F172A} input::placeholder,select::placeholder{color:#94A3B8} @keyframes spin{to{transform:rotate(360deg)}}
        .profit-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .profit-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .profit-supplier-item { display: grid; grid-template-columns: auto 1fr 1fr 1fr 1fr auto; gap: 16px; align-items: center; }
        @media (max-width: 700px) { .profit-form-grid { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .profit-supplier-item { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { .profit-supplier-item { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>Profit Tracker</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Track your reseller profits across suppliers</div>
        </div>
        <div className="profit-tabs">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)} style={{ padding: '8px 14px', borderRadius: 8, border: tab === key ? 'none' : '1px solid #E2E8F0', background: tab === key ? '#2563EB' : '#FFFFFF', color: tab === key ? '#fff' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5', border: `1px solid ${msg.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: msg.startsWith('Error') ? '#DC2626' : '#059669', marginBottom: 16 }}>{msg}</div>}

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['today','week','month'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '7px 14px', borderRadius: 7, border: period === p ? 'none' : '1px solid #E2E8F0', background: period === p ? '#EFF6FF' : '#FFFFFF', color: period === p ? '#2563EB' : '#94A3B8', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' as const, fontFamily: 'DM Sans, sans-serif' }}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Sales',   value: fmt(summary?.total_sales || 0),   color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Total Cost',    value: fmt(summary?.total_cost || 0),    color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Total Profit',  value: fmt(summary?.total_profit || 0),  color: (summary?.total_profit || 0) >= 0 ? '#059669' : '#DC2626', bg: (summary?.total_profit || 0) >= 0 ? '#ECFDF5' : '#FEF2F2' },
              { label: 'Transactions',  value: String(summary?.total_transactions || 0), color: '#7C3AED', bg: '#F5F3FF' },
            ].map(s => (
              <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Recent Transactions</div>
            {transactions.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' as const, color: '#94A3B8', fontSize: 14 }}>No transactions yet. Add your first transaction!</div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {['Product','Supplier','Stock Price','Selling Price','Qty','Profit','Date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t: any) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#0F172A' }}>{t.product_name}</td>
                        <td style={{ padding: '12px 16px' }}><span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{t.supplier_name}</span></td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B', fontFamily: 'monospace' }}>{fmt(t.stock_price)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#0F172A', fontFamily: 'monospace' }}>{fmt(t.selling_price)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>{t.quantity}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: t.profit >= 0 ? '#059669' : '#DC2626', fontFamily: 'monospace' }}>{fmt(t.profit)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#94A3B8' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'add' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Add Transaction</div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Product Name</label>
              <input style={inp} placeholder="e.g. Mobile Legends 100 Diamonds" value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Supplier</label>
              <select style={inp} value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}>
                <option value="smile">Smile.one (SOC Formula)</option>
                <option value="moogold">Moogold (Manual stock price)</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            {form.supplier_name === 'smile' ? (
              <div className="profit-form-grid">
                <div><label style={lbl}>Number (from Smile)</label><input style={inp} type="number" step="0.0001" placeholder="e.g. 1.37" value={form.smile_number} onChange={e => setForm(f => ({ ...f, smile_number: e.target.value }))} /></div>
                <div><label style={lbl}>Multiplier</label><input style={inp} type="number" step="0.0001" placeholder="e.g. 2" value={form.smile_multiplier} onChange={e => setForm(f => ({ ...f, smile_multiplier: e.target.value }))} /></div>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}><label style={lbl}>Stock Price (₹)</label><input style={inp} type="number" step="0.01" placeholder="Enter stock price" value={form.stock_price} onChange={e => setForm(f => ({ ...f, stock_price: e.target.value }))} /></div>
            )}
            <div className="profit-form-grid">
              <div><label style={lbl}>Selling Price (₹)</label><input style={inp} type="number" step="0.01" placeholder="Your selling price" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} /></div>
              <div><label style={lbl}>Quantity</label><input style={inp} type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            </div>
            {form.supplier_name === 'smile' && form.smile_number && form.smile_multiplier && (
              <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>SOC Formula Preview</div>
                <div style={{ fontSize: 14, color: '#2563EB', fontWeight: 600 }}>Stock Price = (Base Value × {form.smile_multiplier}) ÷ {form.smile_number}</div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}><label style={lbl}>Notes (optional)</label><input style={inp} placeholder="Any notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <button onClick={addTransaction} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#E2E8F0' : '#2563EB', border: 'none', borderRadius: 10, color: loading ? '#94A3B8' : '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Adding…' : 'Add Transaction'}
            </button>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Smile.one Configuration</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Set your Smile base value and default SOC parameters.</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Base Value (changeable anytime)</label><input style={inp} type="number" step="0.01" placeholder="e.g. 1680" value={supForm.base_value} onChange={e => setSupForm(f => ({ ...f, base_value: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div><label style={lbl}>Default Multiplier</label><input style={inp} type="number" step="0.0001" placeholder="e.g. 2" value={supForm.default_multiplier} onChange={e => setSupForm(f => ({ ...f, default_multiplier: e.target.value }))} /></div>
              <div><label style={lbl}>Default Number</label><input style={inp} type="number" step="0.0001" placeholder="e.g. 1.37" value={supForm.default_number} onChange={e => setSupForm(f => ({ ...f, default_number: e.target.value }))} /></div>
            </div>
            {supForm.base_value && supForm.default_multiplier && supForm.default_number && (
              <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>SOC Formula Preview</div>
                <div style={{ fontSize: 14, color: '#2563EB', fontWeight: 600 }}>
                  ({supForm.base_value} × {supForm.default_multiplier}) ÷ {supForm.default_number} = ₹{((parseFloat(supForm.base_value) * parseFloat(supForm.default_multiplier)) / parseFloat(supForm.default_number)).toFixed(2)}
                </div>
              </div>
            )}
            <button onClick={saveSupplier} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#E2E8F0' : '#2563EB', border: 'none', borderRadius: 10, color: loading ? '#94A3B8' : '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Saving…' : 'Save Configuration'}
            </button>
          </div>
          {suppliers.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 14, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Current Configs</div>
              {suppliers.map((s: any) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' as const }}>{s.supplier_name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Base: {s.base_value} · Multiplier: {s.default_multiplier} · Number: {s.default_number}</div>
                  </div>
                  <span style={{ background: s.is_active ? '#ECFDF5' : '#FEF2F2', color: s.is_active ? '#059669' : '#DC2626', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'statements' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>Monthly statements are auto-generated at end of month and emailed to you.</div>
            <button onClick={generateStatement} disabled={loading} style={{ padding: '9px 18px', background: '#2563EB', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Generating…' : 'Generate This Month'}
            </button>
          </div>
          {statements.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '32px', textAlign: 'center' as const, color: '#94A3B8', fontSize: 14 }}>No statements yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {statements.map((s: any) => (
                <div key={s.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 20px' }} className="profit-supplier-item">
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', minWidth: 100 }}>{new Date(s.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
                  <div><div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Sales</div><div style={{ fontSize: 14, fontWeight: 600, color: '#2563EB' }}>{fmt(s.total_sales)}</div></div>
                  <div><div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Cost</div><div style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>{fmt(s.total_cost)}</div></div>
                  <div><div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Profit</div><div style={{ fontSize: 14, fontWeight: 600, color: s.total_profit >= 0 ? '#059669' : '#DC2626' }}>{fmt(s.total_profit)}</div></div>
                  <div><div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Txns</div><div style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>{s.total_transactions}</div></div>
                  <span style={{ background: s.email_sent ? '#ECFDF5' : '#FFFBEB', color: s.email_sent ? '#059669' : '#D97706', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{s.email_sent ? 'Emailed' : 'Pending'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
