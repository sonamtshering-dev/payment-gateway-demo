'use client';
import { useState, useRef, useEffect } from 'react';
import { Palette, RotateCcw, Download, Smartphone, Printer, Upload, Check, Wrench } from 'lucide-react';

const TABS = ['Brand Profile', 'QR Customization', 'Payment Page', 'Email Template'];

const QR_STYLES = [
  { id: 'squares',   label: 'Classic' },
  { id: 'dots',      label: 'Rounded' },
  { id: 'circular',  label: 'Circular' },
  { id: 'pixelated', label: 'Pixel' },
];

const CORNER_STYLES = ['Square', 'Rounded', 'Extra Rounded'];
const QR_PATTERNS   = ['Standard', 'Mosaic', 'Diamond', 'Star'];
const EYE_SHAPES    = ['Square', 'Circle', 'Leaf', 'Shield'];

function QRCodeSVG({
  primaryColor = '#0F172A',
  secondaryColor = '#7C3AED',
  bgColor = '#FFFFFF',
  qrStyle = 'squares',
  cornerStyle = 'Rounded',
  eyeShape = 'Square',
  qrPattern = 'Standard',
}: {
  primaryColor?: string; secondaryColor?: string; bgColor?: string;
  qrStyle?: string; cornerStyle?: string; eyeShape?: string; qrPattern?: string;
}) {
  const cells = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,0,1,0,1,1,0,1,0,1,1],
    [0,1,0,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0],
    [1,1,0,1,0,1,1,0,1,1,0,0,1,1,0,1,0,0,1],
    [0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,0,1],
  ];
  const cs = 10; // cell size — larger so style changes are clearly visible
  const pad = 6;
  const total = 19 * cs + pad * 2;

  const isFinderZone = (ri: number, ci: number) =>
    (ri <= 6 && ci <= 6) || (ri <= 6 && ci >= 12) || (ri >= 12 && ci <= 6);

  // Outer frame ring of each 7×7 finder
  const isFinderFrame = (ri: number, ci: number) => {
    const inTL = ri <= 6 && ci <= 6 && (ri === 0 || ri === 6 || ci === 0 || ci === 6);
    const inTR = ri <= 6 && ci >= 12 && (ri === 0 || ri === 6 || ci === 12 || ci === 18);
    const inBL = ri >= 12 && ci <= 6 && (ri === 12 || ri === 18 || ci === 0 || ci === 6);
    return inTL || inTR || inBL;
  };

  // Inner 3×3 eye of each finder
  const isFinderEye = (ri: number, ci: number) =>
    (ri >= 2 && ri <= 4 && ci >= 2 && ci <= 4) ||
    (ri >= 2 && ri <= 4 && ci >= 14 && ci <= 16) ||
    (ri >= 14 && ri <= 16 && ci >= 2 && ci <= 4);

  // rx values per style
  const dataRx = qrStyle === 'pixelated' ? 0 : qrStyle === 'dots' || qrStyle === 'circular' ? cs / 2 - 0.5 : 2;
  const frameRx = cornerStyle === 'Extra Rounded' ? cs / 2 - 0.5 : cornerStyle === 'Rounded' ? 3 : 0;
  const eyeRx   = eyeShape === 'Circle' ? cs / 2 - 0.5 : eyeShape === 'Leaf' ? 3 : eyeShape === 'Shield' ? 2 : 0.5;

  const renderCell = (ri: number, ci: number) => {
    const x = pad + ci * cs + 0.5;
    const y = pad + ri * cs + 0.5;
    const w = cs - 1;
    const isFrame = isFinderFrame(ri, ci);
    const isEye   = isFinderEye(ri, ci);
    const isData  = !isFinderZone(ri, ci);
    const rx = isEye ? eyeRx : isFrame ? frameRx : dataRx;

    // Pattern affects only data cells
    if (isData && qrPattern === 'Mosaic') {
      const fill = (ri + ci) % 2 === 0 ? primaryColor : secondaryColor;
      return <rect key={`${ri}-${ci}`} x={x} y={y} width={w} height={w} rx={rx} fill={fill} />;
    }
    if (isData && qrPattern === 'Diamond') {
      const cx = x + w / 2;
      const cy = y + w / 2;
      const half = w / 2 - 0.5;
      return <polygon key={`${ri}-${ci}`} points={`${cx},${cy-half} ${cx+half},${cy} ${cx},${cy+half} ${cx-half},${cy}`} fill={primaryColor} />;
    }
    if (isData && qrPattern === 'Star') {
      // Two overlapping rotated squares to make a star
      const cx = x + w / 2;
      const cy = y + w / 2;
      const r = w / 2 - 0.5;
      const r2 = r * 0.6;
      const pts1 = [0,90,180,270].map(a => { const rad = (a * Math.PI)/180; return `${cx + r*Math.sin(rad)},${cy - r*Math.cos(rad)}`; }).join(' ');
      const pts2 = [45,135,225,315].map(a => { const rad = (a * Math.PI)/180; return `${cx + r2*Math.sin(rad)},${cy - r2*Math.cos(rad)}`; }).join(' ');
      return (
        <g key={`${ri}-${ci}`}>
          <polygon points={pts1} fill={primaryColor} />
          <polygon points={pts2} fill={secondaryColor} />
        </g>
      );
    }

    return <rect key={`${ri}-${ci}`} x={x} y={y} width={w} height={w} rx={rx} fill={primaryColor} />;
  };

  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`} style={{ display: 'block' }}>
      <rect width={total} height={total} fill={bgColor} rx={4} />
      {cells.map((row, ri) => row.map((cell, ci) => cell ? renderCell(ri, ci) : null))}
    </svg>
  );
}

export default function BrandingPage() {
  const [activeTab, setActiveTab]           = useState('QR Customization');
  const [logo, setLogo]                     = useState<string | null>(null);
  const [businessName, setBusinessName]     = useState('NovaPay');
  const [tagline, setTagline]               = useState('Fast · Secure · Reliable');
  const [primaryColor, setPrimaryColor]     = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#7C3AED');
  const [bgColor, setBgColor]               = useState('#FFFFFF');
  const [qrStyle, setQrStyle]               = useState('squares');
  const [cornerStyle, setCornerStyle]       = useState('Rounded');
  const [qrPattern, setQrPattern]           = useState('Standard');
  const [eyeShape, setEyeShape]             = useState('Square');
  const [previewMode, setPreviewMode]       = useState<'mobile' | 'print'>('mobile');
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [loading, setLoading]               = useState(true);
  const [dragOver, setDragOver]             = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (!token) { setLoading(false); return; }
    fetch('/api/v1/dashboard/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.data) { setLogo(d.data.logo_url || null); setBusinessName(d.data.business_name || 'NovaPay'); } })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('upay_access_token');
    try {
      await fetch('/api/v1/dashboard/branding', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: businessName, tagline, primary_color: primaryColor, secondary_color: secondaryColor, qr_style: qrStyle }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    setPrimaryColor('#2563EB');
    setSecondaryColor('#7C3AED');
    setBgColor('#FFFFFF');
    setQrStyle('squares');
    setCornerStyle('Rounded');
    setQrPattern('Standard');
    setEyeShape('Square');
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { alert('File must be under 2MB'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { alert('Only PNG, JPG or WebP allowed'); return; }
    const reader = new FileReader();
    reader.onload = e => setLogo(e.target?.result as string);
    reader.readAsDataURL(file);
    const token = localStorage.getItem('upay_access_token');
    const fd = new FormData();
    fd.append('logo', file);
    await fetch('/api/v1/dashboard/logo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1px solid #E2E8F0', color: '#0F172A', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', background: '#FAFAFA' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 };
  const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '22px 24px', marginBottom: 16 };

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', cursor: 'pointer', border: 'none', padding: 0 }} />
        </div>
        <input style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.04em' }} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .br-layout { display: flex; gap: 24px; align-items: flex-start; }
        .br-main { flex: 1; min-width: 0; }
        .br-sidebar { width: 280px; flex-shrink: 0; }
        .br-tab { padding: 10px 20px 12px; border: none; background: transparent; cursor: pointer; font-family: DM Sans, sans-serif; font-size: 13px; font-weight: 600; border-bottom: 2px solid transparent; transition: all 0.18s; white-space: nowrap; flex-shrink: 0; }
        .qr-style-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .design-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .br-tabs { display: flex; border-bottom: 1.5px solid #E2E8F0; margin-bottom: 24px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .br-tabs::-webkit-scrollbar { display: none; }
        .logo-zone:hover { border-color: #93C5FD !important; background: #F0F7FF !important; }
        .logo-zone.drag-over { border-color: #2563EB !important; background: #EFF6FF !important; }
        @media (max-width: 1050px) { .br-layout { flex-direction: column; align-items: stretch; } .br-sidebar { width: 100%; } }
        @media (max-width: 640px) { .design-grid { grid-template-columns: 1fr; } .qr-style-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Palette size={18} color="#2563EB" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Branding &amp; QR</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Customize how your brand appears to customers</p>
          </div>
        </div>
        <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <RotateCcw size={13} /> Reset to Default
        </button>
      </div>

      {/* Tabs */}
      <div className="br-tabs">
        {TABS.map(tab => (
          <button key={tab} className="br-tab" onClick={() => setActiveTab(tab)}
            style={{ color: activeTab === tab ? '#2563EB' : '#64748B', borderBottomColor: activeTab === tab ? '#2563EB' : 'transparent' }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'QR Customization' ? (
        <div className="br-layout">
          <div className="br-main">

            {/* Section 1 — Brand Information */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: '#2563EB' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Brand Information</span>
              </div>

              {/* Logo upload zone */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Business Logo</label>
                <div
                  className={`logo-zone${dragOver ? ' drag-over' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadLogo(f); }}
                  style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', background: '#FAFAFA', transition: 'all 0.18s' }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {logo
                      ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <span style={{ fontSize: 22, fontWeight: 800, color: '#CBD5E1' }}>{businessName.charAt(0)}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                      {logo ? 'Click to change logo' : 'Click or drag to upload logo'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>PNG, JPG, WebP · Max 2 MB</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    <Upload size={12} /> Upload
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
                </div>
              </div>

              {/* Business name + tagline */}
              <div className="design-grid" style={{ marginBottom: 18 }}>
                <div>
                  <label style={lbl}>Business Name</label>
                  <input style={inp} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business name" />
                </div>
                <div>
                  <label style={lbl}>Tagline</label>
                  <input style={inp} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short tagline" />
                </div>
              </div>

              {/* Colors */}
              <div className="design-grid">
                <ColorPicker label="Primary Color" value={primaryColor} onChange={setPrimaryColor} />
                <ColorPicker label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} />
              </div>
            </div>

            {/* Section 2 — QR Design */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: '#2563EB' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>QR Design</span>
              </div>

              {/* QR Style */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>QR Style</label>
                <div className="qr-style-grid">
                  {QR_STYLES.map(s => {
                    const active = qrStyle === s.id;
                    return (
                      <button key={s.id} onClick={() => setQrStyle(s.id)}
                        style={{ padding: '10px 6px', borderRadius: 9, border: `1.5px solid ${active ? primaryColor : '#E2E8F0'}`, background: active ? `${primaryColor}12` : '#F8FAFC', color: active ? primaryColor : '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {active && <Check size={11} strokeWidth={3} />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="design-grid" style={{ marginBottom: 22 }}>
                <div>
                  <label style={lbl}>Corner Style</label>
                  <select value={cornerStyle} onChange={e => setCornerStyle(e.target.value)} style={{ ...inp }}>
                    {CORNER_STYLES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>QR Pattern</label>
                  <select value={qrPattern} onChange={e => setQrPattern(e.target.value)} style={{ ...inp }}>
                    {QR_PATTERNS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Eye Shape</label>
                  <select value={eyeShape} onChange={e => setEyeShape(e.target.value)} style={{ ...inp }}>
                    {EYE_SHAPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <ColorPicker label="Background Color" value={bgColor} onChange={setBgColor} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 24px', borderRadius: 10, border: 'none', background: saved ? '#059669' : saving ? '#93C5FD' : primaryColor, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', transition: 'background 0.25s' }}>
                  {saved && <Check size={14} strokeWidth={3} />}
                  {saving ? 'Saving…' : saved ? 'Changes Saved' : 'Save Changes'}
                </button>
                {saved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Your branding has been updated.</span>}
              </div>
            </div>
          </div>

          {/* Right sidebar — QR Preview */}
          <div className="br-sidebar">
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              {/* Preview header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Live Preview</span>
                <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
                  {([['mobile', Smartphone], ['print', Printer]] as const).map(([mode, Icon]) => (
                    <button key={mode} onClick={() => setPreviewMode(mode)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11, background: previewMode === mode ? '#FFFFFF' : 'transparent', color: previewMode === mode ? '#0F172A' : '#94A3B8', boxShadow: previewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize' }}>
                      <Icon size={12} /> {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR card */}
              <div style={{ padding: '20px 18px' }}>
                <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* Brand header */}
                  <div style={{ background: primaryColor, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {logo
                        ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{businessName.charAt(0)}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName || 'NovaPay'}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{tagline}</div>
                    </div>
                  </div>

                  {/* QR area */}
                  <div style={{ background: bgColor, padding: '22px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Scan to Pay</div>
                    <div style={{ padding: 12, background: '#FFFFFF', borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.1)', position: 'relative', border: '1px solid #F1F5F9' }}>
                      <QRCodeSVG primaryColor={primaryColor} secondaryColor={secondaryColor} bgColor={bgColor} qrStyle={qrStyle} cornerStyle={cornerStyle} eyeShape={eyeShape} qrPattern={qrPattern} />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: 7, border: '2.5px solid #fff', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                        {logo
                          ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{businessName.charAt(0)}</span>}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Any UPI app</div>
                  </div>

                  {/* UPI strip */}
                  <div style={{ padding: '10px 16px', background: '#FAFAFA', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {['BHIM', 'UPI', 'GPay', 'PhPe'].map(p => (
                      <div key={p} style={{ padding: '3px 8px', border: '1px solid #E2E8F0', borderRadius: 5, fontSize: 8, fontWeight: 700, color: '#64748B', background: '#FFFFFF', letterSpacing: '0.04em' }}>{p}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Download */}
              <div style={{ padding: '0 18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Download QR</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {['PNG', 'JPG', 'SVG', 'PDF'].map(fmt => (
                    <button key={fmt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 0', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <Download size={11} /> {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '64px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Wrench size={22} color="#94A3B8" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{activeTab}</div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>This section is in development and will be available soon.</div>
        </div>
      )}
    </div>
  );
}
