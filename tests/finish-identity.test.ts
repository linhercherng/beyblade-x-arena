import{test}from'node:test';import assert from'node:assert/strict';import{BEYS}from'../src/catalog.ts';import{beyEffects,beySignature,finishAccent}from'../src/bey-effects.ts';
test('終結專屬脈動有界、左右旋相反且起落點不偏移',()=>{
 for(const bey of BEYS)for(const kind of ['burst','over','extreme']as const){const p=beyEffects(bey);for(const age of [0,.1,.4,.8,1.25,2]){const f=finishAccent(p,kind,age);assert.ok(Object.values(f).every(Number.isFinite));assert.ok(Math.abs(f.angle)<.6&&f.bounce>=0&&f.bounce<.12);assert.ok(f.glow>=0&&f.glow<=1);}assert.equal(finishAccent(p,kind,0).angle,0);assert.equal(finishAccent(p,kind,2).angle,0);assert.equal(finishAccent(p,kind,2).bounce,0);assert.deepEqual(finishAccent(p,kind,.3,true),{angle:0,bounce:0,glow:0});}
 const p=beyEffects(BEYS[0]);assert.equal(finishAccent(p,'burst',.3).angle,-finishAccent({...p,spin:-p.spin},'burst',.3).angle);
});
test('重播可直接由既有陀螺資料取得旋向與特殊軸心標示',()=>{
 const get=(id:string)=>beySignature(BEYS.find(b=>b.id===id)!);assert.match(get('bx-00-storm-pegasus'),/橡膠/);assert.match(get('ux-08-silver-wolf'),/自由環/);assert.match(get('bx-31-tyranno-beat'),/偏心/);assert.match(get('ux-10-knight-mail'),/彈簧/);assert.match(get('ux-05-shinobi-shadow'),/金屬/);
});
