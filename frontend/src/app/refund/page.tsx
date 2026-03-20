import Link from 'next/link';
export default function RefundPage() {
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
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(28px,4vw,42px)',fontWeight:800,marginBottom:8,color:'#dbeafe'}}>Refund Policy</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginBottom:48}}>Last updated: March 20, 2026</p>
        <div style={{background:'rgba(29,78,216,0.08)',border:'1px solid rgba(29,78,216,0.2)',borderRadius:12,padding:'20px 24px',marginBottom:24}}>
          <p style={{fontSize:15,color:'#93c5fd',marginBottom:0}}>NovaPay charges subscription fees for platform access. We do not handle merchant-customer payment refunds — those are managed directly between merchants and their customers.</p>
        </div>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'32px 0'}}/>
        <h2 style={h2}>1. Subscription Refunds</h2>
        <p style={p}>Subscription fees are generally non-refundable except in these cases:</p>
        <ul style={ul}>
          <li>Platform unavailable for more than 48 continuous hours due to our fault</li>
          <li>Duplicate payment for the same subscription period</li>
          <li>Unauthorized charge on your account</li>
        </ul>
        <h2 style={h2}>2. Non-Refundable Situations</h2>
        <ul style={ul}>
          <li>Change of mind after subscription activation</li>
          <li>Partial use of subscription period</li>
          <li>Account termination due to Terms violation</li>
          <li>Issues caused by third-party providers (Paytm, PhonePe)</li>
        </ul>
        <h2 style={h2}>3. Merchant-Customer Refunds</h2>
        <p style={p}>NovaPay is not a party to merchant-customer transactions. Contact the merchant directly for payment refunds. For UPI disputes, contact your bank or UPI app provider.</p>
        <h2 style={h2}>4. How to Request a Refund</h2>
        <p style={p}>Email us within 7 days of the charge at <a href="mailto:sonamtsheringsh@gmail.com" style={{color:'#60a5fa'}}>sonamtsheringsh@gmail.com</a> with subject: "Refund Request – [Your Email] – [Date]". Include reason and transaction ID. We respond within 5-7 business days.</p>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'40px 0'}}/>
        <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
          <Link href="/terms" style={{fontSize:13,color:'#60a5fa'}}>Terms</Link>
          <Link href="/privacy" style={{fontSize:13,color:'#60a5fa'}}>Privacy</Link>
          <Link href="/contact" style={{fontSize:13,color:'#60a5fa'}}>Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
