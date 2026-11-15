import{test}from'node:test';import assert from'node:assert/strict';
import{contactFeedback,contactRecoil}from'../src/impact.ts';
import{createBattle,type BattleEvent}from'../src/physics.ts';import{BEYS}from'../src/catalog.ts';
const hit:BattleEvent={type:'hit',x:0,z:0,strength:14,player:0,time:16};
function scene(){const b=createBattle(BEYS[0],BEYS[11],[{power:.9,lane:1,angle:0},{power:.9,lane:1,angle:0}],7);b.tops.forEach((t,i)=>Object.assign(t,{x:i?.39:-.39,z:0,vx:i?2:-2,vz:0,rpm:.8}));return b;}
test('正面撞擊較擦碰有力，反彈方向對稱，回饋不寫入戰鬥狀態',()=>{
 const b=scene(),before=JSON.stringify(b),front=contactFeedback(hit,b)!;assert.equal(JSON.stringify(b),before);assert.equal(front.headOn,1);
 const a=contactRecoil(front,0,.04),c=contactRecoil(front,1,.04);assert.ok(a.z>0&&c.z<0);assert.ok(Math.abs(a.x)<Math.abs(a.z));
 b.tops.forEach((t,i)=>Object.assign(t,{vx:i?.05:-.05,vz:i?2:-2}));const scrape=contactFeedback({...hit,strength:.5},b)!;
 assert.ok(scrape.weight<front.weight);assert.ok(scrape.kicks[0]<front.kicks[0]*.3);
});
test('左右旋接觸依表面相對運動區分剪切，交換玩家不顛倒世界方向',()=>{
 const b=scene();b.tops.forEach(t=>t.bey={...t.bey,spin:'R'});const same=contactFeedback(hit,b)!;
 b.tops[1].bey={...b.tops[1].bey,spin:'L'};const opposed=contactFeedback(hit,b)!;assert.ok(Math.abs(opposed.shear)<Math.abs(same.shear));
 const first=contactRecoil(opposed,0,.06);b.tops.reverse();const swapped=contactFeedback(hit,b)!;assert.deepEqual(contactRecoil(swapped,1,.06),first);
});
test('碰撞傾斜短暫回彈並回穩，低轉速較易晃動，暫停與減少動態受控',()=>{
 const b=scene(),f=contactFeedback(hit,b)!;assert.ok(contactRecoil(f,0,.04).z*contactRecoil(f,0,.13).z<0);
 for(const age of [0,.45,1,-1])assert.deepEqual(contactRecoil(f,0,age),{x:0,z:0});assert.deepEqual(contactRecoil(f,0,.04,true),{x:0,z:0});
 assert.deepEqual(contactRecoil(f,0,.04),contactRecoil(f,0,.04));assert.deepEqual(contactRecoil(null,0,.04),{x:0,z:0});
 b.tops[0].rpm=.1;assert.ok(contactFeedback(hit,b)!.kicks[0]>f.kicks[0]);
 for(let age=0;age<.5;age+=.004){const p=contactRecoil(f,0,age);assert.ok(Number.isFinite(p.x+p.z)&&Math.hypot(p.x,p.z)<.18);}
});
