import{test}from'node:test';
import assert from'node:assert/strict';
import{BEYS,getBey}from'../src/catalog.ts';
import{createBattle,stepBattle,shout,ENGINE_VERSION,type Launch}from'../src/physics.ts';
import legacy from'../src/legacy-stats-v5.json'with{type:'json'};
import legacyV6 from'../src/legacy-stats-v6.json'with{type:'json'};
import frozen from'./fixtures/v5-model-balance.json'with{type:'json'};
import adjustments from'../src/model-balance.json'with{type:'json'};

test('新版校準使用新引擎，v5重播恢復改值前的91款能力',()=>{
 assert.equal(Object.keys(legacy).length,91);
 const e=frozen.cases[0],original=getBey(e.beys[0]);
 const altered={...original,stats:{atk:1,def:1,sta:1,dash:1,burst:1,weight:1}};
 const s=createBattle(altered,getBey(e.beys[1]),e.inputs as Launch[],e.seed,5);
 assert.deepEqual(s.tops[0].bey.stats,legacy[original.id as keyof typeof legacy]);
 assert.equal(ENGINE_VERSION,7);
});

test('12款v5原始能力、48組中途運動與最終結果逐值一致',()=>{
 assert.equal(frozen.cases.length,Object.keys(adjustments).length*4);
 for(const e of frozen.cases){
  const s=createBattle(getBey(e.beys[0]),getBey(e.beys[1]),e.inputs as Launch[],e.seed,5);
  while(!s.result&&s.time<40){
   for(const p of[0,1]as const)if(e.shouts[p].includes(s.tick))shout(s,p);
   stepBattle(s);
   const expected=e.states.find(v=>v.tick===s.tick);
   // JSON snapshots canonicalize negative zero; every other numeric value remains exact.
   if(expected)for(const p of[0,1]as const)for(const[key,value]of Object.entries(expected.tops[p]))assert.equal(JSON.stringify(s.tops[p][key as keyof typeof s.tops[0]]),JSON.stringify(value),`${e.beys[0]}/${s.tick}/${p}/${key}`);
  }
  assert.deepEqual(s.result,e.result);
 }
});

test('只有12款的耐力校準，其他能力、未標記型號與原廠零件不變',()=>{
 assert.equal(Object.keys(adjustments).length,12);
 for(const[id,delta]of Object.entries(adjustments)){assert.ok(BEYS.some(b=>b.id===id));assert.ok(Number.isInteger(delta)&&delta!==0);}
 for(const b of BEYS.filter(b=>Object.hasOwn(legacy,b.id))){
  const old=legacy[b.id as keyof typeof legacy];
  assert.deepEqual({...b.stats,sta:old.sta},old);
  assert.equal(b.stats.sta,old.sta+((adjustments as Record<string,number>)[b.id]??0));
  assert.ok(Object.values(b.stats).every(v=>Number.isFinite(v)&&v>=1&&v<=100));
 }
});

test('v6試跑能力凍結，額外校準不改變既有v6紀錄的91款能力',()=>{
 assert.equal(Object.keys(legacyV6).length,91);
 for(const b of BEYS.filter(b=>Object.hasOwn(legacy,b.id))){
  const s=createBattle({...b,stats:{...b.stats,sta:1}},b,[{power:.9,lane:1,angle:10},{power:.9,lane:1,angle:10}],123,6);
  assert.deepEqual(s.tops[0].bey.stats,legacyV6[b.id as keyof typeof legacyV6]);
 }
});
