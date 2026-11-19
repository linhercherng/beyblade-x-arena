import{test}from'node:test';
import assert from'node:assert/strict';
import{existsSync}from'node:fs';
import{BEYS}from'../src/catalog.ts';
async function suite(){const url=new URL('../scripts/model-balance-suite.ts',import.meta.url);assert.ok(existsSync(url),'需提供可重現的型號配對驗收');return import('../scripts/model-balance-suite.ts');}

test('型號配對同種子互換兩側，分列四發射情境、對手類型與勝負終結',async()=>{
 const{runModelTrial}=await suite();
 const target=BEYS.find(b=>b.id==='bx-04-knight-shield')!;
 const pool=['attack','defense','stamina','balance'].map(type=>BEYS.find(b=>b.type===type&&b.id!==target.id)!);
 const a=runModelTrial(target.id,1234,1,5,pool),b=runModelTrial(target.id,1234,1,5,pool);
 assert.deepEqual(a,b);assert.equal(a.played,32);assert.deepEqual(a.sides.map(v=>v.played),[16,16]);
 assert.deepEqual(Object.values(a.profiles).map(v=>v.played),[8,8,8,8]);
 assert.equal(a.wins+a.losses+a.draws,a.played);
 assert.equal(Object.values(a.winFinishes).reduce((n,v)=>n+v,0),a.wins);
 assert.equal(Object.values(a.lossFinishes).reduce((n,v)=>n+v,0),a.losses);
 assert.ok(a.minSeconds!>=15&&a.maxSeconds<=40);
});

test('型號原始與四類等權勝率分開計算，不能用型號數量改變等權結果',async()=>{
 const{equalTypeRate}=await suite();
 const groups={attack:{wins:0,played:100},defense:{wins:1,played:1},stamina:{wins:1,played:1},balance:{wins:1,played:1}};
 assert.equal(equalTypeRate(groups),75);
 assert.throws(()=>equalTypeRate({...groups,defense:{wins:0,played:0}}),/缺少/);
});

test('型號驗收保留40–60及15–40門檻，拒絕缺樣本或只改顯示勝率',async()=>{
 const{runModelTrial,assertModelTrial}=await suite();
 const target=BEYS[0],pool=['attack','defense','stamina','balance'].map(type=>BEYS.find(b=>b.type===type&&b.id!==target.id)!);
 const measured=runModelTrial(target.id,1234,1,5,pool);
 const valid={...measured,wins:16,losses:16,draws:0,vsTypes:Object.fromEntries(Object.entries(measured.vsTypes).map(([k,v])=>[k,{...v,wins:4,losses:4,draws:0}]))};
 assert.doesNotThrow(()=>assertModelTrial(valid));
 assert.throws(()=>assertModelTrial({...valid,wins:0,winRate:50}),/勝率/);
 assert.throws(()=>assertModelTrial({...valid,minSeconds:14.99}),/15/);
 assert.throws(()=>assertModelTrial({...valid,played:0}),/樣本/);
});

test('只調確認者：兩批同向偏離，隔離對照同種子同對手且只改自身STA',async()=>{
 const{runModelTrial,assertConfirmedAdjustment}=await suite();
 const target=BEYS.find(b=>b.id==='bx-04-knight-shield')!,pool=['attack','defense','stamina','balance'].map(type=>BEYS.find(b=>b.type===type&&b.id!==target.id)!);
 const measured=runModelTrial(target.id,1234,1,5,pool);
 const before={...measured,wins:8,losses:24,draws:0,vsTypes:Object.fromEntries(Object.entries(measured.vsTypes).map(([k,v])=>[k,{...v,wins:2,losses:6,draws:0}]))};
 const holdout={...before,firstSeed:5678};
 const isolated={...before,engineVersion:6 as const,wins:16,targetStats:{...before.targetStats,sta:before.targetStats.sta+14}};
 assert.doesNotThrow(()=>assertConfirmedAdjustment(before,holdout,isolated,14));
 assert.throws(()=>assertConfirmedAdjustment(before,{...holdout,wins:16},isolated,14),/確認/);
 assert.throws(()=>assertConfirmedAdjustment(before,holdout,isolated,-14),/方向|耐力/);
 assert.throws(()=>assertConfirmedAdjustment(before,before,isolated,14),/種子/);
 assert.throws(()=>assertConfirmedAdjustment(before,holdout,{...isolated,opponentStats:{}},14),/對手/);
});
