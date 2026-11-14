import{getBey}from'./catalog.ts';import{createBattle,stepBattle,shout,DT,type BattleEvent}from'./physics.ts';import type{Round}from'./match.ts';
export function replayAt(round:Round,seconds:number,onEvent?:(event:BattleEvent)=>void){
 if(Number.isNaN(seconds)||seconds<0)throw new RangeError('重播時間無效');
 const b=createBattle(getBey(round.beys[0]),getBey(round.beys[1]),round.inputs,round.seed,round.engineVersion??1);
 const target=Math.min(14400,Math.round(seconds/DT));
 while(!b.result&&b.tick<target){for(const p of [0,1]as const)if(round.shouts[p].includes(b.tick))shout(b,p);stepBattle(b);if(onEvent)for(const e of b.events)onEvent(e);}
 if(seconds===Infinity&&!b.result)throw new Error('此紀錄在120秒內未能重播完成');
 return b;
}
export function replayMoments(round:Round){
 const hits:{time:number;strength:number;kind:'hit'}[]=[];
 const b=replayAt(round,Infinity,e=>{if(e.type==='hit')hits.push({time:e.time,strength:e.strength,kind:'hit'});});
 const chosen:typeof hits=[];
 for(const h of hits.sort((a,b)=>b.strength-a.strength)){if(chosen.every(c=>Math.abs(c.time-h.time)>=.75))chosen.push(h);if(chosen.length===5)break;}
 return{result:b.result!,duration:b.time,moments:[{time:0,kind:'start'},...chosen,{time:b.time,kind:'finish'}].sort((a,b)=>a.time-b.time)};
}
