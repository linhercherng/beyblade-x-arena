import type{Round}from'./match.ts';
const REASONS={spin:'對手轉速耗盡，判定旋轉終結。',burst:'對手的爆裂耐久耗盡，判定爆裂終結。',over:'對手被判定越界，屬越界終結。',extreme:'對手由極限出口被判定出界，屬極限終結。'};
export function roundInsight(round:Round){
 const number=(value:number|undefined,digits=1)=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(digits):'未記錄';
 const reports=[0,1].map(p=>round.reports[p]?.id===round.beys[p]?round.reports[p]:undefined);
 const rows=[
  {label:'發射力量',values:[0,1].map(p=>Number.isFinite(round.inputs[p]?.power)?Math.round(round.inputs[p].power*100)+'%':'未記錄')},
  {label:'發射傾角',values:[0,1].map(p=>Number.isFinite(round.inputs[p]?.angle)?round.inputs[p].angle+'°':'未記錄')},
  {label:'發射落點',values:[0,1].map(p=>['內側','中間','外側'][round.inputs[p]?.lane]??'未記錄')},
  {label:'傾斜方向',values:[0,1].map(p=>round.inputs[p]?.direction===undefined?'未記錄':({'-1':'內切','0':'沿旋','1':'外切'}[String(round.inputs[p].direction)]??'未記錄'))},
  {label:'總衝量',values:reports.map(r=>number(r?.impulse))},
  {label:'最大單次衝量',values:reports.map(r=>number(r?.maxImpulse))},
  {label:'極限衝刺次數',values:reports.map(r=>number(r?.dashes,0))},
  {label:'剩餘轉速',values:reports.map(r=>r&&Number.isFinite(r.rpm)?Math.round(r.rpm*100)+'%':'未記錄')},
 ];
 return {reason:round.result.winner===null?'本場判為平手，不加分，保持原順序重打。':REASONS[round.result.finish],rows,complete:reports.every(Boolean)};
}
