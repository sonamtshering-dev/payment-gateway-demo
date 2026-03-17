export default function FraudPage() {
  return (
    <div style={{padding:32,color:'#dbeafe',fontFamily:'DM Sans,sans-serif'}}>
      <h1 style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,marginBottom:8}}>Fraud Alerts</h1>
      <p style={{color:'#64748b',marginBottom:32}}>No fraud alerts at the moment.</p>
      <div style={{background:'#0f1d35',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:32,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>🛡️</div>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,marginBottom:8}}>All clear</div>
        <div style={{color:'#64748b',fontSize:14}}>No suspicious activity detected.</div>
      </div>
    </div>
  );
}
