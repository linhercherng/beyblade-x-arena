import{test}from'node:test';import assert from'node:assert/strict';
import{BEYS}from'../src/catalog.ts';import{beyEffects,effectMode,effectVertices,hitBey}from'../src/bey-effects.ts';
import{createBattle}from'../src/physics.ts';
test('91款特性演出採用原配色、刃形、軸心與旋向；不改寫陀螺資料',()=>{
 const before=JSON.stringify(BEYS);
 for(const bey of BEYS){const p=beyEffects(bey);assert.equal(p.type,bey.type);assert.equal(p.spin,bey.spin==='L'?1:-1);assert.ok(p.radius>=.48&&p.radius<=.65);assert.ok(p.pitch>=.8&&p.pitch<=1.2);assert.ok(/^#[0-9a-f]{6}$/i.test(p.color));const out=new Float32Array(72*6);for(const mode of ['attack','defense','stamina']as const){const count=effectVertices(p,mode,1,.5,out);assert.equal(count,144);assert.ok(out.every(Number.isFinite));assert.ok(out.every(v=>Math.abs(v)<1));}}
 assert.equal(JSON.stringify(BEYS),before);
 const find=(id:string)=>beyEffects(BEYS.find(b=>b.id===id)!);
 assert.equal(find('bx-31-tyranno-beat').offset,true);assert.equal(find('ux-08-silver-wolf').free,true);assert.equal(find('bx-00-storm-pegasus').rubber,true);
 assert.notEqual(find('bx-01-dran-sword').radius,find('bx-23-phoenix-wing').radius);
});
test('平衡型依實際移動與傾角切換，碰撞以動量選擇主攻方而非固定1P',()=>{
 const p=beyEffects(BEYS.find(b=>b.type==='balance')!);assert.equal(effectMode(p,0,0),'defense');assert.equal(effectMode(p,5,0),'attack');assert.equal(effectMode(p,0,.5),'attack');
 const b=createBattle(BEYS[0],BEYS[11],[{power:1,lane:1,angle:0},{power:1,lane:1,angle:0}],1);b.tops[0].vx=0;b.tops[0].vz=0;b.tops[1].vx=5;b.tops[1].vz=0;const before=JSON.stringify(b);assert.equal(hitBey(b),b.tops[1].bey);assert.equal(JSON.stringify(b),before);
});
