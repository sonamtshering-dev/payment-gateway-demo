import Link from 'next/link';
export default function ContactPage() {
  const w={background:'#020817',color:'#dbeafe',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',paddingBottom:80} as const;
  const card={background:'#0f1d35',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:'24px 24px',marginBottom:16} as const;
  const lbl={fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase' as const,letterSpacing:'0.1em',marginBottom:8};
  const p={fontSize:15,color:'rgba(255,255,255,0.55)',lineHeight:1.8,marginBottom:16} as const;
  const faqs=[
    {q:'How do I add my UPI ID?',a:'Go to Dashboard > Connect Merchant > Add UPI ID. Enter your UPI VPA and click Add.'},
    {q:'How does auto-verification work?',a:'Connect your Paytm Business MID in Connect Merchant. Payments to your Paytm UPI are verified automatically within 5-10 seconds.'},
    {q:'What if a customer pays from GPay?',a:'For non-Paytm payments, manually update the transaction status in your dashboard with the UTR number.'},
    {q:'How do I get my API key?',a:'Your API key is in Dashboard > API & Webhooks. Use it with HMAC-SHA256 signatures for secure API calls.'},
    {q:'How do I cancel my subscription?',a:'Go to Dashboard > My Plan > Cancel Subscription. Your plan remains active until the end of the billing period.'},
  ];
  return (
    <div style={w}>
      <style>{'@import url(https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap);*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}a{text-decoration:none;color:inherit}'}</style>
      <nav style={{height:66,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 6vw',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(2,8,23,0.95)',position:'sticky',top:0,zIndex:100}}>
        <Link href="/" style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'#60a5fa'}}>NovaPay</Link>
        <Link href="/auth/login" style={{fontSize:14,color:'rgba(255,255,255,0.5)'}}>Login</Link>
      </nav>
      <div style={{maxWidth:760,margin:'0 auto',padding:'60px 6vw 0'}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(28px,4vw,42px)',fontWeight:800,marginBottom:8,color:'#dbeafe'}}>Contact Us</h1>
        <p style={{fontSize:16,color:'rgba(255,255,255,0.4)',marginBottom:48}}>We are here to help. Reach out through any channel below.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16,marginBottom:40}}>
          <div style={card}>
            <div style={lbl}>Email Support</div>
            <a href="mailto:novapaysupport@gmail.com" style={{fontSize:14,color:'#60a5fa',wordBreak:'break-all'}}>novapaysupport@gmail.com</a>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginTop:8,marginBottom:0}}>Response within 24 hours</p>
          </div>
          <div style={card}>
            <div style={lbl}>Support Hours</div>
            <div style={{fontSize:15,color:'#dbeafe',fontWeight:500}}>Mon - Sat</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.4)',marginTop:4}}>10:00 AM - 7:00 PM IST</div>
          </div>
          <div style={card}>
            <div style={lbl}>Address</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>NovaPay<br/>india<br/>india based</div>
          </div>
        </div>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'40px 0'}}/>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#dbeafe',marginBottom:24}}>Frequently Asked Questions</h2>
        {faqs.map(({q,a})=>(
          <div key={q} style={{marginBottom:24,borderBottom:'1px solid rgba(255,255,255,0.05)',paddingBottom:24}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'#dbeafe',marginBottom:8}}>{q}</div>
            <p style={{...p,marginBottom:0}}>{a}</p>
          </div>
        ))}
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'40px 0'}}/>
        <div style={{background:'linear-gradient(135deg,rgba(29,78,216,0.1),rgba(30,64,175,0.05))',border:'1px solid rgba(29,78,216,0.2)',borderRadius:16,padding:'28px 28px'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,marginBottom:8,color:'#dbeafe'}}>Still need help?</div>
          <p style={{...p,marginBottom:20}}>Send us a detailed email and our team will get back to you within 24 hours.</p>
          <a href="mailto:sonamtsheringsh@gmail.com" style={{display:'inline-block',background:'linear-gradient(135deg,#1d4ed8,#1e40af)',borderRadius:10,padding:'12px 28px',color:'#fff',fontSize:14,fontWeight:700,fontFamily:'Syne,sans-serif'}}>Send Email</a>
        </div>
        <hr style={{borderColor:'rgba(255,255,255,0.06)',margin:'40px 0'}}/>
        <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
          <Link href="/terms" style={{fontSize:13,color:'#60a5fa'}}>Terms</Link>
          <Link href="/privacy" style={{fontSize:13,color:'#60a5fa'}}>Privacy</Link>
          <Link href="/refund" style={{fontSize:13,color:'#60a5fa'}}>Refund</Link>
        </div>
      </div>
    </div>
  );
}
