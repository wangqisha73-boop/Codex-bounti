import React, { useEffect, useRef, useState } from 'react';
export function DotsMenu({ children }:{ children: React.ReactNode }){
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{ const fn=(e:MouseEvent)=>{ if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn); return ()=>document.removeEventListener('mousedown', fn); },[]);
  return (<div ref={ref} style={{ position:'relative' }}>
    <button aria-label="More" onClick={()=>setOpen(!open)} style={{ width:28, height:28, borderRadius:999, border:'1px solid #e5e7eb', background:'#fff' }}>⋯</button>
    {open && <div style={{ position:'absolute', right:0, top:34, minWidth:180, background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)'}}>{children}</div>}
  </div>);
}
export function DotsItem({ onClick, children, danger=false }:{ onClick:()=>void; children: React.ReactNode; danger?: boolean }){
  return <button onClick={onClick} style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 10px', background:'#fff', border:'none', color: danger? '#B91C1C':'#0f172a' }}>{children}</button>;
}
