import{test}from'node:test';
import assert from'node:assert/strict';
import{BEYS,getBey,filterBeys,ratchets}from'../src/catalog.ts';
import{CATALOG_REVISIONS}from'../src/catalog-revisions.ts';
import{combatProfile}from'../src/combat-profiles.ts';
import{createBattle,stepBattle}from'../src/physics.ts';

const ids=['bx-00-dran-sword-v2','cx-20-hells-scythe-v2'];
test('兩款V2以獨立ID可選隊、零件與原廠或遊戲搭配範圍一致',()=>{
 assert.equal(BEYS.length,93);
 assert.deepEqual(new Set(filterBeys('V2').map(b=>b.id)),new Set(ids));
 assert.deepEqual(new Set(filterBeys('2.0').map(b=>b.id)),new Set(ids));
 const a=getBey(ids[0]),b=getBey(ids[1]);
 assert.equal(a.combo,'Dran Sword V2 3-60F');assert.equal(a.bit,'F');assert.equal(a.ratchet,'3-60');
 assert.match(b.combo,/4-60T.*遊戲搭配/);assert.equal(b.bit,'T');assert.equal(b.ratchet,'4-60');
 assert.equal(CATALOG_REVISIONS['bx-02-hells-scythe'].combo,null);
 for(const v of[a,b]){assert.equal(v.line,'BX');assert.equal(v.spin,'R');assert.match(v.zhName,/V2/);assert.ok(v.released!<='2026-11-25');}
 assert.notEqual(a.blade,getBey('bx-01-dran-sword').blade);assert.notEqual(b.blade,getBey('bx-02-hells-scythe').blade);
});
test('V2的獨立幾何提供可重現戰鬥特性，並在15–40秒完成交戰',()=>{
 for(const[id,original]of ids.map((id,i)=>[id,['bx-01-dran-sword','bx-02-hells-scythe'][i]])){
  const a=getBey(id),b=getBey(original),p=(v:typeof a)=>combatProfile(v.id,v.bit,v.height,ratchets[v.ratchet].sides,v.type);
  assert.notDeepEqual(p(a),p(b));
  const inputs=[{power:.9,lane:1,angle:15},{power:.9,lane:1,angle:15}];
  const run=()=>{const s=createBattle(a,b,inputs,20261125);let hits=0;while(!s.result&&s.time<41){stepBattle(s);hits+=s.events.filter(e=>e.type==='hit').length;}return{s,hits};};
  const first=run(),second=run();assert.deepEqual(first.s.result,second.s.result);assert.equal(first.hits,second.hits);
  assert.ok(first.s.result&&first.s.time>=15&&first.s.time<=40);assert.ok(first.hits>0);
 }
});
