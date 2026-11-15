import{test}from'node:test';import assert from'node:assert/strict';import*as T from'three';
import{BowlContact}from'../src/bey-contact.ts';import{beyModel,modelSpec}from'../src/bey-model.ts';import{BEYS}from'../src/catalog.ts';import{TOP_RADIUS}from'../src/physics.ts';import{stadiumSurface}from'../src/stadium-surface.ts';
import{railLatch}from'../src/dash.ts';
test('齒軌解除連續衰減，靠近碰撞前退出且接觸時對齊物理中心',()=>{
 const full=railLatch(.035);assert.equal(full,1);assert.equal(railLatch(.035,.78),0);assert.ok(railLatch(.035,1)<.2);assert.ok(railLatch(.035,1.6)>.99);
 assert.equal(railLatch(.035,Infinity,0),full);assert.ok(railLatch(.035,Infinity,.016)>0&&railLatch(.035,Infinity,.016)<full);assert.equal(railLatch(.2),0);assert.equal(railLatch(.035,Infinity,0,true),0);
});
test('姿態平滑不拖慢左右旋的自轉相位',()=>{
 const g=beyModel(BEYS[0],new T.Texture()),c=new BowlContact(g);c.place(2,0,.1,-.1,0,.016);const q=g.quaternion.clone();c.place(2,0,.1,-.1,.5,.016);assert.ok(Math.abs(q.angleTo(g.quaternion)-.5)<1e-6);
});
test('斜坡受撞反向不瞬間翻轉軸線，暫停保持相同姿態，重設可直接定位',()=>{
 const g=beyModel(BEYS[0],new T.Texture()),s=modelSpec(BEYS[0]),c=new BowlContact(g,TOP_RADIUS,s.bitHeight+s.ratchetHeight+s.bladeThickness*.5);
 c.place(3,0,.25,0,0,.016);const q=g.quaternion.clone();c.place(3,0,-.25,0,0,.016);assert.ok(q.angleTo(g.quaternion)<.2,'受力方向改變時應逐步回穩');
 const frozen=[...g.position.toArray(),...g.quaternion.toArray()];c.place(3,0,-.25,0,0,0);assert.deepEqual([...g.position.toArray(),...g.quaternion.toArray()],frozen);
 c.reset();c.place(-3,0,0,0,0,0);assert.ok(c.normal.x>0);
});
test('左右旋斜坡滑行與回彈使用真實模型貼盤，戰刃中心不偏離物理位置',()=>{
 for(const id of ['bx-01-dran-sword','bx-34-cobalt-dragoon','ux-08-silver-wolf','ux-10-knight-mail']){
  const b=BEYS.find(b=>b.id===id)!,g=beyModel(b,new T.Texture()),s=modelSpec(b),h=s.bitHeight+s.ratchetHeight+s.bladeThickness*.5,c=new BowlContact(g,TOP_RADIUS,h),p=new T.Vector3();
  for(let frame=0;frame<32;frame++){
   const r=3.5-Math.sin(frame/31*Math.PI)*1.8,x=r*Math.cos(.55),z=r*Math.sin(.55),lean=.22*Math.sin(frame*.35);c.place(x,z,lean,-lean*.6,frame*(b.spin==='L'?1:-1)*.5,1/60);
   let gap=Infinity;for(const v of c.vertices){p.copy(v).applyQuaternion(g.quaternion).add(g.position);gap=Math.min(gap,p.y-stadiumSurface(Math.hypot(p.x,p.z)));}
   assert.ok(gap>=-.002&&gap<.014,`${id} frame=${frame} gap=${gap}`);
   p.set(0,h*c.scale,0).applyQuaternion(g.quaternion).add(g.position);assert.ok(Math.hypot(p.x-x,p.z-z)<1e-6,id);
  }
 }
});
