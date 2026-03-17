'use client';
import { useEffect, useState } from 'react';

export default function ReferralPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    setAppUrl(window.location.origin);
    const token = localStorage.getItem('upay_access_token');
    fetch('/api/v1/dashboard/referral', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setStats(d.data); }).finally(() => setLoading(false));
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000);
  };

  const referralLink = stats?.referral_code ? `${appUrl}/auth/register?ref=${stats.referral_code}` : '';
  const inp: React.CSSProperties = { width: '100%', background: '#030d1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#93c5fd', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div style={{ color: '#dbeafe', fontFamily: 'DM Sans, sans-serif', maxWidth: 700 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Referral Program</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>Invite merchants and earn 20% discount on your next subscription</div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Referrals', value: stats?.total_referrals ?? 0, icon: '👥', color: '#3b82f6' },
              { label: 'Rewarded', value: stats?.rewarded ?? 0, icon: '🎁', color: '#10b981' },
              { label: 'Your Discount', value: `${stats?.discount_pct ?? 20}%`, icon: '💰', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Your Referral Code</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Share this code or link — when someone registers using it, you get 20% off your next plan</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>Referral Code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={inp} readOnly value={stats?.referral_code || ''} />
                <button onClick={() => copy(stats?.referral_code || '', 'code')} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '0 18px', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                  {copied === 'code' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>Referral Link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, fontSize: 12 }} readOnly value={referralLink} />
                <button onClick={() => copy(referralLink, 'link')} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '0 18px', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>
                  {copied === 'link' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: '#0f1d35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 24px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {[
                { step: '1', title: 'Share your link', desc: 'Send your referral link or code to other merchants' },
                { step: '2', title: 'They register', desc: 'When they sign up using your referral link' },
                { step: '3', title: 'You get rewarded', desc: 'Receive 20% discount on your next subscription payment' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#dbeafe', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
