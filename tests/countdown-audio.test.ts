import{test}from'node:test';import assert from'node:assert/strict';import{Sound}from'../src/audio.ts';
test('零配樂且首字淡入前時鐘停住，也要中斷並提供手動恢復',t=>{
 const original=globalThis.AudioContext;globalThis.AudioContext=class{}as typeof AudioContext;
 let wall=0;t.mock.method(performance,'now',()=>wall);
 try{
  const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
  s.ctx={state:'running',currentTime:0};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){}}};s.recovering=false;s.voiceReadyAt=.25;s.volume=0;s.clockWall=s.clockSampleWall=s.clockTime=0;
  assert.equal(sound.countdownReady,false);for(wall=100;wall<=2000;wall+=100)s.update(null,false,null,true);
  assert.equal(interruptions,1);assert.equal(s.recovering,true);assert.equal(sound.countdownReady,false);
 }finally{globalThis.AudioContext=original;}
});
