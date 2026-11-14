import type{Profile}from'./storage.ts';
export function backupSummary(p:Profile){return{cpu:p.modes.cpu[0].played,local:p.modes.local[0].played,recent:p.recent.length,rounds:p.recent.reduce((n,m)=>n+m.rounds.length,0),engines:[...new Set(p.recent.flatMap(m=>m.rounds.map(r=>r.engineVersion??1)))].sort((a,b)=>a-b)};}
