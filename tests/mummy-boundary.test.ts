import{test}from'node:test';
import assert from'node:assert/strict';
import{BEYS}from'../src/catalog.ts';
import{boundaryInputs,pairedInterval,compositionRates,boundaryDecision,reserveSeed,runBoundaryBatch,assertBoundaryRelease}from'../scripts/mummy-boundary.ts';

test('原觀測交換發射角色及呼喊，等條件格保持力量與傾角相同',()=>{
 for(let p=0;p<4;p++){
  const a=boundaryInputs(p,0,123),b=boundaryInputs(p,1,123);
  assert.deepEqual(a.inputs,[b.inputs[1],b.inputs[0]]);
  assert.deepEqual(a.shoutTicks,[b.shoutTicks[1],b.shoutTicks[0]]);
 }
 for(let p=4;p<16;p++){
  const {inputs,shoutTicks}=boundaryInputs(p,0,123);
  assert.equal(inputs[0].power,inputs[1].power);assert.equal(inputs[0].angle,inputs[1].angle);
  assert.deepEqual(shoutTicks,[720,720]);
 }
 assert.throws(()=>boundaryInputs(16,0,123),/情境/);
});

test('配對區間以兩側為一樣本，型號權重與類型權重分開，重加權不新增樣本',()=>{
 const groups={attack:{played:200,wins:0},defense:{played:2,wins:2},stamina:{played:2,wins:2},balance:{played:2,wins:2}};
 const raw=pairedInterval(groups,false),equal=pairedInterval(groups,true);
 assert.equal(raw.pairs,103);assert.equal(equal.pairs,103);
 assert.ok(Math.abs(raw.rate-6/206*100)<1e-9);assert.equal(equal.rate,75);
 const width=Math.sqrt(Math.log(40)/(2*103))*100;
 assert.ok(Math.abs(raw.high-raw.rate-width)<1e-9);
 assert.ok(Math.abs(compositionRates(groups).attackHeavy-50)<1e-9);
 assert.throws(()=>pairedInterval({...groups,attack:{played:3,wins:0}},false),/配對/);
});

test('確認必須三批且兩種權重的區間皆同方向越界，單條件或點估計不能觸發',()=>{
 const low={raw:{low:30,high:39},equal:{low:31,high:39}},high={raw:{low:61,high:70},equal:{low:62,high:71}};
 assert.equal(boundaryDecision([low,low,low]),'weak');
 assert.equal(boundaryDecision([high,high,high]),'strong');
 assert.equal(boundaryDecision([low,low,{...low,equal:{low:35,high:41}}]),'not-confirmed');
 assert.equal(boundaryDecision([low,low,high]),'not-confirmed');
 assert.throws(()=>boundaryDecision([low,low]),/三批/);
 const used=new Set([123]);assert.throws(()=>reserveSeed(123,used),/重複/);
 reserveSeed(124,used);assert.ok(used.has(124));
});

test('研究完成與可發布分開，確認偏離、缺樣本或尚未完成皆阻擋發布',()=>{
 const report={status:'passed',decision:'not-confirmed',battles:138240};
 assert.doesNotThrow(()=>assertBoundaryRelease(report));
 for(const change of[{status:'running'},{decision:'weak'},{decision:'strong'},{battles:0}])assert.throws(()=>assertBoundaryRelease({...report,...change}));
});

test('真引擎配對保留原始結果，兩個對手池同種子同輸入、目標能力不變',()=>{
 const pool=['attack','defense','stamina','balance'].map(type=>BEYS.find(b=>b.type===type)!);
 const records:unknown[]=[];
 const result=runBoundaryBatch(123,2,pool,r=>records.push(r));
 assert.equal(records.length,4*16*2);
 for(const mode of[result.current,result.legacy]){
  assert.equal(mode.canonical.played,4*4*2*2);assert.equal(mode.matched.played,4*12*2*2);
  assert.ok(mode.canonical.minSeconds!>=15&&mode.matched.maxSeconds<=40);
  assert.equal(mode.targetStats.sta,BEYS.find(b=>b.id==='ux-18-mummy-curse')!.stats.sta);
  assert.deepEqual(mode.matched.sides.map(s=>s.played),[96,96]);
 }
});
