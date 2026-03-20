import Link from 'next/link';
export default function PrivacyPage() {
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
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(28px,4vw,42px)',fontWeight:800,marginBottom:8,color:'#dbeafe'}}>Privacy Policy</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginBottom:48}}>Last updated: March 20, 2026</p>
        <p style={p}>NovaPay is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'32px 0'}}/>
        <h2 style={h2}>1. Information We Collect</h2>
        <ul style={ul}>
          <li>Account info: name, email, business name</li>
          <li>KYC documents as required by law</li>
          <li>UPI IDs (stored AES-256 encrypted)</li>
          <li>Transaction data: amounts, timestamps, UTR numbers</li>
          <li>Technical data: IP address, browser type</li>
        </ul>
        <h2 style={h2}>2. How We Use Your Information</h2>
        <ul style={ul}>
          <li>To provide and operate the payment gateway</li>
          <li>To verify payment transactions</li>
          <li>To comply with legal requirements</li>
          <li>To detect and prevent fraud</li>
          <li>To improve our platform</li>
        </ul>
        <h2 style={h2}>3. Data Security</h2>
        <ul style={ul}>
          <li>AES-256-GCM encryption for data at rest</li>
          <li>HTTPS/TLS for data in transit</li>
          <li>HMAC-SHA256 for API authentication</li>
          <li>Regular security audits</li>
        </ul>
        <h2 style={h2}>4. Data Sharing</h2>
        <p style={p}>We do not sell your data. We may share with payment providers (Paytm, PhonePe) solely for transaction verification, and with law enforcement when required by law.</p>
        <h2 style={h2}>5. Your Rights</h2>
        <ul style={ul}>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion (subject to legal obligations)</li>
          <li>Object to marketing processing</li>
        </ul>
        <h2 style={h2}>6. Contact</h2>
        <p style={p}>Email: <a href="mailto:sonamtsheringsh@gmail.com" style={{color:'#60a5fa'}}>sonamtsheringsh@gmail.com</a><br/>NovaPay, Koramangala, Bengaluru, Karnataka 560095</p>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'40px 0'}}/>
        <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
          <Link href="/terms" style={{fontSize:13,color:'#60a5fa'}}>Terms</Link>
          <Link href="/refund" style={{fontSize:13,color:'#60a5fa'}}>Refund Policy</Link>
          <Link href="/contact" style={{fontSize:13,color:'#60a5fa'}}>Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
