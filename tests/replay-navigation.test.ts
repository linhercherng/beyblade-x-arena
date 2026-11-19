import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{replayAt,replayMoments}from'../src/replay-navigation.ts';
for(const version of [1,2,3,4,5,6,7])test(`v${version}重播前後跳轉及關鍵點仍保持原結果與輸入`,()=>{
 const m=JSON.parse(readFileSync(new URL(`./fixtures/v${version}-match.json`,import.meta.url),'utf8')),r=m.rounds[0],before=JSON.stringify(r);
 const index=replayMoments(r);assert.deepEqual(index.result,r.result);assert.ok(index.moments.some(v=>v.kind==='finish'));
 const mid=replayAt(r,5);assert.ok(Math.abs(mid.time-5)<.01);assert.deepEqual(replayAt(r,5),mid);assert.equal(replayAt(r,0).tick,0);
 assert.deepEqual(replayAt(r,Infinity).result,r.result);assert.equal(JSON.stringify(r),before);assert.ok(index.moments.length<=7);
 assert.throws(()=>replayAt(r,NaN));assert.throws(()=>replayAt(r,-1));
});
