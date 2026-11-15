import{test}from'node:test';import assert from'node:assert/strict';import*as T from'three';import{BEYS}from'../src/catalog.ts';import{beyModel,modelSpec}from'../src/bey-model.ts';import{BowlContact}from'../src/bey-contact.ts';import{TOP_RADIUS,createBattle,stepBattle}from'../src/physics.ts';
test('91款戰鬥模型的接觸中心與外形對齊物理碰撞體，傾斜時不先交疊',()=>{
 for(const b of BEYS){const model=beyModel(b,new T.Texture()),s=modelSpec(b),height=s.bitHeight+s.ratchetHeight+s.bladeThickness*.5,c=new BowlContact(model,TOP_RADIUS,height);
 for(const lean of [0,.25,.6]){c.reset();c.place(1.5,0,lean,-lean*.5,.8,.016);const center=new T.Vector3(0,height*model.scale.y,0).applyQuaternion(model.quaternion).add(model.position);assert.ok(Math.abs(center.x-1.5)<1e-6&&Math.abs(center.z)<1e-6,b.id);let radius=0;for(const v of c.vertices){const p=v.clone().applyQuaternion(model.quaternion).add(model.position);radius=Math.max(radius,Math.hypot(p.x-center.x,p.z-center.z));}assert.ok(radius<=TOP_RADIUS+.006,`${b.id} ${radius}`);}
 c.place(3.55,0,0,0,1,.016,{x:4,z:0,weight:1});assert.ok(c.railPoint.y>=.425&&c.railPoint.y<=.535,b.id);
 }
});
test('頭對頭接觸有碰撞事件，冷卻期間仍分離實體而非互相穿過',()=>{
 for(const cooldown of [0,100]){const b=createBattle(BEYS[0],BEYS[11],[{power:.9,lane:1,angle:0},{power:.9,lane:1,angle:0}],7);b.time=16;b.contactCooldown=cooldown;Object.assign(b.tops[0],{x:-.3,z:0,vx:1,vz:0});Object.assign(b.tops[1],{x:.3,z:0,vx:-1,vz:0});stepBattle(b);assert.ok(Math.hypot(b.tops[1].x-b.tops[0].x,b.tops[1].z-b.tops[0].z)>=TOP_RADIUS*2-1e-8);assert.equal(b.events.some(e=>e.type==='hit'),cooldown===0);}
});
