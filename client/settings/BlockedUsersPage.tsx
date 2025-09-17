import React, { useEffect, useState } from 'react';
export default function BlockedUsersPage({ currentUserId, apiBase }:{ currentUserId: string; apiBase?: string; }){
  const base = (apiBase || process.env.NEXT_PUBLIC_BLOCKS_API || 'http://localhost:8797').replace(/\/$/,''); 
  const [blocked, setBlocked] = useState<string[]>([]);
  const [addingId, setAddingId] = useState('');
  async function refresh(){
    const r = await fetch(`${base}/blocks`, { headers: { 'x-user-id': currentUserId }});
    const j = await r.json(); setBlocked(Array.isArray(j.blocked)? j.blocked:[]);
  }
  useEffect(()=>{ refresh(); }, [currentUserId]);
  async function block(id: string){ await fetch(`${base}/blocks/${id}`, { method:'POST', headers: { 'x-user-id': currentUserId }}); refresh(); }
  async function unblock(id: string){ await fetch(`${base}/blocks/${id}`, { method:'DELETE', headers: { 'x-user-id': currentUserId }}); refresh(); }
  return (<div style={{maxWidth:720, margin:'24px auto', padding:'0 16px'}}>
    <h2>Blocked Users</h2>
    <div style={{display:'flex', gap:8, margin:'12px 0 20px'}}>
      <input value={addingId} onChange={e=>setAddingId(e.target.value)} placeholder="Enter user ID to block"
             style={{ flex:1, border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px' }}/>
      <button onClick={()=>block(addingId)} style={{ padding:'8px 12px' }}>Block</button>
    </div>
    <ul>{blocked.map(id => <li key={id} style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}>
      <span>{id}</span><button onClick={()=>unblock(id)}>Unblock</button></li>)}</ul>
  </div>);
}
