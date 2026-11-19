import assert from'node:assert/strict';
import{BEYS,getBey,type Bey}from'../src/catalog.ts';
import{createBattle,stepBattle,shout,rng,ENGINE_VERSION,type Launch}from'../src/physics.ts';
import{BalanceObservation}from'./balance-observation.ts';

export const MODEL_SEEDS={calibration:0x3782a4c1,validation:0xb719d263}as const;
export const MODEL_PROFILES=['雙方65%／0°／中圈／沿旋','雙方100%／15°／外圈／內切＋同時呼喊','雙方85%／30°／內圈／外切','獨立65–100%／傾角／落點／方向＋同時呼喊'];
export function equalTypeRate(groups:Record<string,{wins:number;played:number}>){
 return ['attack','defense','stamina','balance'].reduce((sum,type)=>{
  const g=groups[type];assert.ok(g&&g.played>0&&g.wins>=0&&g.wins<=g.played,`缺少有效${type}樣本`);
  return sum+g.wins/g.played*25;
 },0);
}

export function runModelTrial(id:string,firstSeed:number,repeats=4,version:5|6|7=ENGINE_VERSION,pool:readonly Bey[]=BEYS){
 assert.ok(Number.isInteger(firstSeed)&&firstSeed>=0&&firstSeed<=0xffffffff,'種子必須是uint32');
 assert.ok(Number.isInteger(repeats)&&repeats>=1&&repeats<=64,'重複樣本必須為1–64');
 assert.equal(new Set(pool.map(b=>b.id)).size,pool.length,'對手不得重複');
 const a=getBey(id),ai=BEYS.indexOf(a),observation=new BalanceObservation();
 const opponentStats:Record<string,Bey['stats']>={};let targetStats:Bey['stats']=a.stats;
 const wins={spin:0,burst:0,over:0,extreme:0},losses={...wins};
 for(const b of pool){
  if(b.id===id)continue;
  const bj=BEYS.findIndex(v=>v.id===b.id);assert.ok(bj>=0,'未知對手');
  for(let repeat=0;repeat<repeats;repeat++)for(let profile=0;profile<4;profile++){
   const seed=(firstSeed+ai*104729+bj*7919+repeat*15485863+profile*32452843)>>>0,random=rng(seed);
   const inputs:Launch[]=[0,1].map(()=>profile<3?
    {power:[.65,1,.85][profile],angle:[0,15,30][profile],lane:[1,2,0][profile],direction:[0,-1,1][profile]as -1|0|1}:
    {power:.65+random()*.35,angle:random()*30,lane:Math.floor(random()*3),direction:(Math.floor(random()*3)-1)as -1|0|1});
   for(const side of[0,1]){
    const beys=side?[b,a]:[a,b],launches=side?[inputs[1],inputs[0]]:inputs;
    const s=createBattle(beys[0],beys[1],launches,seed,version);
    targetStats=s.tops[side].bey.stats;opponentStats[b.id]=s.tops[1-side].bey.stats;
    while(!s.result&&s.time<41){if(profile%2&&s.tick===720){shout(s,0);shout(s,1);}stepBattle(s);}
    assert.ok(s.result&&s.time>=15&&s.time<=40,`${id}/${b.id}: 必須15–40秒終結`);
    observation.record(s,profile);
    if(s.result.winner===side)wins[s.result.finish]++;else if(s.result.winner!==null)losses[s.result.finish]++;
   }
  }
 }
 const all=observation.report(),target=all.beys[id];assert.ok(target,'沒有對戰樣本');
 return {...target,firstSeed,repeats,engineVersion:version,targetStats,opponentStats,equalTypeWin:equalTypeRate(target.vsTypes),winFinishes:wins,lossFinishes:losses,
  pairs:Object.fromEntries(Object.entries(all.pairs).filter(([key])=>key.startsWith(id+':')))};
}
export type ModelTrial=ReturnType<typeof runModelTrial>;
export function assertModelTrial(t:ModelTrial){
 assert.ok(t.played>0,'沒有對戰樣本');
 const raw=t.wins/t.played*100,equal=equalTypeRate(t.vsTypes);
 assert.ok(raw>=40&&raw<=60&&equal>=40&&equal<=60,`${t.zhName}: 勝率${raw.toFixed(3)}%／四類等權${equal.toFixed(3)}%不在40–60%`);
 assert.ok(t.minSeconds!==null&&t.minSeconds>=15&&t.maxSeconds<=40,'型號對決必須15–40秒');
}
export function assertConfirmedAdjustment(a:ModelTrial,b:ModelTrial,isolated:ModelTrial,delta:number){
 assert.notEqual(a.firstSeed,b.firstSeed,'兩批確認必須不同種子');
 const rates=[a.wins/a.played*100,b.wins/b.played*100,equalTypeRate(a.vsTypes),equalTypeRate(b.vsTypes)];
 assert.ok(Number.isInteger(delta)&&delta!==0&&rates.every(rate=>delta>0?rate<40:rate>60),'確認偏離方向必須與耐力調整一致');
 assert.equal(a.firstSeed,isolated.firstSeed,'隔離對照必須同種子');
 assert.equal(a.repeats,isolated.repeats,'隔離對照必須同樣本');
 assert.equal(a.played,isolated.played,'隔離對照必須同樣本');
 assert.deepEqual(a.opponentStats,isolated.opponentStats,'隔離對照必須固定對手能力');
 assert.deepEqual({...isolated.targetStats,sta:a.targetStats.sta},a.targetStats,'隔離對照只能改自身耐力');
 assert.equal(isolated.targetStats.sta-a.targetStats.sta,delta,'隔離耐力差異必須等於校準');
 assert.ok((isolated.wins/isolated.played-a.wins/a.played)*delta>0,'自身耐力調整必須改善確認方向');
}
