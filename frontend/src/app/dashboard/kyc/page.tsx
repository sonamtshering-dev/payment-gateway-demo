'use client';
import { useEffect, useState, useRef } from 'react';

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string; border: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', icon: '⏳', label: 'Under Review',  border: 'rgba(245,158,11,0.2)'  },
  approved: { bg: 'rgba(59,130,246,0.08)',   color: '#3b82f6', icon: '✅', label: 'Approved',      border: 'rgba(59,130,246,0.2)'   },
  rejected: { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', icon: '❌', label: 'Rejected',      border: 'rgba(239,68,68,0.2)'   },
};

const inp: React.CSSProperties = { width: '100%', background: '#030d1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', color: '#dbeafe', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 };

function FileUpload({ label, value, onChange }: { label: string; value: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div style={lbl}>{label}</div>
      <div onClick={() => ref.current?.click()}
        style={{ border: `1.5px dashed ${value ? 'rgba(29,78,216,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '18px 16px', textAlign: 'center' as const, cursor: 'pointer', background: value ? 'rgba(29,78,216,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(29,78,216,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = value ? 'rgba(29,78,216,0.4)' : 'rgba(255,255,255,0.1)')}
      >
        {value ? (
          <><div style={{ fontSize: 20, marginBottom: 4 }}>📄</div><div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>{value.name}</div><div style={{ fontSize: 11, color: '#4b5563', marginTop: 3 }}>{(value.size/1024).toFixed(1)} KB · Click to change</div></>
        ) : (
          <><div style={{ fontSize: 20, marginBottom: 4 }}>📁</div><div style={{ fontSize: 12, color: '#64748b' }}>Click to upload</div><div style={{ fontSize: 11, color: '#4b5563', marginTop: 3 }}>JPG, PNG or PDF · Max 5MB</div></>
        )}
      </div>
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={e => onChange(e.target.files?.[0] || null)} />
    </div>
  );
}

export default function KYCPage() {
  const [kyc, setKyc]               = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [agreed, setAgreed]         = useState(false);
  const [form, setForm] = useState({ aadhaar_number: '', pan_number: '', business_name: '' });
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile]         = useState<File | null>(null);
  const [selfieFile, setSelfieFile]   = useState<File | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/v1/dashboard/kyc', { headers }).then(r => r.json()).then(d => { if (d.success && d.data) setKyc(d.data); }).finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.business_name.trim()) { setError('Business name is required'); return; }
    if (!form.pan_number.trim())    { setError('PAN number is required'); return; }
    if (!form.aadhaar_number.trim()) { setError('Aadhaar number is required'); return; }
    if (!agreed) { setError('Please agree to the terms and conditions'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/v1/dashboard/kyc', { method: 'POST', headers, body: JSON.stringify({ aadhaar_number: form.aadhaar_number, pan_number: form.pan_number, business_name: form.business_name, bank_account: 'N/A', bank_ifsc: 'N/A', bank_name: 'N/A' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submission failed');
      setKyc(d.data); setSuccess('KYC submitted! We will review within 2-3 business days.');
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 680 }}>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', color: '#3b82f6', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      {/* Hero */}
      <div style={{ textAlign: 'center' as const, marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>🪪</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Start Your KYC Verification</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Upload your documents to verify your identity and unlock all features</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : kyc ? (
        <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 32px' }}>
          {(() => {
            const s = STATUS_STYLE[kyc.status] || STATUS_STYLE.pending;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>KYC Status</div>
                  <div style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 100 }}>{s.icon} {s.label}</div>
                </div>
                {kyc.status === 'rejected' && kyc.rejection_reason && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>
                    <strong>Reason:</strong> {kyc.rejection_reason}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['Business Name', kyc.business_name], ['PAN Number', kyc.pan_number], ['Aadhaar', kyc.aadhaar_number?.replace(/(\d{4})/g, '$1 ').trim()], ['Submitted', kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—']].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>{k}</div>
                      <div style={{ fontSize: 13, color: '#dbeafe', fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {kyc.status === 'rejected' && (
                  <button onClick={() => setKyc(null)} style={{ marginTop: 20, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '11px 24px', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                    Resubmit KYC
                  </button>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 32px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Upload KYC Documents</div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Business Name *</label>
            <input style={inp} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Your registered business name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={lbl}>PAN Number *</label>
              <input style={inp} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
            </div>
            <div>
              <label style={lbl}>Aadhaar Number *</label>
              <input style={inp} value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12 digit number" maxLength={12} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            <FileUpload label="Aadhaar Card" value={aadhaarFile} onChange={setAadhaarFile} />
            <FileUpload label="PAN Card" value={panFile} onChange={setPanFile} />
            <FileUpload label="Selfie / Photo" value={selfieFile} onChange={setSelfieFile} />
          </div>

          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#f59e0b' }}>
            ⚠ Your data is encrypted and stored securely. KYC is reviewed within 2-3 business days.
          </div>

          <div onClick={() => setAgreed(a => !a)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24, userSelect: 'none' as const }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1, background: agreed ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'transparent', border: agreed ? 'none' : '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {agreed && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              I confirm all information is accurate. I agree to the <span style={{ color: '#93c5fd' }}>Terms of Service</span> and <span style={{ color: '#93c5fd' }}>Privacy Policy</span>.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, background: submitting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', borderRadius: 10, padding: '13px 0', color: submitting ? '#4b5563' : '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 20px rgba(29,78,216,0.3)' }}>
              {submitting ? 'Submitting…' : 'Upload KYC Documents'}
            </button>
            <button onClick={() => { setForm({ aadhaar_number: '', pan_number: '', business_name: '' }); setAadhaarFile(null); setPanFile(null); setSelfieFile(null); setAgreed(false); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '13px 20px', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
