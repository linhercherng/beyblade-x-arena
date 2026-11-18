import{test}from'node:test';import assert from'node:assert/strict';import{existsSync}from'node:fs';
import{BEYS}from'../src/catalog.ts';import{createBattle,stepBattle}from'../src/physics.ts';
async function observation(){const url=new URL('../scripts/balance-observation.ts',import.meta.url);assert.ok(existsSync(url),'需提供只讀型號觀測');return import(url.href);}
function finished(a=BEYS[0],b=BEYS[1]){const s=createBattle(a,b,[{power:.9,lane:1,angle:10},{power:.9,lane:1,angle:10}],123);while(!s.result)stepBattle(s);return s;}
test('型號觀測保留中英文身份，統計兩側、配對、終結與發射情境且不修改Battle',async()=>{
 const {BalanceObservation}=await observation(),o=new BalanceObservation(),s=finished();s.result={winner:0,finish:'burst',points:2,time:s.time};const before=JSON.stringify(s);o.record(s,1);const r=o.report();assert.equal(JSON.stringify(s),before);assert.equal(r.battles,1);assert.equal(r.beys[BEYS[0].id].wins,1);assert.equal(r.beys[BEYS[1].id].losses,1);assert.equal(r.beys[BEYS[0].id].zhName,BEYS[0].zhName);assert.equal(r.beys[BEYS[0].id].sides[0].wins,1);assert.equal(r.beys[BEYS[1].id].sides[1].losses,1);assert.equal(r.beys[BEYS[0].id].finishes.burst,1);assert.equal(r.beys[BEYS[0].id].profiles[1].played,1);assert.equal(r.pairs[BEYS[0].id+':'+BEYS[1].id].winRate,100);assert.equal(r.pairs[BEYS[1].id+':'+BEYS[0].id].winRate,0);assert.equal(r.beys[BEYS[0].id].vsTypes[BEYS[1].type].played,1);
 assert.equal(r.beys[BEYS[0].id].sides[1].winRate,null);assert.equal(r.beys[BEYS[0].id].sides[1].minSeconds,null);
});
test('同型號平手計兩個出戰、0勝與各半分，不產生假勝率或改變門檻',async()=>{
 const {BalanceObservation}=await observation(),o=new BalanceObservation(),s=finished(BEYS[0],BEYS[0]);s.result={winner:null,finish:'spin',points:1,time:s.time};o.record(s,0);const r=o.report(),b=r.beys[BEYS[0].id];assert.equal(b.played,2);assert.equal(b.draws,2);assert.equal(b.wins,0);assert.equal(b.losses,0);assert.equal(b.winRate,0);assert.equal(b.scoreRate,50);assert.equal(r.pairs[BEYS[0].id+':'+BEYS[0].id].played,2);assert.equal(r.flags.length,0);
});
test('未終結不進入觀測，輸出可序列化並註明配對少量樣本限制',async()=>{
 const {BalanceObservation,observationMarkdown}=await observation(),o=new BalanceObservation(),s=finished();s.result=null;assert.throws(()=>o.record(s,0),/終結/);const r=o.report();assert.equal(r.battles,0);assert.doesNotThrow(()=>JSON.stringify(r));assert.match(observationMarkdown(r),/少量樣本/);
});
test('同型號有勝負仍只計一勝一負，不重複算成兩勝',async()=>{
 const {BalanceObservation}=await observation(),o=new BalanceObservation(),s=finished(BEYS[0],BEYS[0]);s.result={winner:0,finish:'over',points:2,time:s.time};o.record(s,2);const b=o.report().beys[BEYS[0].id];assert.equal(b.played,2);assert.equal(b.wins,1);assert.equal(b.losses,1);assert.equal(b.winRate,50);assert.equal(b.finishes.over,2);
});
