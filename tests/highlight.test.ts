import{test}from'node:test';import assert from'node:assert/strict';
import{HighlightRecorder,HIGHLIGHT_CAPACITY}from'../src/highlight.ts';
import{createBattle,stepBattle,DT}from'../src/physics.ts';import{BEYS}from'../src/catalog.ts';
const make=()=>createBattle(BEYS[0],BEYS[1],[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
test('精彩重播固定容量、只保留最後2.5秒，複本插值不改正式結果',()=>{
 const b=make(),r=new HighlightRecorder();
 while(!b.result){stepBattle(b);r.record(b);assert.ok(r.size<=HIGHLIGHT_CAPACITY);}
 b.result={winner:0,finish:'burst',points:2,time:b.time};r.record(b);
 const before=structuredClone(b),clip=r.clip(b);assert.ok(clip);assert.ok(clip.leadSeconds<=2.5/.55+.001);
 r.reset();assert.equal(r.size,0);const first=clip.advance(0);assert.equal(first.phase,'approach');assert.ok(first.battle.time>=b.time-2.5-.001);
 const frozen=structuredClone(first.battle);clip.advance(0);assert.deepEqual(first.battle,frozen);
 const finish=clip.advance(clip.leadSeconds+.01);assert.equal(finish.phase,'finish');assert.deepEqual(finish.battle.result,b.result);
 assert.equal(clip.advance(3.1).done,true);assert.deepEqual(b,before);
});
test('旋轉終結、平手與不足兩筆紀錄不自動重播；重播插值保留連續旋向',()=>{
 const b=make(),r=new HighlightRecorder();b.tick=4;b.time=1;b.tops[0].rotation=100;b.tops[1].rotation=-100;r.record(b);
 b.tick=8;b.time=1+4*DT;b.tops[0].rotation=104;b.tops[1].rotation=-104;b.result={winner:0,finish:'extreme',points:3,time:b.time};r.record(b);
 const clip=r.clip(b)!;const frame=clip.advance(2*DT/.55);assert.ok(Math.abs(frame.battle.tops[0].rotation-102)<.001);assert.ok(Math.abs(frame.battle.tops[1].rotation+102)<.001);
 b.result.finish='spin';assert.equal(r.clip(b),null);b.result.finish='over';b.result.winner=null;assert.equal(r.clip(b),null);r.reset();b.result.winner=0;r.record(b);assert.equal(r.clip(b),null);
});
test('錄影不影響同輸入物理狀態，事件有上限且不重複播放',()=>{
 const a=make(),b=make(),r=new HighlightRecorder();
 for(let i=0;i<900;i++){stepBattle(a);stepBattle(b);r.record(b);}assert.deepEqual(a,b);
 for(let i=0;i<400;i++){b.tick++;b.time+=DT;b.events=[{type:'hit',x:0,z:0,strength:7,player:0,time:b.time}];r.record(b);}
 b.result={winner:0,finish:'over',points:2,time:b.time};r.record(b);const clip=r.clip(b)!;assert.ok(clip.eventCount<=128);
 assert.ok(clip.advance(clip.leadSeconds-.1).events.length>0);assert.equal(clip.advance(0).events.length,0);
});
