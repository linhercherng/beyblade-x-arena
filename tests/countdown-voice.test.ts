import{test}from'node:test';import assert from'node:assert/strict';
import{countdownSamples,COUNTDOWN_RATE}from'../src/countdown-voice.ts';
test('英文倒數四段PCM有聲、單拍內完成且有安全峰值',()=>{
 assert.equal(COUNTDOWN_RATE,16000);
 for(const cue of [3,2,1,0]as const){const data=countdownSamples(cue),duration=data.length/COUNTDOWN_RATE;assert.ok(duration>.15&&duration<(cue===0?1.3:.9));const peak=data.reduce((p,x)=>Math.max(p,Math.abs(x)),0);assert.ok(peak>.5&&peak<.8);assert.ok(data.every(Number.isFinite));}
});
