import assert from'node:assert/strict';
import{execFileSync}from'node:child_process';
import{mkdirSync,writeFileSync,openSync,writeSync,closeSync}from'node:fs';
import{resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{BEYS,getBey,type Bey}from'../src/catalog.ts';
import{createBattle,stepBattle,shout,rng,ENGINE_VERSION,type Launch,type Result}from'../src/physics.ts';
import legacy from'../src/legacy-stats-v5.json'with{type:'json'};
import{BalanceObservation}from'./balance-observation.ts';
import{MODEL_SEEDS}from'./model-balance-suite.ts';

export const MUMMY_ID='ux-18-mummy-curse';
export const BOUNDARY_SEEDS=[0x52691db3,0xd04ba827,0x91e3c65d]as const;
const TYPES=['attack','defense','stamina','balance']as const;
export const BOUNDARY_PROFILES=['原觀測：雙方0.4','原觀測：0.65對1（角色各半）','原觀測：雙方1','原觀測：獨立0.4–1',
 ...[.4,.65,.85,1].flatMap(power=>[0,15,30].map(angle=>`等條件：雙方${power}／${angle}°`))];
type Groups=Record<string,{played:number;wins:number}>;
type Interval={rate:number;low:number;high:number;pairs:number};
export function pairedInterval(groups:Groups,equalTypes:boolean):Interval{
 const total=TYPES.reduce((n,t)=>n+groups[t]?.played,0);assert.ok(total>0,'缺少樣本');
 let rate=0,squares=0;
 for(const type of TYPES){
  const g=groups[type];assert.ok(g&&g.played>0&&g.played%2===0&&g.wins>=0&&g.wins<=g.played,'缺少有效配對樣本');
  const weight=equalTypes?.25:g.played/total;
  rate+=weight*g.wins/g.played;squares+=weight*weight/(g.played/2);
 }
 // Each seed contributes the mean of its two sides, bounded in [0,1].
 const margin=Math.sqrt(Math.log(40)*squares/2)*100;
 return{rate:rate*100,low:Math.max(0,rate*100-margin),high:Math.min(100,rate*100+margin),pairs:total/2};
}
export function compositionRates(groups:Groups){
 pairedInterval(groups,false);
 return Object.fromEntries(TYPES.map(type=>[type+'Heavy',TYPES.reduce((n,t)=>n+(t===type?.5:1/6)*groups[t].wins/groups[t].played*100,0)]));
}
export function boundaryDecision(batches:readonly{raw:Pick<Interval,'low'|'high'>;equal:Pick<Interval,'low'|'high'>}[]){
 assert.equal(batches.length,3,'確認需完整三批');
 if(batches.every(b=>b.raw.high<40&&b.equal.high<40))return'weak';
 if(batches.every(b=>b.raw.low>60&&b.equal.low>60))return'strong';
 return'not-confirmed';
}
export function assertBoundaryRelease(report:{status:string;decision:string;battles:number}){
 assert.equal(report.status,'passed','邊界追查必須完整完成');
 assert.equal(report.battles,138240,'邊界追查缺少樣本');
 assert.equal(report.decision,'not-confirmed','確認失衡須先完成校準與新的獨立驗收，不能直接發布');
}
export function reserveSeed(seed:number,used:Set<number>){assert.ok(!used.has(seed),'獨立樣本種子重複');used.add(seed);}
export function boundaryInputs(profile:number,repeat:number,seed:number){
 assert.ok(Number.isInteger(profile)&&profile>=0&&profile<16,'未知發射情境');
 const random=rng(seed);let inputs:Launch[],shoutTicks:[number,number];
 if(profile<4){
  const powers=[[.4,.4],[.65,1],[1,1],[.4+random()*.6,.4+random()*.6]][profile];
  inputs=powers.map((power,p)=>({power,lane:(profile+p)%3,angle:profile===3?random()*30:p?30:0,direction:(Math.floor(random()*3)-1)as -1|0|1}));
  shoutTicks=profile%2?[720,840]:[-1,-1];
  if(repeat%2){inputs.reverse();shoutTicks.reverse();}
 }else{
  const power=[.4,.65,.85,1][Math.floor((profile-4)/3)],angle=[0,15,30][(profile-4)%3];
  inputs=[0,1].map(()=>({power,angle,lane:Math.floor(random()*3),direction:(Math.floor(random()*3)-1)as -1|0|1}));shoutTicks=[720,720];
 }
 return{inputs,shoutTicks};
}
const trialSeed=(first:number,index:number,repeat:number,profile:number)=>(first+index*7919+repeat*15485863+profile*32452843)>>>0;
type PairRecord={seed:number;opponent:string;repeat:number;profile:number;inputs:Launch[];shoutTicks:[number,number];results:{pool:string;side:number;result:Result}[]};
export function runBoundaryBatch(firstSeed:number,repeats=8,pool:readonly Bey[]=BEYS,record?:(r:PairRecord)=>void){
 assert.ok(Number.isInteger(firstSeed)&&firstSeed>=0&&firstSeed<=0xffffffff,'種子必須為uint32');
 assert.ok(Number.isInteger(repeats)&&repeats>=2&&repeats<=64&&repeats%2===0,'重複樣本必須為2–64偶數');
 assert.equal(new Set(pool.map(b=>b.id)).size,pool.length,'對手不得重複');
 const target=getBey(MUMMY_ID);
 const make=()=>({canonical:new BalanceObservation(),matched:new BalanceObservation(),profiles:BOUNDARY_PROFILES.map(()=>new BalanceObservation()),placements:{}as Record<string,BalanceObservation>,opponentStats:{}as Record<string,Bey['stats']>});
 const modes={current:make(),legacy:make()};
 for(const opponent of pool){
  if(opponent.id===MUMMY_ID)continue;
  const index=BEYS.findIndex(b=>b.id===opponent.id);assert.ok(index>=0,'未知對手');
  for(let repeat=0;repeat<repeats;repeat++)for(let profile=0;profile<16;profile++){
   const seed=trialSeed(firstSeed,index,repeat,profile),{inputs,shoutTicks}=boundaryInputs(profile,repeat,seed);
   const row:PairRecord={seed,opponent:opponent.id,repeat,profile,inputs,shoutTicks,results:[]};
   for(const[name,mode]of Object.entries(modes)){
    const b=name==='legacy'?{...opponent,stats:legacy[opponent.id as keyof typeof legacy]}:opponent;
    for(const side of[0,1]){
     const beys=side?[b,target]:[target,b],launches=side?[inputs[1],inputs[0]]:inputs;
     const ticks=side?[shoutTicks[1],shoutTicks[0]]:shoutTicks;
     const s=createBattle(beys[0],beys[1],launches,seed,ENGINE_VERSION);
     assert.deepEqual(s.tops[side].bey.stats,target.stats,'控制組不得改目標能力');
     mode.opponentStats[b.id]=s.tops[1-side].bey.stats;
     while(!s.result&&s.time<41){for(const p of[0,1]as const)if(s.tick===ticks[p])shout(s,p);stepBattle(s);}
     assert.ok(s.result&&s.time>=15&&s.time<=40,`${MUMMY_ID}/${b.id}/${seed}: 必須15–40秒終結`);
     mode[profile<4?'canonical':'matched'].record(s,profile);mode.profiles[profile].record(s,profile);
     if(profile>=4)for(const key of['lane:'+inputs[0].lane,'direction:'+inputs[0].direction]){
      (mode.placements[key]??=new BalanceObservation()).record(s,profile);
     }
     row.results.push({pool:name,side,result:s.result});
    }
   }
   record?.(row);
  }
 }
 const rates=(o:BalanceObservation)=>{
  const t=o.report().beys[MUMMY_ID];assert.ok(t,'沒有目標樣本');
  const complete=TYPES.every(type=>t.vsTypes[type]?.played>0);
  return{...t,raw:complete?pairedInterval(t.vsTypes,false):null,equal:complete?pairedInterval(t.vsTypes,true):null,compositions:complete?compositionRates(t.vsTypes):null};
 };
 const result=(mode:ReturnType<typeof make>)=>({targetStats:target.stats,opponentStats:mode.opponentStats,canonical:rates(mode.canonical),matched:rates(mode.matched),profiles:mode.profiles.map(rates),placements:Object.fromEntries(Object.entries(mode.placements).map(([k,o])=>[k,rates(o)]))});
 return{firstSeed,repeats,current:result(modes.current),legacy:result(modes.legacy)};
}
function checkSeedSets(){
 const used=new Set<number>();
 for(let i=0;i<BEYS.length;i++)for(let j=0;j<BEYS.length;j++){
  for(let p=0;p<4;p++)used.add((20261113+i*104729+j*7919+p*15485863)>>>0);
  if(i!==j)for(const base of Object.values(MODEL_SEEDS))for(let r=0;r<4;r++)for(let p=0;p<4;p++)used.add((base+i*104729+j*7919+r*15485863+p*32452843)>>>0);
 }
 for(const[samples,base]of[[256,1],[1024,20261112]])for(let i=0;i<4;i++)for(let j=i;j<4;j++)for(let n=0;n<samples;n++)used.add((base+n*104729+i*15485863+j*32452843)>>>0);
 for(let i=0;i<BEYS.length;i++)for(let j=0;j<4;j++)used.add((i*7919+j*104729+1234567)>>>0);
 const previous=used.size;
 for(const base of BOUNDARY_SEEDS)for(let j=0;j<BEYS.length;j++)if(BEYS[j].id!==MUMMY_ID)for(let r=0;r<8;r++)for(let p=0;p<16;p++)reserveSeed(trialSeed(base,j,r,p),used);
 return{previousUniqueSeeds:previous,newUniqueSeeds:used.size-previous,overlap:0};
}
export function runMummyInvestigation(){
 const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim(),dir=new URL('../artifacts/',import.meta.url);mkdirSync(dir,{recursive:true});
 const report={model:MUMMY_ID,engineVersion:ENGINE_VERSION,sourceCommit:git('rev-parse','HEAD'),sourceDirty:!!git('status','--porcelain'),status:'running',error:null as string|null,startedAt:new Date().toISOString(),finishedAt:null as string|null,profiles:BOUNDARY_PROFILES,
  method:'歷史邊界研究固定原91款，三批獨立種子，每款對全部其他90款、16情境×8種子×互換兩側，現有／v5對手能力以同種子對照。原觀測4組與等條件12組分開統計。',
  decisionRule:'三批現有對手等條件主分析，原始與四類等權95%配對Hoeffding區間全部同向越過40或60才確認；單條件／偏重對手不能觸發調值。',
  note:'同種子兩側是配對，不視為獨立樣本；兩個對手池是控制對照，不能加總為獨立樣本。區間假設各新種子獨立，限列明固定遊戲條件，非實物或所有玩家勝率。偏重組成是重加權，沒有新增對戰。',
  seedAudit:null as ReturnType<typeof checkSeedSets>|null,battles:0,decision:'pending',batches:[]as ReturnType<typeof runBoundaryBatch>[]};
 const save=()=>writeFileSync(new URL('mummy-boundary.json',dir),JSON.stringify(report,null,2)+'\n');save();
 const records=openSync(new URL('mummy-boundary-pairs.jsonl',dir),'w');
 try{
  report.seedAudit=checkSeedSets();save();
  for(const seed of BOUNDARY_SEEDS){
   const batch=runBoundaryBatch(seed,8,BEYS.filter(b=>Object.hasOwn(legacy,b.id)),row=>{writeSync(records,JSON.stringify(row)+'\n');report.battles+=row.results.length;});
   report.batches.push(batch);save();console.log(`[mummy] ${seed}: 原觀測${batch.current.canonical.raw!.rate.toFixed(3)}%／等條件${batch.current.matched.raw!.rate.toFixed(3)}%，四類等權${batch.current.matched.equal!.rate.toFixed(3)}%`);
  }
  report.decision=boundaryDecision(report.batches.map(b=>({raw:b.current.matched.raw!,equal:b.current.matched.equal!})));
  assert.equal(report.battles,138240);report.status='passed';return report;
 }catch(error){report.status='failed';report.error=error instanceof Error?error.message:String(error);throw error;}
 finally{
  closeSync(records);report.finishedAt=new Date().toISOString();save();
  const fmt=(x:Interval|null)=>x?`${x.rate.toFixed(3)}% [${x.low.toFixed(3)}, ${x.high.toFixed(3)}]`:'缺樣本';
  const rows=report.batches.flatMap((b,i)=>['current','legacy'].flatMap(mode=>['canonical','matched'].map(group=>{
   const t=b[mode as 'current'|'legacy'][group as 'canonical'|'matched'];return`| ${i+1} | ${mode} | ${group} | ${t.played} | ${fmt(t.raw)} | ${fmt(t.equal)} | ${t.minSeconds?.toFixed(3)}–${t.maxSeconds.toFixed(3)} |`;
  })));
  writeFileSync(new URL('mummy-boundary.md',dir),`# 古屍詛咒獨立樣本追查\n\n來源 ${report.sourceCommit}${report.sourceDirty?'（未提交）':''}；引擎${report.engineVersion}；狀態${report.status}；判斷${report.decision}；${report.battles}場。\n\n${report.method}\n\n${report.decisionRule}\n\n${report.note}\n\n| 批 | 對手池 | 條件組 | 場次 | 原始 [95%區間] | 四類等權 [95%區間] | 秒數 |\n|---|---|---|---:|---|---|---|\n${rows.join('\n')}\n\n逐條件、落點、方向與對手類型／偏重組成見JSON；每個種子的兩側及兩池實際結果見mummy-boundary-pairs.jsonl。\n`);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{runMummyInvestigation();}catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}
}
