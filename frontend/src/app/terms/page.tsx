import Link from 'next/link';
export default function TermsPage() {
  const w={background:'#020817',color:'#dbeafe',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',paddingBottom:80} as const;
  const h2={fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:'#dbeafe',marginTop:40,marginBottom:12} as const;
  const p={fontSize:15,color:'rgba(255,255,255,0.55)',lineHeight:1.8,marginBottom:16} as const;
  const ul={fontSize:15,color:'rgba(255,255,255,0.55)',lineHeight:1.8,paddingLeft:20,marginBottom:16} as const;
  return (
    <div style={w}>
      <style>{'@import url(https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap);*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}a{text-decoration:none;color:inherit}'}</style>
      <nav style={{height:66,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 6vw',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(2,8,23,0.95)',position:'sticky',top:0,zIndex:100}}>
        <Link href="/" style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'#60a5fa'}}>NovaPay</Link>
        <Link href="/auth/login" style={{fontSize:14,color:'rgba(255,255,255,0.5)'}}>Login</Link>
      </nav>
      <div style={{maxWidth:760,margin:'0 auto',padding:'60px 6vw 0'}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(28px,4vw,42px)',fontWeight:800,marginBottom:8,color:'#dbeafe'}}>Terms &amp; Conditions</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginBottom:48}}>Last updated: March 20, 2026</p>
        <p style={p}>By accessing or using NovaPay, you agree to be bound by these Terms and Conditions.</p>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'32px 0'}}/>
        <h2 style={h2}>1. Acceptance of Terms</h2>
        <p style={p}>By registering for NovaPay, you confirm you are at least 18 years old, have legal capacity to enter this agreement, and agree to comply with these terms.</p>
        <h2 style={h2}>2. Description of Service</h2>
        <p style={p}>NovaPay provides a UPI-based payment gateway platform allowing merchants to accept payments via dynamic QR codes and payment links. Payments go directly to the merchant's UPI account.</p>
        <h2 style={h2}>3. Merchant Obligations</h2>
        <ul style={ul}>
          <li>Provide accurate registration information</li>
          <li>Maintain security of your account credentials</li>
          <li>Use the platform only for lawful business purposes</li>
          <li>Comply with all applicable Indian laws and RBI guidelines</li>
          <li>Complete KYC verification as required</li>
        </ul>
        <h2 style={h2}>4. Fees and Subscriptions</h2>
        <p style={p}>NovaPay charges a flat subscription fee. There are no per-transaction fees. Subscription fees are charged in advance. NovaPay may modify pricing with 30 days notice.</p>
        <h2 style={h2}>5. Prohibited Activities</h2>
        <ul style={ul}>
          <li>Illegal goods or services</li>
          <li>Money laundering or financial fraud</li>
          <li>Gambling without a license</li>
          <li>Adult content or services</li>
          <li>Any activity prohibited under Indian law</li>
        </ul>
        <h2 style={h2}>6. Limitation of Liability</h2>
        <p style={p}>NovaPay shall not be liable for indirect or consequential damages. Maximum liability shall not exceed subscription fees paid in the 3 months preceding the claim.</p>
        <h2 style={h2}>7. Governing Law</h2>
        <p style={p}>These terms are governed by the laws of India. Disputes are subject to courts in Bengaluru, Karnataka.</p>
        <h2 style={h2}>8. Contact</h2>
        <p style={p}>Email: <a href="mailto:sonamtsheringsh@gmail.com" style={{color:'#60a5fa'}}>sonamtsheringsh@gmail.com</a><br/>NovaPay, Koramangala, Bengaluru, Karnataka 560095</p>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'40px 0'}}/>
        <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
          <Link href="/privacy" style={{fontSize:13,color:'#60a5fa'}}>Privacy Policy</Link>
          <Link href="/refund" style={{fontSize:13,color:'#60a5fa'}}>Refund Policy</Link>
          <Link href="/contact" style={{fontSize:13,color:'#60a5fa'}}>Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
