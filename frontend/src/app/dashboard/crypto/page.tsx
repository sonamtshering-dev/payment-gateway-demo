'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';

const API = '/api/v1/dashboard/crypto';

interface CryptoConfig {
  usdt_enabled: boolean;
  pricing_mode: string;
  fixed_rate: number;
  adjustment_pct: number;
  required_confirmations: number;
  payment_timeout_min: number;
  auto_verify: boolean;
}

interface Wallet {
  id: string;
  network: string;
  address: string;
  is_active: boolean;
}

interface NetworkOption {
  id: string;
  label: string;
  min_confirmations: number;
}

function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('upay_access_token');
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options?.headers || {}),
    },
  });
}

const NETWORK_META: Record<string, { name: string; chain: string; placeholder: string }> = {
  trc20: { name: 'USDT · TRC20', chain: 'Tron network', placeholder: 'T… (34 characters)' },
  bep20: { name: 'USDT · BEP20', chain: 'BNB Smart Chain', placeholder: '0x… (42 characters)' },
  erc20: { name: 'USDT · ERC20', chain: 'Ethereum network', placeholder: '0x… (42 characters)' },
};

export default function CryptoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const [cfg, setCfg] = useState<CryptoConfig>({
    usdt_enabled: false, pricing_mode: 'live', fixed_rate: 0, adjustment_pct: 0,
    required_confirmations: 1, payment_timeout_min: 30, auto_verify: false,
  });
  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [addresses, setAddresses] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(API);
      const d = await r.json();
      if (d.success) {
        if (d.data.config) setCfg(d.data.config);
        setNetworks(d.data.networks || []);
        const addrMap: Record<string, string> = {};
        (d.data.wallets || []).forEach((w: Wallet) => { addrMap[w.network] = w.address; });
        setAddresses(addrMap);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setSaved(false); setErr('');
    try {
      // Save config
      const rc = await apiFetch(`${API}/config`, { method: 'PUT', body: JSON.stringify(cfg) });
      const dc = await rc.json();
      if (!dc.success) { setErr(dc.error || 'Failed to save settings'); setSaving(false); return; }

      // Save each non-empty wallet
      for (const net of networks) {
        const addr = (addresses[net.id] || '').trim();
        if (addr) {
          const rw = await apiFetch(`${API}/wallet`, { method: 'POST', body: JSON.stringify({ network: net.id, address: addr }) });
          const dw = await rw.json();
          if (!dw.success) { setErr(dw.error || `Invalid ${net.id.toUpperCase()} address`); setSaving(false); return; }
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'cr-spin .7s linear infinite' }} />
      <style>{`@keyframes cr-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const modes = [
    { id: 'live', title: 'Live market rate', desc: 'Fetch the current USDT→INR rate automatically for each order.' },
    { id: 'fixed', title: 'Fixed rate', desc: 'Always use a rate you set (e.g. 1 USDT = ₹90).' },
    { id: 'live_adjustment', title: 'Live rate + adjustment', desc: 'Live rate with a margin applied (e.g. +3%).' },
  ];

  return (
    <div style={{ maxWidth: 700, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes cr-spin { to { transform: rotate(360deg); } }
        @keyframes cr-fade { from { opacity:0; transform:translateY(6px);} to {opacity:1;transform:none;} }
        .cr-card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; margin-bottom:16px; }
        .cr-input { width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:9px; font-size:13px; font-family:inherit; color:#0F172A; outline:none; transition:border .15s; }
        .cr-input:focus { border-color:#2563EB; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, #26A17B 0%, #1e8c68 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(38,161,123,.3)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 9h8M9.5 15h5"/></svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-.03em' }}>Crypto Payments</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 2 }}>Accept USDT directly to your own wallet. NovaPay only verifies the transaction.</p>
        </div>
      </div>

      {/* Enable */}
      <div className="cr-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Enable USDT payments</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Customers can pay in USDT on your checkout page.</div>
        </div>
        <div onClick={() => setCfg(c => ({ ...c, usdt_enabled: !c.usdt_enabled }))}
          style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', background: cfg.usdt_enabled ? '#26A17B' : '#CBD5E1', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: cfg.usdt_enabled ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.18)' }} />
        </div>
      </div>

      {/* Non-custodial notice */}
      <div className="cr-card" style={{ padding: '14px 18px', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        <div style={{ fontSize: 12.5, color: '#065F46', lineHeight: 1.6 }}>
          Funds go <strong>directly to your wallet</strong> — NovaPay never holds your crypto. You are responsible for the wallet addresses you enter below and for any tax/compliance obligations on funds you receive.
        </div>
      </div>

      {/* Pricing mode */}
      <div className="cr-card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Pricing</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modes.map(m => (
            <div key={m.id} onClick={() => setCfg(c => ({ ...c, pricing_mode: m.id }))}
              style={{ display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 11, cursor: 'pointer', border: `1.5px solid ${cfg.pricing_mode === m.id ? '#26A17B' : '#E2E8F0'}`, background: cfg.pricing_mode === m.id ? '#F0FDF9' : '#fff', transition: 'all .15s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: `2px solid ${cfg.pricing_mode === m.id ? '#26A17B' : '#CBD5E1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cfg.pricing_mode === m.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#26A17B' }} />}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{m.title}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {cfg.pricing_mode === 'fixed' && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Fixed rate — INR per 1 USDT</label>
            <input className="cr-input" type="number" step="0.01" value={cfg.fixed_rate || ''} placeholder="90.00"
              onChange={e => setCfg(c => ({ ...c, fixed_rate: parseFloat(e.target.value) || 0 }))} />
          </div>
        )}
        {cfg.pricing_mode === 'live_adjustment' && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Adjustment (%) applied to live rate</label>
            <input className="cr-input" type="number" step="0.1" value={cfg.adjustment_pct || ''} placeholder="3"
              onChange={e => setCfg(c => ({ ...c, adjustment_pct: parseFloat(e.target.value) || 0 }))} />
          </div>
        )}
      </div>

      {/* Wallets */}
      <div className="cr-card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Wallet addresses</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Enter one wallet per network. Only networks with an address will be offered at checkout.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {networks.map(net => {
            const meta = NETWORK_META[net.id];
            return (
              <div key={net.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{meta?.name}</label>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{meta?.chain} · {net.min_confirmations} conf. min</span>
                </div>
                <input className="cr-input" style={{ fontFamily: 'monospace', fontSize: 12 }} value={addresses[net.id] || ''} placeholder={meta?.placeholder}
                  onChange={e => setAddresses(a => ({ ...a, [net.id]: e.target.value }))} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced */}
      <div className="cr-card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Advanced</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Min. confirmations</label>
            <input className="cr-input" type="number" min={1} value={cfg.required_confirmations}
              onChange={e => setCfg(c => ({ ...c, required_confirmations: parseInt(e.target.value) || 1 }))} />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>A safe per-network minimum is always enforced.</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Payment timeout (min)</label>
            <input className="cr-input" type="number" min={5} max={180} value={cfg.payment_timeout_min}
              onChange={e => setCfg(c => ({ ...c, payment_timeout_min: parseInt(e.target.value) || 30 }))} />
          </div>
        </div>
      </div>

      {err && (
        <div style={{ padding: '10px 14px', borderRadius: 9, fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 12, animation: 'cr-fade .2s ease' }}>{err}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <button onClick={save} disabled={saving}
          style={{ padding: '11px 30px', fontSize: 13.5, fontWeight: 700, borderRadius: 10, border: 'none', background: saving ? '#93C5FD' : '#26A17B', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 5, animation: 'cr-fade .2s ease' }}><CheckCircle2 size={14} /> Saved</span>}
      </div>
    </div>
  );
}
