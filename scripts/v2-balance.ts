import assert from'node:assert/strict';
import{execFileSync}from'node:child_process';
import{mkdirSync,writeFileSync}from'node:fs';
import{resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{BEYS}from'../src/catalog.ts';
import{ENGINE_VERSION}from'../src/physics.ts';
import{CATALOG_REVISIONS}from'../src/catalog-revisions.ts';
import{runModelTrial,assertModelTrial,MODEL_PROFILES,type ModelTrial}from'./model-balance-suite.ts';

export function runV2Balance(){
 const ids=Object.values(CATALOG_REVISIONS).map(r=>r.battleId),seeds={calibration:0x6c3a1985,validation:0x17c09e43},repeats=4;
 const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const report={sourceCommit:git('rev-parse','HEAD'),sourceDirty:!!git('status','--porcelain'),engineVersion:ENGINE_VERSION,status:'running',error:null as string|null,
  method:'兩款V2各對所有其他92款；四種發射情境、每情境四個種子，同種子同輸入互換玩家側。校準與保留驗收分開，平手計入分母；原始與四類等權勝率皆須40–60%，全部對決15–40秒。',
  note:'固定遊戲條件的模擬估值，非實物勝率。只校準新增型號，不改原91款或物理時間限制。',profiles:MODEL_PROFILES,seeds,repeats,roster:BEYS.length,battles:0,
  sets:{}as Record<string,Record<string,ModelTrial>>};
 const dir=new URL('../artifacts/',import.meta.url);mkdirSync(dir,{recursive:true});
 const save=()=>writeFileSync(new URL('v2-balance.json',dir),JSON.stringify(report,null,2)+'\n');save();
 try{
  assert.equal(ids.length,2);assert.equal(BEYS.length,93);assert.notEqual(seeds.calibration,seeds.validation);
  const used=new Set<number>();
  for(const seed of Object.values(seeds))for(const id of ids){
   const ai=BEYS.findIndex(b=>b.id===id);assert.ok(ai>=0);
   for(let bj=0;bj<BEYS.length;bj++)if(BEYS[bj].id!==id)for(let r=0;r<repeats;r++)for(let p=0;p<4;p++){
    const actual=(seed+ai*104729+bj*7919+r*15485863+p*32452843)>>>0;
    assert.ok(!used.has(actual),'V2校準與驗收種子不得重複');used.add(actual);
   }
  }
  for(const[name,seed]of Object.entries(seeds)){
   const set=report.sets[name]={};
   for(const id of ids){
    const trial=set[id]=runModelTrial(id,seed,repeats);
    report.battles+=trial.played;save();
    console.log(`[V2] ${name}/${id}: ${trial.winRate}% / equal ${trial.equalTypeWin.toFixed(3)}%, ${trial.minSeconds}–${trial.maxSeconds}s`);
   }
  }
  for(const set of Object.values(report.sets))for(const trial of Object.values(set))assertModelTrial(trial);
  assert.equal(report.battles,ids.length*Object.keys(seeds).length*(BEYS.length-1)*4*repeats*2);
  report.status='passed';return report;
 }catch(error){report.status='failed';report.error=error instanceof Error?error.message:String(error);throw error;}
 finally{save();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{runV2Balance();}catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}
}
