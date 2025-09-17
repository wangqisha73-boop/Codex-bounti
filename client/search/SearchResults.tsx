import React from 'react';
import { useBlacklistCtx } from '../ai/UnderlordishBot';
import { BlockMenu } from '../components/BlockMenu';
export function SearchResults({ results, onOpen }:{ results: {id:string; title:string; snippet:string; authorId:string; authorName?:string}[]; onOpen:(id:string)=>void }){
  const { ids: blocked } = useBlacklistCtx();
  const visible = results.filter(r => !blocked.includes(r.authorId));
  return (<div style={{ display:'grid', gap:10 }}>
    {visible.map(r => (<div key={r.id} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
        <div><div style={{ fontWeight:700 }}>{r.title}</div><div style={{ fontSize:12, color:'#64748b' }}>by {r.authorName || r.authorId}</div></div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>onOpen(r.id)} style={{ fontSize:12, padding:'6px 10px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff' }}>Open</button>
          <BlockMenu targetUserId={r.authorId} />
        </div>
      </div>
      <div style={{ marginTop:6 }}>{r.snippet}</div>
    </div>))}
    {visible.length === 0 && (<div style={{ color:'#64748b', fontSize:12 }}>No results (filtered by your blocked list or none match).</div>)}
  </div>);
}
