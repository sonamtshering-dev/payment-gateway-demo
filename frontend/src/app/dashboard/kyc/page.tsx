'use client';
import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, FileText, BookOpen, Mail, Upload, CheckCircle2, ChevronRight, Lock } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Business Details', sub: 'Basic information' },
  { id: 2, label: 'Owner Details',    sub: 'Personal information' },
  { id: 3, label: 'Documents',        sub: 'Upload documents' },
  { id: 4, label: 'Verification',     sub: 'Review & Confirm' },
];

const DOC_TYPES = [
  { key: 'pan',       label: 'PAN Card',                          desc: 'Upload clear front side of PAN card',           color: '#2563EB', bg: '#EFF6FF' },
  { key: 'aadhaar',   label: 'Aadhaar Card / ID Proof',           desc: 'Upload front & back side',                      color: '#D97706', bg: '#FFFBEB' },
  { key: 'biz_cert',  label: 'Business Registration Certificate', desc: 'Upload Certificate of Incorporation',           color: '#059669', bg: '#ECFDF5' },
  { key: 'bank',      label: 'Bank Account Proof',                desc: 'Upload Cancelled Cheque or Bank Statement',    color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'address',   label: 'Address Proof',                     desc: 'Upload Utility Bill / Rent Agreement',         color: '#0891B2', bg: '#F0F9FF' },
  { key: 'signatory', label: 'Authorized Signatory Photo',        desc: 'Upload Passport Size Photo',                   color: '#DC2626', bg: '#FEF2F2' },
];

const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership Firm', 'Private Limited Company', 'Public Limited Company', 'LLP', 'NGO / Trust', 'Other'];

const inp: React.CSSProperties = { width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', color: '#0F172A', fontSize: 13.5, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#475569', marginBottom: 7 };

function DonutChart({ pct }: { pct: number }) {
  const r = 42, cx = 54, cy = 54, circ = 2 * Math.PI * r;
  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2563EB" strokeWidth="10"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="16" fontWeight="800" fill="#0F172A">{pct}%</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="10" fill="#64748B">Completed</text>
    </svg>
  );
}

function SelectableDocCard({
  doc, selected, disabled, onToggle, file, onFile,
}: {
  doc: typeof DOC_TYPES[0];
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={!selected && disabled ? undefined : onToggle}
      style={{
        background: selected ? '#F0F9FF' : '#FFFFFF',
        border: `2px solid ${selected ? '#2563EB' : '#E2E8F0'}`,
        borderRadius: 12, padding: '16px',
        cursor: disabled && !selected ? 'not-allowed' : 'pointer',
        opacity: disabled && !selected ? 0.45 : 1,
        transition: 'all .15s',
        position: 'relative' as const,
      }}
    >
      {/* Selection indicator */}
      <div style={{
        position: 'absolute' as const, top: 12, right: 12,
        width: 20, height: 20, borderRadius: '50%',
        background: selected ? '#2563EB' : '#F1F5F9',
        border: `2px solid ${selected ? '#2563EB' : '#CBD5E1'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7.5L8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, paddingRight: 28 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: doc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={16} color={doc.color} />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{doc.label}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>{doc.desc}</div>
        </div>
      </div>

      {selected && (
        <>
          <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
          <button
            onClick={e => { e.stopPropagation(); ref.current?.click(); }}
            style={{
              width: '100%', background: file ? '#ECFDF5' : '#F8FAFC',
              border: `1px dashed ${file ? '#A7F3D0' : '#CBD5E1'}`,
              borderRadius: 8, padding: '8px 0', color: file ? '#059669' : '#475569',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {file
              ? <><CheckCircle2 size={12} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 160 }}>{file.name}</span></>
              : <><Upload size={13} /> Upload File</>
            }
          </button>
        </>
      )}

      {!selected && (
        <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' as const, padding: '4px 0' }}>
          {disabled ? 'Already selected 2 documents' : 'Click to select'}
        </div>
      )}
    </div>
  );
}

export default function KYCPage() {
  const [kyc, setKyc]               = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep]             = useState(1);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [files, setFiles]           = useState<Record<string, File | null>>({});
  const [selectedDocKeys, setSelectedDocKeys] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    business_name: '', business_type: 'Private Limited Company',
    phone: '', email: '', pan_number: '', registration_number: '',
    owner_name: '', dob: '', aadhaar_number: '',
  });

  const token   = typeof window !== 'undefined' ? localStorage.getItem('upay_access_token') : '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/v1/dashboard/kyc', { headers })
      .then(r => r.json()).then(d => { if (d.success && d.data) setKyc(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setFile = (key: string, file: File) => setFiles(prev => ({ ...prev, [key]: file }));

  const toggleDoc = (key: string) => {
    setSelectedDocKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < 2) {
        next.add(key);
      }
      return next;
    });
  };

  const selectedDocsList = DOC_TYPES.filter(d => selectedDocKeys.has(d.key));
  const progress = Math.round(((step - 1) / 4) * 100);

  const validateStep = (s: number): string => {
    if (s === 1) {
      if (!form.business_name.trim()) return 'Business name is required';
      if (!form.pan_number.trim())    return 'PAN number is required';
    }
    if (s === 2) {
      if (!form.aadhaar_number.trim()) return 'Aadhaar number is required';
    }
    if (s === 3) {
      if (selectedDocKeys.size < 2) return 'Please select exactly 2 documents';
      const allUploaded = Array.from(selectedDocKeys).every(k => files[k]);
      if (!allUploaded) return 'Please upload both selected documents';
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch('/api/v1/dashboard/kyc', {
        method: 'POST', headers,
        body: JSON.stringify({
          aadhaar_number: form.aadhaar_number,
          pan_number: form.pan_number,
          business_name: form.business_name,
          bank_account: 'N/A', bank_ifsc: 'N/A', bank_name: 'N/A',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submission failed');
      for (const key of Array.from(selectedDocKeys)) {
        const file = files[key];
        if (file) {
          const fd = new FormData();
          fd.append('document', file); fd.append('type', key);
          await fetch('/api/v1/dashboard/kyc/document', {
            method: 'POST', headers: { 'Authorization': headers['Authorization'] }, body: fd,
          });
        }
      }
      setKyc(d.data);
      setSuccess('KYC submitted! We will review within 2-3 business days.');
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; border: string }> = {
    pending:  { bg: '#FFFBEB', color: '#D97706', label: 'Under Review', border: '#FDE68A' },
    approved: { bg: '#ECFDF5', color: '#059669', label: 'Approved',     border: '#A7F3D0' },
    rejected: { bg: '#FEF2F2', color: '#DC2626', label: 'Rejected',     border: '#FECACA' },
  };

  const sharedStyle = `
    @keyframes spin{to{transform:rotate(360deg)}}
    .kyc-layout { display: flex; gap: 20px; align-items: flex-start; }
    .kyc-main { flex: 1; min-width: 0; }
    .kyc-sidebar { width: 256px; flex-shrink: 0; }
    .kyc-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .kyc-doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .kyc-status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .kyc-status-layout { display: flex; gap: 20px; align-items: flex-start; }
    .kyc-status-main { flex: 1; min-width: 0; }
    .kyc-status-side { width: 260px; flex-shrink: 0; }
    @media (max-width: 900px) {
      .kyc-layout { flex-direction: column; align-items: stretch; }
      .kyc-sidebar { width: 100%; }
      .kyc-status-layout { flex-direction: column; }
      .kyc-status-side { width: 100%; }
    }
    @media (max-width: 850px) { .kyc-doc-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .kyc-grid-2 { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .kyc-doc-grid { grid-template-columns: 1fr; } .kyc-status-grid { grid-template-columns: 1fr; } }
  `;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <style>{sharedStyle}</style>
      <div style={{ width: 28, height: 28, border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (kyc) {
    const s = STATUS_STYLE[kyc.status] || STATUS_STYLE.pending;
    const isApproved = kyc.status === 'approved';
    const isRejected = kyc.status === 'rejected';
    const submittedDate = kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const timeline = [
      { label: 'KYC Submitted',       sub: submittedDate,          done: true },
      { label: 'Documents Verified',  sub: isApproved || isRejected ? 'Completed' : 'In progress', done: isApproved || isRejected },
      { label: 'KYC Approved',        sub: isApproved ? 'Verified' : isRejected ? 'Rejected' : 'Pending review', done: isApproved },
    ];

    return (
      <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
        <style>{sharedStyle}</style>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>KYC Verification</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Your Know Your Customer verification status and details.</div>
        </div>
        {success && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', color: '#059669', fontSize: 13, marginBottom: 16 }}>{success}</div>}
        <div className="kyc-status-layout">
          <div className="kyc-status-main">
            <div style={{
              background: isApproved ? 'linear-gradient(135deg,#064E3B,#065F46)'
                : isRejected ? 'linear-gradient(135deg,#7F1D1D,#991B1B)'
                : 'linear-gradient(135deg,#1E3A5F,#1D4ED8)',
              borderRadius: 16, padding: '28px 28px 24px', marginBottom: 16, color: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isApproved
                      ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : isRejected
                      ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 100 18A9 9 0 0012 3z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3M12 3a9 9 0 100 18A9 9 0 0012 3z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.65, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Verification Status</div>
                    <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.15 }}>
                      {isApproved ? 'KYC Approved' : isRejected ? 'KYC Rejected' : 'Under Review'}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                      {isApproved ? 'Your account is fully verified and active'
                        : isRejected ? 'Your KYC was not approved — please resubmit'
                        : 'We are reviewing your documents (2–3 business days)'}
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 100, padding: '5px 16px', fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.25)', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                  {s.label}
                </div>
              </div>
              {isRejected && kyc.rejection_reason && (
                <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '12px 16px', marginTop: 18, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, opacity: 0.9 }}>Reason: </span>
                  <span style={{ opacity: 0.85 }}>{kyc.rejection_reason}</span>
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>Submitted Information</div>
              <div className="kyc-status-grid">
                {[
                  { label: 'Business Name',  value: kyc.business_name, mono: false },
                  { label: 'PAN Number',     value: kyc.pan_number,    mono: true  },
                  { label: 'Aadhaar Number', value: kyc.aadhaar_number?.replace(/(\d{4})/g, '$1 ').trim(), mono: true },
                  { label: 'Date Submitted', value: submittedDate,      mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 11, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 7 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
              {isRejected && (
                <button
                  onClick={() => { setKyc(null); setStep(1); setSelectedDocKeys(new Set()); setFiles({}); }}
                  style={{ marginTop: 20, background: '#2563EB', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  Resubmit KYC
                </button>
              )}
            </div>
          </div>

          <div className="kyc-status-side">
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>Verification Progress</div>
              {timeline.map((t, i) => (
                <div key={t.label} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: t.done ? (isRejected && i === 2 ? '#FEF2F2' : '#ECFDF5') : '#F1F5F9',
                      border: `2px solid ${t.done ? (isRejected && i === 2 ? '#FECACA' : '#A7F3D0') : '#E2E8F0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {t.done
                        ? isRejected && i === 2
                          ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round"/></svg>
                          : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.8 3L10 3" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#CBD5E1' }} />
                      }
                    </div>
                    {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: t.done ? '#A7F3D0' : '#E2E8F0', margin: '3px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: i < timeline.length - 1 ? 20 : 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: t.done ? '#0F172A' : '#94A3B8', lineHeight: 1.3 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 14, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={15} color="#2563EB" />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8' }}>RBI Compliant</div>
              </div>
              <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
                Your data is encrypted and processed in compliance with RBI KYC guidelines and PMLA regulations.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{sharedStyle}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' as const }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', marginBottom: 8, flexWrap: 'wrap' as const }}>
            <span style={{ color: '#2563EB', cursor: 'pointer' }}>Merchants</span>
            <ChevronRight size={14} color="#94A3B8" />
            <span style={{ color: '#2563EB', cursor: 'pointer' }}>KYC Verification</span>
            <ChevronRight size={14} color="#94A3B8" />
            <span>Submit KYC</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Submit KYC</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Complete your KYC to start accepting payments. Your information is secure and encrypted.</div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 16px', color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
          <BookOpen size={15} /> KYC Guidelines
        </button>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div className="kyc-layout">
        <div className="kyc-main">
          {/* Stepper */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', overflowX: 'auto' as const }}>
            {STEPS.map((s, i) => {
              const active = s.id === step, done = s.id < step;
              return (
                <React.Fragment key={s.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: active ? '#2563EB' : done ? '#EFF6FF' : '#F1F5F9', border: `2px solid ${active ? '#2563EB' : done ? '#2563EB' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done
                        ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : '#94A3B8' }}>{s.id}</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: active || done ? 600 : 400, color: active ? '#0F172A' : done ? '#2563EB' : '#94A3B8', whiteSpace: 'nowrap' as const }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' as const }}>{s.sub}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: done ? '#2563EB' : '#E2E8F0', margin: '0 14px', minWidth: 20 }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step 1: Business Details */}
          {step === 1 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Business Information</div>
              <div className="kyc-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Business Type</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.business_type} onChange={e => set('business_type', e.target.value)}>
                    {BUSINESS_TYPES.map(bt => <option key={bt}>{bt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Business / Company Name *</label>
                  <input style={inp} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="NovaPay Technologies Pvt. Ltd." />
                </div>
              </div>
              <div className="kyc-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Registered Mobile Number</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select style={{ ...inp, width: 76, flexShrink: 0, padding: '10px 6px' }}>
                      <option>+91</option><option>+1</option>
                    </select>
                    <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Registered Email Address</label>
                  <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@novapay.in" />
                </div>
              </div>
              <div className="kyc-grid-2">
                <div>
                  <label style={lbl}>PAN Number *</label>
                  <input style={inp} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="AABCN1234D" maxLength={10} />
                </div>
                <div>
                  <label style={lbl}>Business Registration Number <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span></label>
                  <input style={inp} value={form.registration_number} onChange={e => set('registration_number', e.target.value)} placeholder="U74999KA2024PTC123456" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Owner Details */}
          {step === 2 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Owner / Director Details</div>
              <div className="kyc-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Full Name</label>
                  <input style={inp} value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Sonam Tshering" />
                </div>
                <div>
                  <label style={lbl}>Date of Birth</label>
                  <input style={inp} type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={lbl}>Aadhaar Number *</label>
                <input style={inp} value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12 digit Aadhaar number" maxLength={12} />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Your Aadhaar number is encrypted and stored securely</div>
              </div>
            </div>
          )}

          {/* Step 3: Document Upload — choose any 2 */}
          {step === 3 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Upload Documents</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: selectedDocKeys.size === 2 ? '#ECFDF5' : '#EFF6FF',
                  border: `1px solid ${selectedDocKeys.size === 2 ? '#A7F3D0' : '#BFDBFE'}`,
                  borderRadius: 100, padding: '4px 14px',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: selectedDocKeys.size === 2 ? '#059669' : '#2563EB',
                    color: '#fff', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{selectedDocKeys.size}/2</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedDocKeys.size === 2 ? '#059669' : '#2563EB' }}>
                    {selectedDocKeys.size === 2 ? 'Documents selected' : 'Select any 2 documents'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
                Choose <strong>any 2</strong> documents from the list below, then upload them. Files must be PNG, JPG or PDF (max 5 MB each).
              </div>

              <div className="kyc-doc-grid">
                {DOC_TYPES.map(doc => (
                  <SelectableDocCard
                    key={doc.key}
                    doc={doc}
                    selected={selectedDocKeys.has(doc.key)}
                    disabled={selectedDocKeys.size >= 2 && !selectedDocKeys.has(doc.key)}
                    onToggle={() => toggleDoc(doc.key)}
                    file={files[doc.key] || null}
                    onFile={f => setFile(doc.key, f)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Review & Confirm</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Please review your information before submitting</div>

              {/* Business info */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Business</div>
              {[
                ['Business Type', form.business_type],
                ['Business Name', form.business_name],
                ['Mobile Number', form.phone ? `+91 ${form.phone}` : '—'],
                ['Email Address', form.email || '—'],
                ['PAN Number', form.pan_number],
                ['Registration No.', form.registration_number || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{v}</span>
                </div>
              ))}

              {/* Owner info */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 20, marginBottom: 12 }}>Owner</div>
              {[
                ['Owner Name', form.owner_name || '—'],
                ['Aadhaar Number', form.aadhaar_number ? form.aadhaar_number.replace(/(\d{4})/g, '$1 ').trim() : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{v}</span>
                </div>
              ))}

              {/* Documents */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 20, marginBottom: 12 }}>Documents</div>
              {selectedDocsList.map(doc => {
                const f = files[doc.key];
                return (
                  <div key={doc.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: doc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={13} color={doc.color} />
                      </div>
                      <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{doc.label}</span>
                    </div>
                    {f
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#059669', fontSize: 12, fontWeight: 600 }}><CheckCircle2 size={13} /> Uploaded</div>
                      : <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Missing</span>
                    }
                  </div>
                );
              })}

              <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '12px 16px', marginTop: 18, fontSize: 12, color: '#2563EB', lineHeight: 1.6 }}>
                By submitting, I confirm all information is accurate and I agree to the Terms of Service and Privacy Policy.
              </div>
            </div>
          )}

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
            <Lock size={16} color="#059669" />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Your data is 100% secure and encrypted</span>
              <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>We never share your information with third parties</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => step > 1 ? setStep(s => s - 1) : undefined} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 24px', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {step > 1 ? '← Back' : 'Save as Draft'}
            </button>
            <button
              onClick={step === 4 ? handleSubmit : handleNext}
              disabled={submitting}
              style={{ flex: 1, background: submitting ? '#93C5FD' : '#2563EB', border: 'none', borderRadius: 10, padding: '11px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {submitting ? 'Submitting…' : step === 4 ? 'Submit KYC' : 'Continue →'}
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="kyc-sidebar">
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>KYC Progress</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><DonutChart pct={progress} /></div>
            {STEPS.map(s => {
              const done = s.id < step;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: done ? '#EFF6FF' : '#F1F5F9', border: `1.5px solid ${done ? '#2563EB' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4L3.2 6.5L7 2" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 12, color: done ? '#0F172A' : '#64748B' }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: done ? '#059669' : '#94A3B8' }}>{done ? 'Completed' : 'Pending'}</span>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 14, padding: '16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Lock size={16} color="#2563EB" />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>Secure & Compliant</div>
            </div>
            <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>Your KYC information is encrypted and stored securely. We comply with RBI guidelines and PMLA regulations.</div>
          </div>

          {/* Document selection summary */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Documents</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
              Choose <strong>any 2</strong> from the 6 available documents — whichever you have handy.
            </div>
            {DOC_TYPES.map(doc => {
              const sel = selectedDocKeys.has(doc.key);
              const uploaded = !!files[doc.key];
              return (
                <div key={doc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: sel ? (uploaded ? '#059669' : '#2563EB') : '#CBD5E1', flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: sel ? '#0F172A' : '#94A3B8' }}>{doc.label}</span>
                  </div>
                  {sel && (
                    <span style={{
                      background: uploaded ? '#ECFDF5' : '#EFF6FF',
                      color: uploaded ? '#059669' : '#2563EB',
                      fontSize: 9.5, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' as const,
                    }}>
                      {uploaded ? 'Uploaded' : 'Selected'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Need Help?</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>If you face any issues while submitting KYC, our support team is here to help you.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563EB', fontSize: 13, fontWeight: 600, marginBottom: 10, cursor: 'pointer' }}>
              <BookOpen size={14} color="#2563EB" /> View KYC Guidelines
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Mail size={14} color="#2563EB" /> Contact Support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
