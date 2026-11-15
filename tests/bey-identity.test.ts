import{test}from'node:test';import assert from'node:assert/strict';import{BEYS}from'../src/catalog.ts';import{beyEffects,collisionAccent,effectVertices}from'../src/bey-effects.ts';
const fx=(id:string)=>beyEffects(BEYS.find(b=>b.id===id)!);
test('91款專屬衝刺參數有界，橡膠、偏心、自由環與彈簧軸各有差異',()=>{
 for(const b of BEYS){const p=beyEffects(b);assert.ok(p.dash.rate>=.7&&p.dash.rate<=1.4);assert.ok(p.dash.width>=.7&&p.dash.width<=1.8);assert.ok(p.dash.cutoff>=800&&p.dash.cutoff<=4000);assert.ok(p.dash.pulse>=0&&p.dash.pulse<=.4);}
 const plain=fx('bx-01-dran-sword'),rubber=fx('bx-00-storm-pegasus'),quake=fx('bx-31-tyranno-beat'),free=fx('ux-08-silver-wolf'),bound=fx('ux-10-knight-mail');
 assert.ok(rubber.dash.width>plain.dash.width);assert.ok(quake.dash.pulse>plain.dash.pulse);assert.ok(collisionAccent(free,true).curl!==collisionAccent(plain,true).curl);assert.ok(collisionAccent(bound,false).lift>collisionAccent(plain,false).lift);
 const before=JSON.stringify(BEYS);for(const p of [plain,rubber,quake,free,bound]){const a=new Float32Array(432),b=new Float32Array(432);effectVertices(p,'attack',.1,.5,a,0);effectVertices(p,'attack',.1,.5,b,1);assert.ok(b.every(Number.isFinite));assert.notDeepEqual(a,b);}assert.equal(JSON.stringify(BEYS),before);
});
test('反向旋轉形成相反捲流，同向擦擊較短促，交換玩家不改旋向判定',()=>{
 const right=fx('bx-01-dran-sword'),left={...right,spin:1};assert.equal(right.spin,-1);assert.equal(collisionAccent(right,true).curl,-collisionAccent(left,true).curl);assert.ok(Math.abs(collisionAccent(right,true).curl)>Math.abs(collisionAccent(right,false).curl));
});
