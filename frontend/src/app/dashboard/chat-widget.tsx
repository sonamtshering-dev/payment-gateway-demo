'use client';
import { useState, useRef, useEffect } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  "What's my revenue today?",
  "Show recent failed payments",
  "What's my success rate?",
  "How many pending payments?",
];

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function BotAvatar({ size = 28, wave = false }: { size?: number; wave?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
      position: 'relative',
    }}>
      {/* robot face */}
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="7" width="16" height="12" rx="3" fill="white" fillOpacity="0.95"/>
        <rect x="9" y="2" width="6" height="5" rx="1.5" fill="white" fillOpacity="0.8"/>
        <line x1="12" y1="7" x2="12" y2="7" stroke="rgba(99,102,241,0.6)" strokeWidth="1"/>
        <circle cx="9" cy="13" r="2" fill="#6366F1"/>
        <circle cx="15" cy="13" r="2" fill="#6366F1"/>
        <circle cx="9.7" cy="12.3" r="0.7" fill="white"/>
        <circle cx="15.7" cy="12.3" r="0.7" fill="white"/>
        <rect x="8.5" y="16.5" width="7" height="1.5" rx="0.75" fill="#6366F1" fillOpacity="0.5"/>
      </svg>
      {wave && (
        <span style={{
          position: 'absolute', bottom: -3, right: -3,
          width: size * 0.42, height: size * 0.42,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#10B981,#059669)',
          border: '2px solid white',
          animation: 'cw-glow 2s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen]           = useState(false);
  const [msgs, setMsgs]           = useState<Msg[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [reportSent, setReportSent] = useState<Set<number>>(new Set());
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 180);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content: message };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setLoading(true);
    try {
      const token = localStorage.getItem('upay_access_token');
      const history = next.slice(0, -1).slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/v1/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, history }),
      });
      const d = await res.json();
      const raw = d.data?.reply ?? (d.error || 'Something went wrong, try again.');
      setMsgs(prev => [...prev, { role: 'assistant', content: cleanMarkdown(raw) }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async (msgIndex: number) => {
    const aiMsg = msgs[msgIndex];
    const userMsg = msgIndex > 0 ? msgs[msgIndex - 1] : null;
    const token = localStorage.getItem('upay_access_token');
    const context = msgs.slice(Math.max(0, msgIndex - 4), msgIndex + 1)
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
    try {
      await fetch('/api/v1/dashboard/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: `Chat issue: "${(userMsg?.content ?? 'question').slice(0, 60)}"`,
          message: `Bad AI response reported:\n\nAI said: ${aiMsg.content}`,
          context,
        }),
      });
      setReportSent(prev => new Set(prev).add(msgIndex));
    } catch { /* silent */ }
  };

  return (
    <>
      <style>{`
        @keyframes cw-wave { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-20deg)} 60%{transform:rotate(20deg)} }
        @keyframes cw-pop { from{transform:scale(0.88) translateY(8px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes cw-panel-in { from{transform:translateY(24px) scale(0.97);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes cw-dot { 0%,80%,100%{transform:scale(0);opacity:0.3} 40%{transform:scale(1);opacity:1} }
        @keyframes cw-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0)} }
        @keyframes cw-glow { 0%,100%{opacity:0.6} 50%{opacity:1} }

        .cw-fab {
          position:fixed; bottom:28px; right:28px; z-index:9999;
          width:58px; height:58px; border-radius:50%; border:none; cursor:pointer;
          background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);
          box-shadow:0 8px 32px rgba(79,70,229,0.55), 0 2px 8px rgba(0,0,0,0.2);
          display:flex; align-items:center; justify-content:center;
          transition:transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
        }
        .cw-fab:hover { transform:scale(1.1); box-shadow:0 12px 40px rgba(79,70,229,0.65); }
        .cw-fab:active { transform:scale(0.96); }
        .cw-fab-open { background:linear-gradient(135deg,#334155,#1E293B); box-shadow:0 4px 16px rgba(0,0,0,0.3); }
        .cw-fab-ring {
          position:fixed; bottom:28px; right:28px; z-index:9998;
          width:58px; height:58px; border-radius:50%; pointer-events:none;
          animation:cw-pulse 2.5s ease-in-out infinite;
        }

        .cw-panel {
          position:fixed; bottom:100px; right:28px; z-index:9998;
          width:380px; border-radius:24px; overflow:hidden;
          background:#fff;
          box-shadow:0 32px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(79,70,229,0.12), 0 0 0 1px rgba(99,102,241,0.08);
          display:flex; flex-direction:column;
          animation:cw-panel-in 0.28s cubic-bezier(.34,1.2,.64,1);
        }
        @media(max-width:480px){
          .cw-panel{width:calc(100vw - 20px);right:10px;bottom:90px;border-radius:20px;}
          .cw-fab{bottom:16px;right:16px;}
          .cw-fab-ring{bottom:16px;right:16px;}
        }

        .cw-header {
          padding:0; flex-shrink:0; position:relative; overflow:hidden;
          background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 60%,#9333EA 100%);
        }
        .cw-header-bg {
          position:absolute; inset:0; opacity:0.15;
          background: radial-gradient(circle at 20% 50%, #fff 0%, transparent 60%),
                      radial-gradient(circle at 80% 20%, #A78BFA 0%, transparent 50%);
        }
        .cw-header-inner { position:relative; padding:18px 18px 14px; display:flex; align-items:center; gap:12px; }
        .cw-header-avatar {
          width:44px; height:44px; border-radius:14px; flex-shrink:0;
          background:rgba(255,255,255,0.18); backdrop-filter:blur(8px);
          border:1.5px solid rgba(255,255,255,0.25);
          display:flex; align-items:center; justify-content:center;
        }
        .cw-header-text { flex:1; }
        .cw-header-name { font-size:15px; font-weight:700; color:#fff; letter-spacing:-0.01em; }
        .cw-header-status { font-size:11px; color:rgba(255,255,255,0.7); display:flex; align-items:center; gap:5px; margin-top:2px; }
        .cw-status-dot { width:6px; height:6px; border-radius:50%; background:#34D399; flex-shrink:0; animation:cw-glow 2s ease-in-out infinite; }
        .cw-header-actions { display:flex; gap:4px; align-items:center; }
        .cw-icon-btn { background:rgba(255,255,255,0.15); border:none; cursor:pointer; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.85); transition:background 0.15s; }
        .cw-icon-btn:hover { background:rgba(255,255,255,0.25); }

        .cw-body {
          flex:1; overflow-y:auto; padding:16px 14px 8px;
          display:flex; flex-direction:column; gap:4px;
          min-height:300px; max-height:380px;
          background:#F8FAFC;
          scrollbar-width:thin; scrollbar-color:#E2E8F0 transparent;
        }
        .cw-body::-webkit-scrollbar { width:3px; }
        .cw-body::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:3px; }

        .cw-empty {
          flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:24px 16px; text-align:center; gap:0;
        }
        .cw-empty-avatar {
          width:64px; height:64px; border-radius:20px; margin-bottom:14px;
          background:linear-gradient(135deg,#EEF2FF,#DDD6FE);
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 16px rgba(99,102,241,0.15);
        }
        .cw-empty-title { font-size:15px; font-weight:700; color:#0F172A; margin-bottom:4px; }
        .cw-empty-sub { font-size:12px; color:#94A3B8; margin-bottom:20px; line-height:1.5; max-width:220px; }
        .cw-chips { display:flex; flex-direction:column; gap:7px; width:100%; }
        .cw-chip {
          padding:10px 14px; border-radius:12px; text-align:left; cursor:pointer;
          font-size:12.5px; font-weight:500; font-family:inherit;
          border:1.5px solid #E2E8F0; background:#fff; color:#475569;
          transition:all 0.15s; display:flex; align-items:center; gap:8px;
        }
        .cw-chip:hover { border-color:#A5B4FC; background:#EEF2FF; color:#4F46E5; transform:translateX(2px); }

        .cw-msg-row { display:flex; gap:8px; align-items:flex-end; animation:cw-pop 0.2s ease; }
        .cw-msg-row-user { flex-direction:row-reverse; margin-bottom:2px; }
        .cw-msg-row-ai { flex-direction:row; margin-bottom:2px; }
        .cw-bubble {
          max-width:80%; padding:11px 14px; border-radius:18px;
          font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word;
        }
        .cw-bubble-user {
          background:linear-gradient(135deg,#4F46E5,#7C3AED);
          color:#fff; border-bottom-right-radius:5px;
          box-shadow:0 4px 12px rgba(79,70,229,0.3);
        }
        .cw-bubble-ai {
          background:#fff; color:#1E293B; border-bottom-left-radius:5px;
          box-shadow:0 2px 8px rgba(0,0,0,0.06);
          border:1px solid rgba(0,0,0,0.05);
        }
        .cw-ai-msg-wrap { display:flex; flex-direction:column; align-items:flex-start; gap:4px; }
        .cw-report-row { padding-left:34px; display:flex; align-items:center; gap:6px; }
        .cw-report-btn {
          background:#fff; border:1.5px solid #E2E8F0; cursor:pointer; font-size:11.5px; color:#475569;
          font-family:inherit; padding:5px 12px; border-radius:8px; transition:all 0.15s;
          display:inline-flex; align-items:center; gap:5px; font-weight:600; letter-spacing:-0.01em;
          box-shadow:0 1px 3px rgba(0,0,0,0.06);
        }
        .cw-report-btn:hover { color:#EF4444; background:#FEF2F2; border-color:#FCA5A5; box-shadow:0 2px 8px rgba(239,68,68,0.15); }
        .cw-report-sent { font-size:11px; color:#10B981; font-weight:600;
          background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:8px; padding:5px 12px;
          display:inline-flex; align-items:center; gap:5px; }

        .cw-typing { display:flex; gap:4px; align-items:center; padding:2px 0; }
        .cw-dot { width:7px; height:7px; border-radius:50%; background:#A5B4FC; animation:cw-dot 1.4s ease-in-out infinite; }
        .cw-dot:nth-child(2){animation-delay:0.18s} .cw-dot:nth-child(3){animation-delay:0.36s}

        .cw-footer {
          padding:12px 14px 14px; flex-shrink:0;
          background:#fff; border-top:1px solid #F1F5F9;
        }
        .cw-input-wrap {
          display:flex; gap:8px; align-items:center;
          background:#F1F5F9; border-radius:14px; padding:4px 4px 4px 14px;
          border:1.5px solid transparent; transition:border-color 0.15s, background 0.15s;
        }
        .cw-input-wrap:focus-within { border-color:#A5B4FC; background:#fff; }
        .cw-input {
          flex:1; border:none; background:transparent; outline:none;
          font-size:13px; font-family:inherit; color:#0F172A; padding:6px 0;
        }
        .cw-input::placeholder { color:#94A3B8; }
        .cw-send {
          width:36px; height:36px; border-radius:10px; border:none; cursor:pointer; flex-shrink:0;
          background:linear-gradient(135deg,#4F46E5,#7C3AED);
          display:flex; align-items:center; justify-content:center;
          transition:opacity 0.15s, transform 0.15s;
        }
        .cw-send:disabled { opacity:0.35; cursor:not-allowed; }
        .cw-send:not(:disabled):hover { opacity:0.9; transform:scale(1.05); }
      `}</style>

      {/* Pulse ring (only when closed) */}
      {!open && <div className="cw-fab-ring" />}

      {/* Floating button */}
      <button className={`cw-fab ${open ? 'cw-fab-open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="NovaPay Assistant">
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <BotAvatar size={34} wave={true} />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="cw-panel">
          {/* Header */}
          <div className="cw-header">
            <div className="cw-header-bg" />
            <div className="cw-header-inner">
              <div className="cw-header-avatar">
                <BotAvatar size={30} />
              </div>
              <div className="cw-header-text">
                <div className="cw-header-name">NovaPay AI</div>
                <div className="cw-header-status">
                  <div className="cw-status-dot" />
                  Online · Always ready
                </div>
              </div>
              <div className="cw-header-actions">
                {msgs.length > 0 && (
                  <button className="cw-icon-btn" title="Clear chat" onClick={() => { setMsgs([]); setReportSent(new Set()); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                  </button>
                )}
                <button className="cw-icon-btn" title="Close" onClick={() => setOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="cw-body">
            {msgs.length === 0 ? (
              <div className="cw-empty">
                <div className="cw-empty-avatar">
                  <BotAvatar size={40} wave={true} />
                </div>
                <div className="cw-empty-title">Hey there!</div>
                <div className="cw-empty-sub">I'm your AI assistant. Ask me about payments, revenue, or anything in your dashboard.</div>
                <div className="cw-chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="cw-chip" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {msgs.map((m, i) => (
                  <div key={i} style={{marginBottom: 8}}>
                    <div className={`cw-msg-row cw-msg-row-${m.role === 'user' ? 'user' : 'ai'}`}>
                      {m.role === 'assistant' && <BotAvatar size={26} />}
                      <div className={`cw-bubble cw-bubble-${m.role === 'user' ? 'user' : 'ai'}`}>
                        {m.content}
                      </div>
                      {m.role === 'user' && (
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#0EA5E9,#2563EB)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff',
                        }}>M</div>
                      )}
                    </div>
                    {m.role === 'assistant' && (
                      <div className="cw-report-row" style={{marginTop: 6}}>
                        {reportSent.has(i) ? (
                          <span className="cw-report-sent">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Reported to admin
                          </span>
                        ) : (
                          <button className="cw-report-btn" onClick={() => submitReport(i)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Report Issue
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="cw-msg-row cw-msg-row-ai">
                    <BotAvatar size={26} />
                    <div className="cw-bubble cw-bubble-ai">
                      <div className="cw-typing">
                        <div className="cw-dot"/><div className="cw-dot"/><div className="cw-dot"/>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="cw-footer">
            <div className="cw-input-wrap">
              <input
                ref={inputRef}
                className="cw-input"
                placeholder="Ask about revenue, payments…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={loading}
              />
              <button className="cw-send" onClick={() => send()} disabled={!input.trim() || loading}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
