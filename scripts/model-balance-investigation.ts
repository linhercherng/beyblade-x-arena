import{execFileSync}from'node:child_process';
import{mkdirSync,writeFileSync}from'node:fs';
import{resolve}from'node:path';
import{fileURLToPath}from'node:url';
import adjustments from'../src/model-balance.json'with{type:'json'};
import legacy from'../src/legacy-stats-v5.json'with{type:'json'};
import{BEYS}from'../src/catalog.ts';
import{ENGINE_VERSION}from'../src/physics.ts';
import{MODEL_SEEDS,MODEL_PROFILES,runModelTrial,assertModelTrial,assertConfirmedAdjustment,equalTypeRate,type ModelTrial}from'./model-balance-suite.ts';

export function runModelInvestigation(){
 const ids=Object.keys(adjustments),git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const report={engineVersion:ENGINE_VERSION,baselineVersion:5,sourceCommit:git('rev-parse','HEAD'),sourceDirty:!!git('status','--porcelain'),
  status:'running',error:null as string|null,startedAt:new Date().toISOString(),finishedAt:null as string|null,repeats:4,profiles:MODEL_PROFILES,
  method:'每款對所有其他90款；四發射情境、每情境四個種子，以同種子及同輸入互換玩家側，呼喊同時。校準與保留驗收使用不同種子。原始勝率按型號等量，另列四類各25%等權結果；平手仍計入分母。',
  note:'結論限此遊戲與列明情境。相同種子的兩側是配對資料，不視為兩個獨立樣本；兩批重現方向與單變數對照用於判斷，非實物勝率或普遍統計保證。',
  battles:0,isolated:{}as Record<string,ModelTrial>,sets:{}as Record<string,{seed:number;before:Record<string,ModelTrial>;after:Record<string,ModelTrial>}>};
 const fixedOpponents=BEYS.map(b=>({...b,stats:legacy[b.id as keyof typeof legacy]??b.stats}));
 const dir=new URL('../artifacts/',import.meta.url);mkdirSync(dir,{recursive:true});
 const save=()=>writeFileSync(new URL('model-balance-investigation.json',dir),JSON.stringify(report,null,2)+'\n');
 save();
 try{
  for(const[name,seed]of Object.entries(MODEL_SEEDS)){
   const set:typeof report.sets[string]=report.sets[name]={seed,before:{},after:{}};
   for(const id of ids){
    set.before[id]=runModelTrial(id,seed,4,5);
    set.after[id]=runModelTrial(id,seed,4,ENGINE_VERSION);
    report.battles+=set.before[id].played+set.after[id].played;save();
    console.log(`[model-balance] ${name}/${id}: ${set.before[id].winRate}% → ${set.after[id].winRate}%；四類等權${set.after[id].equalTypeWin.toFixed(3)}%`);
   }
  }
  for(const id of ids){
   const trial=report.isolated[id]=runModelTrial(id,MODEL_SEEDS.calibration,4,ENGINE_VERSION,fixedOpponents);
   report.battles+=trial.played;save();
   assertConfirmedAdjustment(report.sets.calibration.before[id],report.sets.validation.before[id],trial,adjustments[id as keyof typeof adjustments]);
   console.log(`[model-balance] isolated/${id}: ${trial.winRate}%；固定全部v5對手`);
  }
  for(const set of Object.values(report.sets))for(const t of Object.values(set.after))assertModelTrial(t);
  report.status='passed';return report;
 }catch(error){report.status='failed';report.error=error instanceof Error?error.message:String(error);throw error;}
 finally{
  report.finishedAt=new Date().toISOString();save();
  const before=report.sets.calibration?.before,after=report.sets.calibration?.after,holdout=report.sets.validation;
  const rows=ids.filter(id=>before?.[id]&&after?.[id]&&holdout?.before[id]&&holdout?.after[id]).map(id=>{
   const b=before[id],a=after[id],v=holdout.after[id],old=holdout.before[id];
   const rates=[b.wins/b.played*100,old.wins/old.played*100,equalTypeRate(b.vsTypes),equalTypeRate(old.vsTypes)];
   const conclusion=rates.every(r=>r<40)?'兩批偏弱':rates.every(r=>r>60)?'兩批偏強':'未一致重現';
   const sta=legacy[id as keyof typeof legacy].sta;
   return`| ${a.zhName} | ${conclusion} | ${sta}→${sta+adjustments[id as keyof typeof adjustments]} | ${b.winRate}%／${old.winRate}% | ${report.isolated[id]?.winRate??'待測'}% | ${a.winRate}%／${v.winRate}% | ${a.equalTypeWin.toFixed(3)}%／${v.equalTypeWin.toFixed(3)}% |`;
  });
  writeFileSync(new URL('model-balance-investigation.md',dir),`# 11款型號平衡追查\n\n來源 ${report.sourceCommit}${report.sourceDirty?'（未提交變更）':''}；引擎v${report.baselineVersion}→v${report.engineVersion}；狀態${report.status}。\n\n${report.method}\n\n${report.note}\n\n共${report.battles}場，兩個版本與兩批種子分開列；校準批另以全部v5對手只改本款STA，要求改善診斷方向，並核對實際能力與種子一致。新版本兩種權重皆須40–60%，全場15–40秒。\n\n發射情境：\n${MODEL_PROFILES.map((p,i)=>`- ${i}：${p}`).join('\n')}\n\n| 中文名稱 | 原版追查 | 耐力 | 舊版校準／驗收 | 只改本款校準 | 新版校準／驗收 | 新版四類等權校準／驗收 |\n|---|---|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n\n完整JSON分列玩家側、各發射情境、對手類型／型號、平手與勝負終結，不能將不同發射條件的勝率視為同一母體。\n`);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{runModelInvestigation();}catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}
}
