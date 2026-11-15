import{test}from'node:test';import assert from'node:assert/strict';import{frictionFrame,frictionSamples}from'../src/friction.ts';import{stopMotion}from'../src/motion.ts';
test('摩擦訊號跟隨低速進動與停轉同一相位，停止後保持靜音',()=>{
 assert.equal(frictionFrame(.8,.3,1,0).phase,'off');const a=frictionFrame(.08,.4,0,0),b=frictionFrame(.08,.4,8,0);assert.equal(a.phase,'spin');assert.notEqual(a.level,b.level);assert.ok(a.level>frictionFrame(.28,.4,0,0).level);
 for(let t=0;t<2;t+=.01){const f=frictionFrame(0,.8,2,1,t,.08);assert.ok(f.level>=0&&f.level<=.25);assert.ok(f.rate>=.5&&f.rate<=1.25);if(t>=1.6)assert.equal(f.phase,'off');}
 const t=.9,m=stopMotion(t,.08),f=frictionFrame(0,.8,2,1,t,.08);assert.ok(m.rock!==0&&f.level>0);assert.deepEqual(frictionFrame(0,.8,2,1,2,.08),frictionFrame(0,.8,2,1,10,.08));
});
test('三種材質保持相近能量與安全峰值，金屬高頻細刮、塑膠中頻、橡膠低頻黏滯',()=>{
 for(const rate of [44100,48000]){
  const tones=['metal','plastic','rubber'].map(material=>frictionSamples(rate,material as 'metal'|'plastic'|'rubber'));
  assert.notDeepEqual(tones[0],tones[1]);assert.notDeepEqual(tones[1],tones[2]);
  const energy=tones.map(a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length));
  assert.ok(Math.max(...energy)/Math.min(...energy)<1.2);
  const rough=tones.map(a=>a.reduce((s,v,i)=>s+(i?(v-a[i-1])**2:0),0)/a.reduce((s,v)=>s+v*v,0));
  assert.ok(rough[0]>rough[1]*2);assert.ok(rough[1]>rough[2]*2);
  for(const [i,a]of tones.entries()){
   assert.deepEqual(a,frictionSamples(rate,['metal','plastic','rubber'][i] as 'metal'|'plastic'|'rubber'));
   assert.ok(a.every(Number.isFinite));assert.ok(a.every(v=>Math.abs(v)<=.6));
   // 高頻噪聲本身會快速變化；循環接縫不應超過波形的自然相鄰變化。
   assert.ok(Math.abs(a[0]-a.at(-1)!)<=a.reduce((max,v,j)=>Math.max(max,j?Math.abs(v-a[j-1]):0),0));
  }
 }
});
test('材質隨同一擦盤與側躺相位輸出，回擺收束時降低尖銳度，停止保持靜音',()=>{
 for(const material of ['metal','plastic','rubber']as const){
  const spin=frictionFrame(.08,.7,4,0,null,0,material),fall=frictionFrame(0,.7,4,0,.9,.08,material),still=frictionFrame(0,.7,4,0,2,.08,material);
  assert.equal(spin.material,material);assert.equal(fall.material,material);assert.ok(fall.cutoff<spin.cutoff);assert.equal(still.level,0);assert.equal(still.phase,'off');
  const plastic=frictionFrame(0,.7,4,0,.9,.08,'plastic');assert.equal(fall.level,plastic.level);assert.equal(fall.rate,plastic.rate);
 }
});
test('摩擦循環為可快取、非靜音且有限幅度的柔和噪聲，接縫不形成尖峰',()=>{
 for(const rate of [44100,48000]){const a=frictionSamples(rate),b=frictionSamples(rate);assert.deepEqual(a,b);assert.equal(a.length,Math.round(rate*.6));assert.ok(a.every(Number.isFinite));assert.ok(a.reduce((p,v)=>Math.max(p,Math.abs(v)),0)<=.61);assert.ok(Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length)>.05);assert.ok(Math.abs(a[0]-a.at(-1)!)<.35);}
});
