'use client';
import { useEffect, useState, useRef } from 'react';

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', icon: '⏳', label: 'Under Review' },
  approved: { bg: 'rgba(0,229,176,0.10)',  color: '#00e5b0', icon: '✅', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', icon: '❌', label: 'Rejected' },
};

const inp: React.CSSProperties = { width: '100%', background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#eef2ff', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#8b9ab5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 };

function FileUpload({ label, value, onChange }: { label: string; value: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div style={lbl}>{label}</div>
      <div
        onClick={() => ref.current?.click()}
        style={{ border: '1.5px dashed rgba(255,255,255,0.12)', borderRadius: 10, padding: '20px 16px', textAlign: 'center' as const, cursor: 'pointer', background: value ? 'rgba(0,229,176,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', borderColor: value ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.12)' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,229,176,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = value ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.12)')}
      >
        {value ? (
          <div>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
            <div style={{ fontSize: 13, color: '#00e5b0', fontWeight: 600 }}>{value.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{(value.size / 1024).toFixed(1)} KB · Click to change</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Click to upload</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>JPG, PNG or PDF · Max 5MB</div>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={e => onChange(e.target.files?.[0] || null)} />
    </div>
  );
}

export default function KYCPage() {
  const [kyc, setKyc]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [agreed, setAgreed]     = useState(false);
  const [form, setForm] = useState({ aadhaar_number: '', pan_number: '', business_name: '' });
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile]         = useState<File | null>(null);
  const [selfieFile, setSelfieFile]   = useState<File | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/v1/dashboard/kyc', { headers })
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setKyc(d.data); })
      .finally(() => setLoading(false));
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
      const r = await fetch('/api/v1/dashboard/kyc', {
        method: 'POST', headers,
        body: JSON.stringify({
          aadhaar_number: form.aadhaar_number,
          pan_number:     form.pan_number,
          business_name:  form.business_name,
          bank_account:   'N/A',
          bank_ifsc:      'N/A',
          bank_name:      'N/A',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submission failed');
      setKyc(d.data);
      setSuccess('KYC submitted! We will review within 2-3 business days.');
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ padding: 32, color: '#eef2ff', fontFamily: 'DM Sans, sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>KYC Verification</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>Complete your KYC to unlock full payment capabilities.</p>

      {error   && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.18)', borderRadius: 8, padding: '10px 16px', color: '#00e5b0', fontSize: 13, marginBottom: 20 }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 64, color: '#4b5563' }}>Loading...</div>
      ) : kyc ? (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 32 }}>
          {(() => {
            const s = STATUS_STYLE[kyc.status] || STATUS_STYLE.pending;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>KYC Status</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Submitted {kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </div>
                  </div>
                  <div style={{ background: s.bg, color: s.color, fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.icon} {s.label}
                  </div>
                </div>

                {kyc.status === 'rejected' && kyc.rejection_reason && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 24 }}>
                    <strong>Reason:</strong> {kyc.rejection_reason}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[['Business Name', kyc.business_name], ['PAN Number', kyc.pan_number], ['Aadhaar', kyc.aadhaar_number?.replace(/(\d{4})/g, '$1 ').trim()]].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>{k}</div>
                      <div style={{ fontSize: 14, color: '#eef2ff', fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {kyc.status === 'rejected' && (
                  <button onClick={() => setKyc(null)} style={{ marginTop: 24, background: 'linear-gradient(135deg,#00e5b0,#0ea5e9)', border: 'none', borderRadius: 10, padding: '11px 24px', color: '#07090f', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                    Resubmit KYC
                  </button>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 32 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Identity Details</div>

          {/* Text fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Business Name</label>
              <input style={inp} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Your registered business name" />
            </div>
            <div>
              <label style={lbl}>PAN Number</label>
              <input style={inp} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
            </div>
            <div>
              <label style={lbl}>Aadhaar Number</label>
              <input style={inp} value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12 digit number" maxLength={12} />
            </div>
          </div>

          {/* Document uploads */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#8b9ab5' }}>Upload Documents</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <FileUpload label="Aadhaar Card" value={aadhaarFile} onChange={setAadhaarFile} />
              <FileUpload label="PAN Card" value={panFile} onChange={setPanFile} />
              <FileUpload label="Selfie / Photo" value={selfieFile} onChange={setSelfieFile} />
            </div>
          </div>

          {/* Terms */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, marginBottom: 24 }}>
            <div
              onClick={() => setAgreed(a => !a)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', userSelect: 'none' as const }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 2,
                background: agreed ? 'linear-gradient(135deg,#00e5b0,#0ea5e9)' : 'transparent',
                border: agreed ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {agreed && <span style={{ color: '#07090f', fontSize: 13, fontWeight: 800 }}>✓</span>}
              </div>
              <div style={{ fontSize: 13, color: '#8b9ab5', lineHeight: 1.6 }}>
                I confirm that all the information provided is accurate and complete. I agree to the{' '}
                <span style={{ color: '#00e5b0', cursor: 'pointer' }}>Terms of Service</span> and{' '}
                <span style={{ color: '#00e5b0', cursor: 'pointer' }}>Privacy Policy</span>. I authorize NovaPay to verify my identity and documents for KYC compliance.
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#f59e0b' }}>
            ⚠ Your data is encrypted and stored securely. KYC is reviewed within 2-3 business days.
          </div>

          <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', background: submitting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#00e5b0,#0ea5e9)', border: 'none', borderRadius: 10, padding: '13px 0', color: submitting ? '#4b5563' : '#07090f', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting…' : 'Submit KYC →'}
          </button>
        </div>
      )}
    </div>
  );
}