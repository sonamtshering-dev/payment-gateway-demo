'use client';
import { useState, useEffect } from 'react';
import { useEffect as _ue } from 'react';

const getToken = () => localStorage.getItem('upay_access_token') || '';
const api = (path: string, opts?: RequestInit) =>
  fetch(`/api/v1${path}`, { ...opts, headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(opts?.headers || {}) } }).then(r => r.json());

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProfitPage() {

  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [period, setPeriod] = useState('month');
  const [tab, setTab] = useState<'overview'|'add'|'suppliers'|'statements'>('overview');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Add transaction form
  const [form, setForm] = useState({ product_name: '', supplier_name: 'smile', stock_price: '', selling_price: '', quantity: '1', smile_number: '', smile_multiplier: '', notes: '' });

  // Supplier config form
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
    if (form.supplier_name === 'smile') {
      if (form.smile_number) body.smile_number = parseFloat(form.smile_number);
      if (form.smile_multiplier) body.smile_multiplier = parseFloat(form.smile_multiplier);
    } else {
      body.stock_price = parseFloat(form.stock_price);
    }
    const r = await api('/dashboard/profit/transactions', { method: 'POST', body: JSON.stringify(body) });
    setLoading(false);
    if (r.success) { setMsg('Transaction added!'); setForm({ product_name: '', supplier_name: 'smile', stock_price: '', selling_price: '', quantity: '1', smile_number: '', smile_multiplier: '', notes: '' }); load(); }
    else setMsg('Error: ' + r.error);
  };

  const saveSupplier = async () => {
    setLoading(true); setMsg('');
    const r = await api('/dashboard/profit/suppliers', { method: 'POST', body: JSON.stringify({ ...supForm, base_value: parseFloat(supForm.base_value), default_multiplier: parseFloat(supForm.default_multiplier), default_number: parseFloat(supForm.default_number) }) });
    setLoading(false);
    if (r.success) { setMsg('Supplier config saved!'); load(); }
    else setMsg('Error: ' + r.error);
  };

  const generateStatement = async () => {
    setLoading(true); setMsg('');
    const month = new Date().toISOString().slice(0, 7);
    const r = await api(`/dashboard/profit/statements/generate?month=${month}`, { method: 'POST' });
    setLoading(false);
    if (r.success) { setMsg('Statement generated and emailed!'); load(); }
    else setMsg('Error: ' + r.error);
  };

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, fontWeight: 500 };

  return (
    <div style={{ padding: '24px', fontFamily: "-apple-system,'SF Pro Display',sans-serif", color: '#e2e8f0' }}>
      <style>{`input::placeholder,select::placeholder{color:rgba(255,255,255,0.2)} select option{background:#0d1426;color:#e2e8f0}`}</style>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5, margin: 0 }}>Profit Tracker</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Track your reseller profits across suppliers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['overview','add','suppliers','statements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: 7, border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.1)', background: tab === t ? '#2563eb' : 'transparent', color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t === 'add' ? '+ Add Transaction' : t === 'overview' ? 'Overview' : t === 'suppliers' ? 'Suppliers' : 'Statements'}</button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: msg.startsWith('Error') ? '#f87171' : '#4ade80', marginBottom: 16 }}>{msg}</div>}

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['today','week','month'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 14px', borderRadius: 6, border: period === p ? 'none' : '1px solid rgba(255,255,255,0.08)', background: period === p ? 'rgba(37,99,235,0.2)' : 'transparent', color: period === p ? '#60a5fa' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Sales', value: fmt(summary?.total_sales || 0), color: '#3b82f6' },
              { label: 'Total Cost', value: fmt(summary?.total_cost || 0), color: '#f87171' },
              { label: 'Total Profit', value: fmt(summary?.total_profit || 0), color: (summary?.total_profit || 0) >= 0 ? '#4ade80' : '#f87171' },
              { label: 'Transactions', value: summary?.total_transactions || 0, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Recent Transactions</div>
            {transactions.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>No transactions yet. Add your first transaction!</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Product','Supplier','Stock Price','Selling Price','Qty','Profit','Date'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t: any) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0' }}>{t.product_name}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>{t.supplier_name}</span></td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{fmt(t.stock_price)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0' }}>{fmt(t.selling_price)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t.quantity}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: t.profit >= 0 ? '#4ade80' : '#f87171' }}>{fmt(t.profit)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ADD TRANSACTION */}
      {tab === 'add' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Product Name</label>
              <input style={inp} placeholder="e.g. Mobile Legends 100 Diamonds" value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Supplier</label>
              <select style={{ ...inp }} value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}>
                <option value="smile">Smile.one (SOC Formula)</option>
                <option value="moogold">Moogold (Manual stock price)</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            {form.supplier_name === 'smile' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={lbl}>Number (from Smile)</label>
                  <input style={inp} type="number" step="0.0001" placeholder="e.g. 1.37" value={form.smile_number} onChange={e => setForm(f => ({ ...f, smile_number: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Multiplier</label>
                  <input style={inp} type="number" step="0.0001" placeholder="e.g. 2" value={form.smile_multiplier} onChange={e => setForm(f => ({ ...f, smile_multiplier: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Stock Price (₹)</label>
                <input style={inp} type="number" step="0.01" placeholder="Enter stock price" value={form.stock_price} onChange={e => setForm(f => ({ ...f, stock_price: e.target.value }))} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={lbl}>Selling Price (₹)</label>
                <input style={inp} type="number" step="0.01" placeholder="Your selling price" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Quantity</label>
                <input style={inp} type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
            </div>
            {form.supplier_name === 'smile' && form.smile_number && form.smile_multiplier && (
              <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>SOC Formula Preview</div>
                <div style={{ fontSize: 14, color: '#60a5fa', fontWeight: 600 }}>
                  Stock Price = (Base Value × {form.smile_multiplier}) ÷ {form.smile_number}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes (optional)</label>
              <input style={inp} placeholder="Any notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={addTransaction} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? 'rgba(255,255,255,0.06)' : '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </div>
      )}

      {/* SUPPLIERS */}
      {tab === 'suppliers' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Smile.one Configuration</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Set your Smile base value and default SOC parameters. These are used to auto-calculate stock price.</div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Base Value (changeable anytime)</label>
              <input style={inp} type="number" step="0.01" placeholder="e.g. 1680" value={supForm.base_value} onChange={e => setSupForm(f => ({ ...f, base_value: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Default Multiplier</label>
                <input style={inp} type="number" step="0.0001" placeholder="e.g. 2" value={supForm.default_multiplier} onChange={e => setSupForm(f => ({ ...f, default_multiplier: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Default Number</label>
                <input style={inp} type="number" step="0.0001" placeholder="e.g. 1.37" value={supForm.default_number} onChange={e => setSupForm(f => ({ ...f, default_number: e.target.value }))} />
              </div>
            </div>
            {supForm.base_value && supForm.default_multiplier && supForm.default_number && (
              <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>SOC Formula Preview</div>
                <div style={{ fontSize: 14, color: '#60a5fa', fontWeight: 600 }}>
                  ({supForm.base_value} × {supForm.default_multiplier}) ÷ {supForm.default_number} = ₹{((parseFloat(supForm.base_value) * parseFloat(supForm.default_multiplier)) / parseFloat(supForm.default_number)).toFixed(2)}
                </div>
              </div>
            )}
            <button onClick={saveSupplier} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? 'rgba(255,255,255,0.06)' : '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
          {suppliers.length > 0 && (
            <div style={{ marginTop: 16, background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Configs</div>
              {suppliers.map((s: any) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', textTransform: 'capitalize' }}>{s.supplier_name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Base: {s.base_value} · Multiplier: {s.default_multiplier} · Number: {s.default_number}</div>
                  </div>
                  <span style={{ background: s.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: s.is_active ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATEMENTS */}
      {tab === 'statements' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Monthly statements are auto-generated at end of month and emailed to you.</div>
            <button onClick={generateStatement} disabled={loading} style={{ padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Generating...' : 'Generate This Month'}
            </button>
          </div>
          {statements.length === 0 ? (
            <div style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>No statements yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {statements.map((s: any) => (
                <div key={s.id} style={{ background: '#0d1426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', minWidth: 100 }}>{new Date(s.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
                  <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Sales</div><div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>{fmt(s.total_sales)}</div></div>
                  <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Cost</div><div style={{ fontSize: 14, fontWeight: 600, color: '#f87171' }}>{fmt(s.total_cost)}</div></div>
                  <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Profit</div><div style={{ fontSize: 14, fontWeight: 600, color: s.total_profit >= 0 ? '#4ade80' : '#f87171' }}>{fmt(s.total_profit)}</div></div>
                  <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Txns</div><div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>{s.total_transactions}</div></div>
                  <span style={{ background: s.email_sent ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: s.email_sent ? '#4ade80' : '#fbbf24', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>{s.email_sent ? 'Emailed' : 'Pending'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
