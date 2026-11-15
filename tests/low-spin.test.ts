import{test}from'node:test';import assert from'node:assert/strict';import*as T from'three';
import{spinLean,stopMotion}from'../src/motion.ts';import{BowlContact}from'../src/bey-contact.ts';import{beyModel,modelSpec}from'../src/bey-model.ts';import{BEYS}from'../src/catalog.ts';import{TOP_RADIUS}from'../src/physics.ts';import{stadiumSurface,stadiumNormal}from'../src/stadium-surface.ts';
test('低轉速逐漸增加失衡，保持旋向與停止時的固定進動相位',()=>{
 const fast=spinLean(.7,2,0,1),slow=spinLean(.7,2,0,.08);assert.ok(Math.hypot(slow.x,slow.z)>Math.hypot(fast.x,fast.z)*1.3);assert.deepEqual(spinLean(.7,2,0),fast);
 const reverse=spinLean(.7,-2,0,.08);assert.ok(Math.abs(slow.x+reverse.x)<1e-12&&Math.abs(slow.z-reverse.z)<1e-12);
 const a=spinLean(.7,2,0,.320001),b=spinLean(.7,2,0,.319999);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-5);assert.deepEqual(spinLean(.7,2,0,0),spinLean(.7,2,0,0));
});
test('側倒由當下姿態平滑起步，餘轉與摩擦回擺有限且最後完全靜止',()=>{
 assert.deepEqual(stopMotion(0,.08),{fall:0,spin:0,rock:0});assert.ok(stopMotion(.01,.08).fall<.001);
 let last=0;for(let age=0;age<2;age+=.005){const p=stopMotion(age,.08);assert.ok(p.fall>=last&&p.fall<=1);assert.ok(p.spin>=0&&p.spin<3);assert.ok(Math.abs(p.rock)<.05);last=p.fall;}
 assert.deepEqual(stopMotion(2,.08),stopMotion(10,.08));assert.equal(stopMotion(2,.08).rock,0);assert.equal(stopMotion(2,.08).fall,1);assert.deepEqual(stopMotion(.1,.08,true),stopMotion(2,.08));
});
test('91款側躺依實際模型貼合斜坡，不用包圍盒抬高或拆散零件',()=>{
 const q=new T.Quaternion(),normal=new T.Vector3(),side=new T.Vector3(),p=new T.Vector3();
 for(const b of BEYS){const g=beyModel(b,new T.Texture()),s=modelSpec(b),c=new BowlContact(g,TOP_RADIUS,s.bitHeight+s.ratchetHeight+s.bladeThickness*.5),parts=g.userData.parts as T.Group[],before=parts.map(p=>p.position.toArray());
  for(const r of [0,2.7,3.8]){stadiumNormal(r,0,normal);side.set(r? -1:1,0,0).projectOnPlane(normal).normalize();q.setFromUnitVectors(new T.Vector3(0,1,0),side);c.rest(r,0,q);let gap=Infinity;for(const v of c.vertices){p.copy(v).applyQuaternion(g.quaternion).add(g.position);gap=Math.min(gap,p.y-stadiumSurface(Math.hypot(p.x,p.z)));}assert.ok(gap>=-.002&&gap<.015,`${b.id} r=${r} gap=${gap}`);}
  assert.deepEqual(parts.map(p=>p.position.toArray()),before);
 }
});
