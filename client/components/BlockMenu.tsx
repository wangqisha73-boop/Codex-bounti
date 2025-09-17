import React from 'react';
import { useBlacklistCtx } from '../ai/UnderlordishBot';
export function BlockMenu({ targetUserId }:{ targetUserId: string }){
  const { isBlacklisted, block, unblock } = useBlacklistCtx();
  const blocked = isBlacklisted(targetUserId);
  return (<button onClick={()=> blocked?unblock(targetUserId):block(targetUserId)} style={{ fontSize:12, padding:'4px 8px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff', color: blocked? '#B91C1C':'#0f172a' }}>{blocked? 'Unblock':'Block'}</button>);
}
