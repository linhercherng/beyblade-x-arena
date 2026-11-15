import{test}from'node:test';import assert from'node:assert/strict';import{frictionFrame,frictionSamples}from'../src/friction.ts';import{stopMotion}from'../src/motion.ts';
test('摩擦訊號跟隨低速進動與停轉同一相位，停止後保持靜音',()=>{
 assert.equal(frictionFrame(.8,.3,1,0).phase,'off');const a=frictionFrame(.08,.4,0,0),b=frictionFrame(.08,.4,8,0);assert.equal(a.phase,'spin');assert.notEqual(a.level,b.level);assert.ok(a.level>frictionFrame(.28,.4,0,0).level);
 for(let t=0;t<2;t+=.01){const f=frictionFrame(0,.8,2,1,t,.08);assert.ok(f.level>=0&&f.level<=.25);assert.ok(f.rate>=.5&&f.rate<=1.25);if(t>=1.6)assert.equal(f.phase,'off');}
 const t=.9,m=stopMotion(t,.08),f=frictionFrame(0,.8,2,1,t,.08);assert.ok(m.rock!==0&&f.level>0);assert.deepEqual(frictionFrame(0,.8,2,1,2,.08),frictionFrame(0,.8,2,1,10,.08));
});
test('摩擦循環為可快取、非靜音且有限幅度的柔和噪聲，接縫不形成尖峰',()=>{
 for(const rate of [44100,48000]){const a=frictionSamples(rate),b=frictionSamples(rate);assert.deepEqual(a,b);assert.equal(a.length,Math.round(rate*.6));assert.ok(a.every(Number.isFinite));assert.ok(a.reduce((p,v)=>Math.max(p,Math.abs(v)),0)<=.61);assert.ok(Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length)>.05);assert.ok(Math.abs(a[0]-a.at(-1)!)<.35);}
});
