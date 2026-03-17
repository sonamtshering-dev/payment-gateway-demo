'use client';
import { useState, useRef, useEffect } from 'react';

export default function BrandingPage() {
  const [logo, setLogo] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('upay_access_token');
    if (!token) return;
    fetch('/api/v1/dashboard/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setLogo(d.data.logo_url || null);
          setBusinessName(d.data.business_name || d.data.name || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const uploadLogo = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be under 2MB');
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Only PNG, JPG or WebP allowed');
      return;
    }

    // Instant local preview
    const reader = new FileReader();
    reader.onload = e => setLogo(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploadState('uploading');
    const token = localStorage.getItem('upay_access_token');
    const form = new FormData();
    form.append('logo', file);

    try {
      const res = await fetch('/api/v1/dashboard/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      setUploadState(data.success ? 'success' : 'error');
    } catch {
      setUploadState('error');
    } finally {
      setTimeout(() => setUploadState('idle'), 2500);
    }
  };

  const removeLogo = async () => {
    const token = localStorage.getItem('upay_access_token');
    await fetch('/api/v1/dashboard/logo', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setLogo(null);
  };

  const saveBusinessName = async () => {
    if (!businessName.trim()) return;
    setSaving(true);
    const token = localStorage.getItem('upay_access_token');
    try {
      await fetch('/api/v1/dashboard/business-name', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_name: businessName.trim() }),
      });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .br-wrap { max-width: 560px; }
        .br-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; font-family: 'Space Grotesk', sans-serif; }
        .br-subtitle { font-size: 14px; color: rgba(255,255,255,0.38); margin-bottom: 28px; line-height: 1.6; }

        .br-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px; padding: 22px; margin-bottom: 16px;
        }
        .br-section-label {
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.30); margin-bottom: 6px; font-weight: 500;
        }
        .br-section-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .br-section-sub { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 18px; line-height: 1.5; }

        .br-input-row { display: flex; gap: 10px; }
        .br-input {
          flex: 1; padding: 11px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          color: #fff; font-size: 14px; outline: none;
          transition: border-color 0.2s; font-family: inherit;
        }
        .br-input:focus { border-color: rgba(59,130,246,0.45); }
        .br-input::placeholder { color: rgba(255,255,255,0.22); }

        .br-btn-primary {
          padding: 11px 22px; border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: none; color: #000; font-weight: 600; font-size: 13px;
          cursor: pointer; transition: opacity 0.2s; white-space: nowrap;
          font-family: inherit;
        }
        .br-btn-primary:hover { opacity: 0.82; }
        .br-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .br-btn-secondary {
          padding: 10px 18px; border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.65); font-size: 13px;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .br-btn-secondary:hover { background: rgba(255,255,255,0.10); color: #fff; }

        .br-btn-danger {
          padding: 10px 18px; border-radius: 12px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444; font-size: 13px;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .br-btn-danger:hover { background: rgba(239,68,68,0.15); }

        .br-logo-row { display: flex; align-items: center; gap: 18px; margin-bottom: 18px; }
        .br-logo-preview {
          width: 76px; height: 76px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0; position: relative;
        }
        .br-logo-preview img { width: 100%; height: 100%; object-fit: contain; }
        .br-logo-initials {
          font-size: 28px; font-weight: 700;
          color: rgba(255,255,255,0.45);
          font-family: 'Space Grotesk', sans-serif;
        }
        .br-logo-actions { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .br-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

        .br-drop {
          border: 1.5px dashed rgba(255,255,255,0.15);
          border-radius: 14px; padding: 22px 16px;
          text-align: center; cursor: pointer;
          transition: all 0.2s;
          background: rgba(255,255,255,0.02);
        }
        .br-drop.drag { border-color: #3b82f6; background: rgba(59,130,246,0.06); }
        .br-drop:hover { border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.04); }
        .br-drop-icon { font-size: 24px; margin-bottom: 6px; opacity: 0.4; }
        .br-drop-txt { font-size: 13px; color: rgba(255,255,255,0.42); }
        .br-drop-hint { font-size: 11px; color: rgba(255,255,255,0.20); margin-top: 4px; }

        .br-status {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 20px; font-size: 12px; font-weight: 500;
        }
        .br-status-success { background: rgba(59,130,246,0.12); color: #3b82f6; border: 1px solid rgba(59,130,246,0.22); }
        .br-status-error   { background: rgba(239,68,68,0.10); color: #ef4444; border: 1px solid rgba(239,68,68,0.22); }
        .br-status-loading { background: rgba(14,165,233,0.10); color: #1d4ed8; border: 1px solid rgba(14,165,233,0.22); }

        /* Live preview strip */
        .br-preview {
          margin-top: 20px; padding: 14px 16px;
          background: rgba(0,0,0,0.25);
          border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);
        }
        .br-preview-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.22); margin-bottom: 12px; font-weight: 500;
        }
        .br-preview-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 13px 14px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .br-preview-left { display: flex; align-items: center; gap: 10px; }
        .br-preview-logo {
          width: 38px; height: 38px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
          font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.65);
          font-family: 'Space Grotesk', sans-serif;
        }
        .br-preview-logo img { width: 100%; height: 100%; object-fit: contain; }
        .br-preview-name { font-size: 13px; font-weight: 600; color: #fff; font-family: 'Space Grotesk', sans-serif; }
        .br-preview-sub { font-size: 10px; color: rgba(255,255,255,0.30); margin-top: 2px; }
        .br-preview-badge {
          font-size: 10px; color: #3b82f6;
          background: rgba(59,130,246,0.10); border: 1px solid rgba(59,130,246,0.2);
          padding: 3px 8px; border-radius: 10px;
        }

        .br-qr-preview {
          display: flex; align-items: center; gap: 12px;
          margin-top: 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px; padding: 11px 13px;
        }
        .br-qr-mock {
          width: 54px; height: 54px; background: #fff;
          border-radius: 8px; position: relative;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .br-qr-logo {
          position: absolute; width: 18px; height: 18px;
          border-radius: 4px; border: 2px solid #fff;
          background: #fff; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          font-size: 7px; font-weight: 700; color: #030d1f;
          font-family: 'Space Grotesk', sans-serif;
        }
        .br-qr-logo img { width: 100%; height: 100%; object-fit: contain; }
        .br-qr-txt { font-size: 12px; color: rgba(255,255,255,0.38); line-height: 1.5; }
        .br-qr-txt strong { color: rgba(255,255,255,0.7); font-weight: 500; }

        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="br-wrap">
        <div className="br-title">Branding</div>
        <div className="br-subtitle">
          Your logo and business name appear on the payment checkout page that your customers see.
          Keep it recognisable — it builds trust and reduces drop-offs.
        </div>

        {/* Business name */}
        <div className="br-card">
          <div className="br-section-label">Display name</div>
          <div className="br-section-title">Business Name</div>
          <div className="br-section-sub">
            Shown to customers at the top of the checkout page instead of your account email.
          </div>
          <div className="br-input-row">
            <input
              className="br-input"
              placeholder="e.g. Sonam's Store"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveBusinessName()}
            />
            <button className="br-btn-primary" onClick={saveBusinessName} disabled={saving || !businessName.trim()}>
              {saving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Logo upload */}
        <div className="br-card">
          <div className="br-section-label">Checkout logo</div>
          <div className="br-section-title">Business Logo</div>
          <div className="br-section-sub">
            PNG, JPG or WebP · Max 2MB · Square image recommended (512 × 512 px).
            Stored securely and served on every checkout.
          </div>

          <div className="br-logo-row">
            <div className="br-logo-preview">
              {logo
                ? <img src={logo} alt="Your logo" />
                : <span className="br-logo-initials">{businessName.charAt(0).toUpperCase() || '?'}</span>
              }
            </div>
            <div className="br-logo-actions">
              <div className="br-btn-row">
                <button className="br-btn-secondary" onClick={() => fileRef.current?.click()}>
                  {logo ? 'Change Logo' : 'Upload Logo'}
                </button>
                {logo && (
                  <button className="br-btn-danger" onClick={removeLogo}>
                    Remove
                  </button>
                )}
              </div>
              {uploadState === 'uploading' && <span className="br-status br-status-loading">⏳ Uploading…</span>}
              {uploadState === 'success'   && <span className="br-status br-status-success">✓ Logo saved!</span>}
              {uploadState === 'error'     && <span className="br-status br-status-error">✗ Upload failed — try again</span>}
            </div>
          </div>

          {/* Drag & drop zone */}
          <div
            className={`br-drop ${drag ? 'drag' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) uploadLogo(f);
            }}
          >
            <div className="br-drop-icon">☁</div>
            <div className="br-drop-txt">Drag &amp; drop your logo here</div>
            <div className="br-drop-hint">PNG, JPG, WebP · max 2MB</div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) uploadLogo(f);
              e.target.value = '';
            }}
          />

          {/* Live preview */}
          <div className="br-preview">
            <div className="br-preview-label">Live preview — checkout header</div>

            <div className="br-preview-card">
              <div className="br-preview-left">
                <div className="br-preview-logo">
                  {logo
                    ? <img src={logo} alt="" />
                    : businessName.charAt(0).toUpperCase() || '?'
                  }
                </div>
                <div>
                  <div className="br-preview-name">{businessName || 'Your Business'}</div>
                  <div className="br-preview-sub">Secure · Verified merchant</div>
                </div>
              </div>
              <div className="br-preview-badge">✓ Live</div>
            </div>

            <div className="br-qr-preview">
              <div className="br-qr-mock">
                <svg width="50" height="50" viewBox="0 0 50 50">
                  <rect width="50" height="50" fill="white"/>
                  <rect x="4" y="4" width="16" height="16" rx="2" fill="#030d1f"/>
                  <rect x="7" y="7" width="10" height="10" rx="1" fill="white"/>
                  <rect x="8.5" y="8.5" width="7" height="7" fill="#030d1f"/>
                  <rect x="30" y="4" width="16" height="16" rx="2" fill="#030d1f"/>
                  <rect x="33" y="7" width="10" height="10" rx="1" fill="white"/>
                  <rect x="34.5" y="8.5" width="7" height="7" fill="#030d1f"/>
                  <rect x="4" y="30" width="16" height="16" rx="2" fill="#030d1f"/>
                  <rect x="7" y="33" width="10" height="10" rx="1" fill="white"/>
                  <rect x="8.5" y="34.5" width="7" height="7" fill="#030d1f"/>
                  <g fill="#030d1f" opacity="0.7">
                    <rect x="23" y="4" width="3" height="3" rx="0.5"/>
                    <rect x="27" y="4" width="3" height="3" rx="0.5"/>
                    <rect x="4" y="23" width="3" height="3" rx="0.5"/>
                    <rect x="8" y="23" width="3" height="3" rx="0.5"/>
                    <rect x="23" y="23" width="3" height="3" rx="0.5"/>
                    <rect x="30" y="23" width="3" height="3" rx="0.5"/>
                    <rect x="38" y="23" width="3" height="3" rx="0.5"/>
                    <rect x="23" y="30" width="3" height="3" rx="0.5"/>
                    <rect x="30" y="30" width="3" height="3" rx="0.5"/>
                    <rect x="38" y="38" width="3" height="3" rx="0.5"/>
                    <rect x="30" y="38" width="3" height="3" rx="0.5"/>
                  </g>
                </svg>
                <div className="br-qr-logo">
                  {logo
                    ? <img src={logo} alt="" />
                    : businessName.charAt(0).toUpperCase() || '?'
                  }
                </div>
              </div>
              <div className="br-qr-txt">
                Your logo appears <strong>centred inside the QR code</strong> and at the top of the checkout — customers instantly know who they're paying.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
