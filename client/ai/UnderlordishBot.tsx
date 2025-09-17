// ============================================================
// === React: Floating AI Chatbot (Underlord-style) for Homepage ===
// With global BlacklistProvider context shared across app
// Extended: AI assists with keyword search, hunter notifications,
// and learns from solved posts to answer future seekers
// ============================================================
import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
  senderId?: string; // sender user id for blacklist filtering
}

interface Props {
  apiBase?: string;
  searchBase?: string;
  currentUserId?: string | null;
}

// ============================================================
// Global Blacklist context (shared)
// ============================================================
interface BlacklistContextValue {
  ids: string[];
  isBlacklisted: (id: string) => boolean;
  block: (id: string) => void;
  unblock: (id: string) => void;
}
const BlacklistContext = createContext<BlacklistContextValue | null>(null);

function getLocalBlacklist(): string[] {
  try { return JSON.parse(localStorage.getItem('bounti_blacklist') || '[]'); } catch { return []; }
}

export function BlacklistProvider({ children }: { children: React.ReactNode }){
  const [ids, setIds] = useState<string[]>(getLocalBlacklist());

  const save = useCallback((next: string[]) => {
    setIds(next);
    try { localStorage.setItem('bounti_blacklist', JSON.stringify(next)); } catch {}
  }, []);

  const isBlacklisted = useCallback((id: string) => ids.includes(id), [ids]);
  const block = useCallback((id: string) => { if (!ids.includes(id)) save([...ids, id]); }, [ids, save]);
  const unblock = useCallback((id: string) => { if (ids.includes(id)) save(ids.filter(x => x !== id)); }, [ids, save]);

  return (
    <BlacklistContext.Provider value={{ ids, isBlacklisted, block, unblock }}>
      {children}
    </BlacklistContext.Provider>
  );
}

export function useBlacklistCtx(){
  const ctx = useContext(BlacklistContext);
  if (!ctx) throw new Error('useBlacklistCtx must be inside BlacklistProvider');
  return ctx;
}

// ============================================================
// UnderlordishBot component
// ============================================================
export default function UnderlordishBot({ apiBase, searchBase, currentUserId }: Props){
  const api = apiBase || process.env.NEXT_PUBLIC_AI_ENDPOINT || 'http://localhost:8789';
  const usingFallbackApi = !apiBase && !process.env.NEXT_PUBLIC_AI_ENDPOINT;
  if (usingFallbackApi && process.env.NODE_ENV === 'development') {
    console.warn('[UnderlordishBot] NEXT_PUBLIC_AI_ENDPOINT not set, using fallback', api);
  }
  const search = searchBase || process.env.NEXT_PUBLIC_SEARCH_API || '';
  const usingFallbackSearch = !searchBase && !process.env.NEXT_PUBLIC_SEARCH_API;
  if (usingFallbackSearch && process.env.NODE_ENV === 'development') {
    console.warn('[UnderlordishBot] NEXT_PUBLIC_SEARCH_API not set, fuzzy search disabled');
  }

  const { isBlacklisted, block, unblock } = useBlacklistCtx();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: crypto.randomUUID(), role:'assistant', ts: Date.now(), senderId: 'system', content:
`Hi! I’m your Bounti helper. I can:
• Draft post titles, estimate bounty ranges
• Find similar posts & notify top hunters on keywords
• Summarize replies & highlight approved hunters
• Learn from solved posts to suggest solutions in future
\nQuick tips:\n• Don’t share passwords or wallet keys.\n• Never grant remote control during screen share.\n• You can block users to never receive their post notices.`
  }]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(()=>{
    try { if (localStorage.getItem('bounti_ai_banner_dismissed') === '1') setBannerDismissed(true); } catch {}
  },[]);

  useEffect(()=>{
    if(!open) return;
    const el = document.querySelector('#bounti-ai-chat-input') as HTMLTextAreaElement | null;
    el?.focus();
  },[open]);

  async function handleSlashCommand(raw: string){
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === '/notify-hunters') {
      const postId = (raw.match(/post:([a-z0-9-]+)/i)?.[1]) || '';
      if (!postId) {
        setMessages(m=>[...m, { id: crypto.randomUUID(), role:'assistant', senderId:'ai-bot', ts: Date.now(), content: 'Usage: /notify-hunters post:<POST_ID>' }]);
        return;
      }
      try{
        const r = await fetch(`${api.replace(/\/$/,'')}/ai/notify-hunters`, {
          method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ postId })
        });
        const j = await r.json();
        setMessages(m=>[...m, { id: crypto.randomUUID(), role:'assistant', senderId:'ai-bot', ts: Date.now(),
          content: j?.ok
            ? `Notified ${Array.isArray(j.notified)? j.notified.length : 0} hunters.\nKeywords: ${(j.keywords||[]).join(', ')}`
            : `Notify failed: ${j?.error || 'unknown error'}`
        }]);
      } catch(e:any){
        setMessages(m=>[...m, { id: crypto.randomUUID(), role:'assistant', senderId:'ai-bot', ts: Date.now(), content: `Notify failed: ${e?.message||e}` }]);
      }
      return;
    }

    if (cmd === '/suggest') {
      const postId = (raw.match(/post:([a-z0-9-]+)/i)?.[1]) || '';
      try{
        const payload = postId ? { postId } : { text: raw.replace(/^\\/suggest\\s*/,'') };
        const r = await fetch(`${api.replace(/\/$/,'')}/ai/suggest-solution`, {
          method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (j?.error) throw new Error(j.error);
        const lines = [
          `Keywords: ${(j.keywords||[]).join(', ')}`,
          ...(Array.isArray(j.suggestions)? j.suggestions.map((s:any, i:number)=>`#${i+1} Post ${s.postId}: ${s.snippet}`) : [])
        ];
        setMessages(m=>[...m, { id: crypto.randomUUID(), role:'assistant', senderId:'ai-bot', ts: Date.now(), content: lines.join('\n') }]);
      } catch(e:any){
        setMessages(m=>[...m, { id: crypto.randomUUID(), role:'assistant', senderId:'ai-bot', ts: Date.now(), content: `Suggest failed: ${e?.message||e}` }]);
      }
      return;
    }
  }

  async function send(){
    const text = input.trim();
    if(!text || busy) return;

    // Slash commands
    if (text.startsWith('/notify-hunters') || text.startsWith('/suggest')) {
      setInput('');
      await handleSlashCommand(text);
      return;
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role:'user', content: text, ts: Date.now(), senderId: currentUserId || 'anon' };
    setMessages(m=>[...m, userMsg]);
    setInput('');
    setBusy(true);
    try{
      const r = await fetch(`${api.replace(/\/$/,'')}/ai/chat`, {
        method:'POST', headers:{ 'content-type':'application/json' },
        body: JSON.stringify({
          userId: currentUserId || 'anon',
          messages: [...messages, userMsg].slice(-20).map(({role,content})=>({role,content})),
          searchBase: search,
          notifyHunters: true,
          learnFromSolved: true
        })
      });
      const j = await r.json();
      const bot: ChatMessage = { id: crypto.randomUUID(), role:'assistant', senderId: 'ai-bot', content: String(j.reply||j.error||'Sorry, I had trouble responding.'), ts: Date.now() };
      setMessages(m=>[...m, bot]);
    } catch(e:any){
      setMessages(m=>[...m, { id: crypto.randomUUID(), role:'assistant', senderId: 'ai-bot', ts: Date.now(), content: `Error: ${e?.message||e}` }]);
    } finally { setBusy(false); }
  }

  function quick(text: string){ setInput(text); }

  function resetBanner(){
    try { localStorage.removeItem('bounti_ai_banner_dismissed'); } catch {}
    setBannerDismissed(false);
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={()=>setOpen(o=>!o)}
        style={{ position:'fixed', right:20, bottom:20, zIndex:1000,
                 borderRadius:999, padding:'12px 16px', boxShadow:'0 6px 20px rgba(0,0,0,.15)',
                 background:'#111827', color:'#fff', border:'none', fontWeight:700 }}>
        {open? '× Close Bounti AI' : 'Ask Bounti AI'}
      </button>

      {open && (
        <div style={{ position:'fixed', right:20, bottom:80, width:360, maxWidth:'92vw',
                       background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
                       boxShadow:'0 16px 40px rgba(0,0,0,.18)', overflow:'hidden', zIndex:1000 }}>
          <header style={{ padding:'10px 12px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <strong>Bounti AI</strong>
              <span style={{ color:'#64748b', fontSize:12, marginLeft:6 }}>Underlord-style helper</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={resetBanner} style={{ fontSize:11, border:'none', background:'transparent', color:'#64748b', cursor:'pointer' }}>Reset warnings</button>
            </div>
          </header>

          {/* Env warnings banner */}
          {(usingFallbackApi || usingFallbackSearch) && !bannerDismissed && (
            <div style={{ background:'#FEF9C3', color:'#854d0e', fontSize:12, padding:'6px 10px', borderBottom:'1px solid #fde68a', position:'relative', animation:'fadeIn 0.25s ease-in-out'}}>
              {usingFallbackApi and <div>⚠️ Using fallback AI endpoint: {api}</div>}
              {usingFallbackSearch and <div>⚠️ Fuzzy search disabled (no SEARCH_API configured)</div>}
              <button onClick={() => { setBannerDismissed(true); try{ localStorage.setItem('bounti_ai_banner_dismissed','1'); }catch{} }}
                style={{ position:'absolute', top:4, right:6, background:'transparent', border:'none', cursor:'pointer', color:'#854d0e' }}>×</button>
            </div>
          )}

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px);} to { opacity: 1; transform: translateY(0);} }
            @keyframes fadeOut { from { opacity: 1; transform: translateY(0);} to { opacity: 0; transform: translateY(-4px);} }
            .fade-in { animation: fadeIn 0.25s ease-in-out forwards; }
            .fade-out { animation: fadeOut 0.25s ease-in-out forwards; }
          `}</style>

          <div style={{ maxHeight:360, overflow:'auto', padding:12 }}>
            {messages.filter(m => !m.senderId || !isBlacklisted(m.senderId)).map(m=> (
              <div key={m.id} style={{ marginBottom:10, display:'flex', justifyContent: m.role==='user'? 'flex-end':'flex-start' }}>
                <div style={{ background: m.role==='user'? '#111827':'#F1F5F9', color: m.role==='user'? '#fff':'#0f172a', padding:'8px 10px', borderRadius:10, maxWidth:'85%' }}>
                  {m.content}
                  {m.senderId && (
                    <button onClick={()=>isBlacklisted(m.senderId!) ? unblock(m.senderId!) : block(m.senderId!)} style={{ marginLeft:8, fontSize:10, border:'1px solid #cbd5e1', borderRadius:4, background:'#fff', cursor:'pointer' }}>
                      {isBlacklisted(m.senderId!) ? 'Unblock' : 'Block'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && <div style={{ color:'#64748b', fontSize:12 }}>…thinking</div>}
          </div>

          {/* Quick actions */}
          <div style={{ padding:'6px 12px', borderTop:'1px solid #e5e7eb', display:'flex', gap:6, flexWrap:'wrap' }}>
            <Quick label="Draft post title" onClick={()=>quick('Draft a concise, searchable title for my problem: <describe briefly>.')}/>
            <Quick label="Suggest bounty" onClick={()=>quick('What bounty range makes sense for this task? Consider complexity & urgency.')}/>
            <Quick label="Find hunters" onClick={()=>quick('/notify-hunters post:<POST_ID>')}/>
            <Quick label="Suggest solution" onClick={()=>quick('/suggest post:<POST_ID> or paste text')}/>
          </div>

          {/* Composer */}
          <div style={{ padding:10, borderTop:'1px solid #e5e7eb', display:'flex', gap:8 }}>
            <textarea id="bounti-ai-chat-input" value={input} onChange={e=>setInput(e.target.value)}
              rows={2} placeholder="Ask me anything about posting, bounties, hunters, or finding help…"
              style={{ flex:1, resize:'none', border:'1px solid #cbd5e1', borderRadius:8, padding:8 }} />
            <button disabled={busy || !input.trim()} onClick={send} style={{ minWidth:74, borderRadius:8, border:'none', background:'#111827', color:'#fff' }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

function Quick({ label, onClick }:{ label:string; onClick:()=>void }){
  return <button onClick={onClick} style={{ fontSize:12, padding:'6px 8px', borderRadius:999, border:'1px solid #e5e7eb', background:'#fff' }}>{label}</button>;
}
