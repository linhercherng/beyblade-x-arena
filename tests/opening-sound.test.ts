import{test}from'node:test';import assert from'node:assert/strict';import{openingSamples}from'../src/countdown-voice.ts';
test('開場棘齒、落盤與發射波形有界且可重現，落盤對齊One後450ms',()=>{
 for(const rate of [16000,48000])for(const cue of [3,2,1,0]as const){const a=openingSamples(cue,rate);assert.deepEqual(a,openingSamples(cue,rate));assert.ok(a.every(Number.isFinite));assert.ok(a.reduce((m,v)=>Math.max(m,Math.abs(v)),0)<.8);assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1)!)<.001);}
 const a=openingSamples(1,48000),rms=(from:number,to:number)=>Math.sqrt(a.slice(from*48000,to*48000).reduce((s,x)=>s+x*x,0)/((to-from)*48000));assert.ok(rms(.46,.53)>.025);assert.ok(rms(.3,.44)<.001);
 const go=openingSamples(0,48000);assert.ok(go.slice(.12*48000,.24*48000).some(v=>Math.abs(v)>.03));
});
