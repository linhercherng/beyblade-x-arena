import{test}from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{BowlContact}from'../src/bey-contact.ts';import{beyModel}from'../src/bey-model.ts';import{BEYS}from'../src/catalog.ts';import{stadiumSurface}from'../src/stadium-surface.ts';
test('不同型號在中心與斜坡實際貼盤，傾斜旋轉不穿盤',()=>{
 for(const bey of BEYS){
  const model=beyModel(bey,new THREE.Texture()),contact=new BowlContact(model);
  for(const r of [0,1.3,2.7,3.9])for(const spin of [0,.8,2]){
   contact.reset();contact.place(r,0,.18,-.12,spin,1/60);
   let min=Infinity;for(const p of contact.vertices){const w=p.clone().applyQuaternion(model.quaternion).add(model.position);min=Math.min(min,w.y-stadiumSurface(Math.hypot(w.x,w.z)));}
   assert.ok(min>=-.002&&min<.013,`${bey.id} r=${r} contact=${min}`);
  }
  contact.place(3.55,0,0,0,1,.016,{x:4,z:0,weight:1});
  assert.ok(Math.abs(contact.railPoint.x-4.13)<.002,bey.id);
  assert.ok(contact.railPoint.y>=.43&&contact.railPoint.y<=.532,bey.id);
 }
});
test('斜坡法線與模型軸線一致，進出齒軌不改動模型零件相對位置',()=>{
 const model=beyModel(BEYS[0],new THREE.Texture()),contact=new BowlContact(model),parts=model.userData.parts as THREE.Group[],before=parts.map(p=>p.position.toArray());
 contact.place(2.7,0,0,0,0,1/60);const up=new THREE.Vector3(0,1,0).applyQuaternion(model.quaternion);assert.ok(up.x<-.1);assert.ok(up.dot(contact.normal)>.999);
 contact.place(3.55*Math.cos(.55),3.55*Math.sin(.55),0,0,1,.016,{x:Math.cos(.55)*4,z:Math.sin(.55)*4,weight:1});
 assert.ok(contact.railPoint.y>=.43&&contact.railPoint.y<=.532);
 assert.ok(Math.abs(contact.railPoint.x*Math.cos(.55)+contact.railPoint.z*Math.sin(.55)-4.13)<.002);assert.deepEqual(parts.map(p=>p.position.toArray()),before);
});

test('暫停不漂移，重播重新定位不沿用上一個坡面法線',()=>{
 const model=beyModel(BEYS[0],new THREE.Texture()),contact=new BowlContact(model);
 contact.place(3.8,0,.2,-.1,2,.016,{x:4,z:0,weight:1});
 const before=[...model.position.toArray(),...model.quaternion.toArray()];
 for(let i=0;i<10;i++)contact.place(3.8,0,.2,-.1,2,0,{x:4,z:0,weight:1});
 assert.deepEqual([...model.position.toArray(),...model.quaternion.toArray()],before);
 contact.reset();contact.place(-3.8,0,0,0,2,0);assert.ok(contact.normal.x>.1);
});
