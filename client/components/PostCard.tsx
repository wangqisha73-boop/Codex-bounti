import React from 'react';
import { BlockMenu } from './BlockMenu';
import { useBlacklistCtx } from '../ai/UnderlordishBot';
export function PostCard({ id, title, excerpt, authorId, authorName, onOpen }:{ id:string; title:string; excerpt:string; authorId:string; authorName?:string; onOpen:(id:string)=>void }){
  const { isBlacklisted } = useBlacklistCtx(); if (isBlacklisted(authorId)) return null;
  return (<div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12, display:'grid', gap:8 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{title}</h3>
      <BlockMenu targetUserId={authorId} />
    </div>
    <div style={{ color:'#64748b', fontSize:12 }}>by {authorName || authorId}</div>
    <p style={{ margin:'6px 0 0' }}>{excerpt}</p>
    <div><button onClick={()=>onOpen(id)} style={{ fontSize:12, padding:'6px 10px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff' }}>Open</button></div>
  </div>);
}
