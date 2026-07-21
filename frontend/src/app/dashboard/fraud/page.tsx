'use client';
import { ShieldCheck } from 'lucide-react';

export default function FraudPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Fraud Alerts</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>Real-time suspicious activity monitoring</div>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '48px 32px', textAlign: 'center' as const }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldCheck size={28} color="#2563EB" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>All clear</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>No suspicious activity detected on your account.</div>
      </div>
    </div>
  );
}
