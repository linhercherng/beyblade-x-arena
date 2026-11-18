import type{Battle}from'../src/physics.ts';
type Counts={played:number;wins:number;losses:number;draws:number;seconds:number;minSeconds:number;maxSeconds:number;finishes:Record<string,number>};
const counts=():Counts=>({played:0,wins:0,losses:0,draws:0,seconds:0,minSeconds:Infinity,maxSeconds:0,finishes:{spin:0,burst:0,over:0,extreme:0}});
const round=(n:number)=>Math.round(n*1000)/1000;
const summary=(c:Counts)=>({...c,minSeconds:c.played?c.minSeconds:null,meanSeconds:c.played?round(c.seconds/c.played):null,winRate:c.played?round(c.wins/c.played*100):null,scoreRate:c.played?round((c.wins+c.draws*.5)/c.played*100):null});
type Entry=Counts&{name:string;zhName:string;type:string;spin:string;sides:[Counts,Counts];profiles:Record<string,Counts>;vsTypes:Record<string,Counts>};
export class BalanceObservation{
 private battles=0;
 private beys:Record<string,Entry>={};
 private pairs:Record<string,Counts>={};
 record(s:Readonly<Battle>,profile:number){
  if(!s.result)throw Error('觀測只接受已終結對戰');
  this.battles++;
  for(const p of [0,1] as const){
   const b=s.tops[p].bey,opponent=s.tops[1-p].bey;
   const entry=this.beys[b.id]??=Object.assign(counts(),{name:b.name,zhName:b.zhName,type:b.type,spin:b.spin,sides:[counts(),counts()] as [Counts,Counts],profiles:{},vsTypes:{}});
   const groups=[entry,entry.sides[p],entry.profiles[profile]??=counts(),entry.vsTypes[opponent.type]??=counts(),this.pairs[b.id+':'+opponent.id]??=counts()];
   for(const c of groups){c.played++;c.seconds+=s.time;c.minSeconds=Math.min(c.minSeconds,s.time);c.maxSeconds=Math.max(c.maxSeconds,s.time);c.finishes[s.result.finish]++;if(s.result.winner===null)c.draws++;else if(s.result.winner===p)c.wins++;else c.losses++;}
  }
 }
 report(){
  const groups=(v:Record<string,Counts>)=>Object.fromEntries(Object.entries(v).map(([k,c])=>[k,summary(c)]));
  const beys=Object.fromEntries(Object.entries(this.beys).map(([id,e])=>{const {sides,profiles,vsTypes,...base}=e;return[id,{...base,...summary(base),sides:sides.map(summary),profiles:groups(profiles),vsTypes:groups(vsTypes)}];}));
  return {battles:this.battles,method:'既有allPairs固定種子與四組發射情境，等量型號對手、兩個玩家位置；每場計雙方出戰，同型號亦計兩次。勝率平手計入分母，得分率平手各半分。',profiles:['雙方0.4力量／固定傾角','0.65對1力量／固定傾角＋呼喊','雙方1力量／固定傾角','0.4–1隨機力量／隨機傾角＋呼喊'],beys,pairs:groups(this.pairs),flags:Object.entries(beys).filter(([,b])=>b.played>=200&&b.winRate!==null&&(b.winRate<40||b.winRate>60)).map(([id,b])=>({id,played:b.played,winRate:b.winRate})),note:'型號分布不同於四類等量驗收。單一有向配對只有8次出戰（4情境×兩個位置），屬少量樣本；離群僅供檢查，不作40–60%阻擋門檻、不推論實物強弱。'};
 }
}
export function observationMarkdown(r:ReturnType<BalanceObservation['report']>){
 const rows=Object.entries(r.beys).sort((a,b)=>(b[1].winRate??0)-(a[1].winRate??0)||a[0].localeCompare(b[0]));
 return `# 各型號平衡觀測\n\n${r.method}\n\n${r.note}\n\n共 ${r.battles} 場；${rows.length} 款。原類型、時長與終結門檻另由 balance-check.json 驗收。\n\n發射情境（輸入力量；引擎沿用既有可用範圍）：\n${r.profiles.map((p,i)=>`- ${i}：${p}`).join('\n')}\n\n| 型號 | 中文名稱 | 類型／旋向 | 出戰 | 勝率 | 得分率 | 最短／最長秒 |\n|---|---|---|---:|---:|---:|---:|\n${rows.map(([id,b])=>`| ${id} | ${b.zhName} | ${b.type}／${b.spin} | ${b.played} | ${b.winRate}% | ${b.scoreRate}% | ${(b.minSeconds?.toFixed(3)??'—')}／${b.maxSeconds.toFixed(3)} |`).join('\n')}\n\n完整 JSON 另列玩家位置、對手類型、發射情境、有向型號配對及四種終結計數（含勝負雙方，不等同勝出終結）。\n`;
}
