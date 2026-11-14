import{test}from'node:test';import assert from'node:assert/strict';
import{LaunchCountdown}from'../src/launch-countdown.ts';
test('先呈現每拍，長畫格只推進一拍，且等原生語音播完',()=>{
 const c=new LaunchCountdown(),voice={complete:false,cancelled:false},calls:number[]=[];
 const play=(cue:number)=>{calls.push(cue);return voice;};
 assert.equal(c.step(0,play),'show');assert.deepEqual(calls,[]);assert.equal(c.cue,3);
 c.step(20,play);assert.deepEqual(calls,[3]);assert.equal(c.step(5000,play),null);assert.equal(c.cue,3);
 voice.complete=true;assert.equal(c.step(5100,play),'show');assert.equal(c.cue,2);assert.deepEqual(calls,[3]);
 c.step(9000,play);assert.deepEqual(calls,[3,2]);assert.equal(c.step(9500,play),null);assert.equal(c.step(10000,play),'show');assert.equal(c.cue,1);
 c.step(10020,play);assert.equal(c.step(20000,play),'show');assert.equal(c.cue,0);c.step(20020,play);assert.equal(c.step(20040,play),'done');assert.equal(c.cue,null);assert.deepEqual(calls,[3,2,1,0]);
});
test('音訊尚未就緒時保持同拍，恢復不會漏字或建立佇列',()=>{
 const c=new LaunchCountdown();c.step(0,()=>null);for(const time of [100,1000,9000])assert.equal(c.step(time,()=>null),null);assert.equal(c.cue,3);
 c.step(9010,()=>({complete:false,cancelled:false}));assert.equal(c.progress(9510),.5);
});
test('中斷後只重新播當拍，已完成的拍不補播，暫停保留呈現時間',()=>{
 const c=new LaunchCountdown(),old={complete:false,cancelled:false};let calls=0;const play=()=>{calls++;return calls===1?old:{complete:true,cancelled:false};};
 c.step(0,play);c.step(20,play);old.cancelled=true;old.complete=true;c.step(5000,play);assert.equal(c.cue,3);assert.equal(calls,2);c.shift(2000);assert.equal(c.step(7500,play),null);assert.equal(c.step(8000,play),'show');assert.equal(c.cue,2);
});
test('靜音或沒有WebAudio時仍逐拍呈現，GO不阻擋遊戲',()=>{
 const c=new LaunchCountdown(),silent=()=>({complete:true,cancelled:false});let time=0;const shown:number[]=[];
 while(c.cue!==null){if(c.step(time,silent)==='show')shown.push(c.cue!);time+=1000;assert.ok(time<20000);}assert.deepEqual(shown,[3,2,1,0]);
});
test('中斷當拍不讓降下動畫回跳',()=>{
 const c=new LaunchCountdown(),voice={complete:false,cancelled:false};c.step(0,()=>voice);c.step(10,()=>voice);assert.equal(c.progress(510),.5);voice.cancelled=true;assert.equal(c.progress(510),.5);c.step(1000,()=>({complete:false,cancelled:false}));assert.ok(c.progress(1100)>=.5);
});
