import{test}from'node:test';import assert from'node:assert/strict';import{Sound}from'../src/audio.ts';
test('冷啟動淡入前時鐘停住5.5秒仍可直接播放',t=>{
 const original=globalThis.AudioContext;globalThis.AudioContext=class{}as typeof AudioContext;
 let wall=0;t.mock.method(performance,'now',()=>wall);
 try{
  for(const initial of [0,.01]){
  wall=0;const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
  s.ctx={state:'running',currentTime:initial};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){}}};s.recovering=false;s.voiceReadyAt=.25;s.volume=0;s.clockWall=s.clockSampleWall=0;s.clockTime=initial;
  for(wall=100;wall<=5500;wall+=100){s.update(null,false,null,true);assert.equal(sound.countdownReady,false);}
  assert.equal(interruptions,0);assert.equal(s.recovering,false);
  s.ctx.currentTime=.3;s.update(null,false,null,true);assert.equal(sound.countdownReady,true);
  for(let n=0;n<12;n++){wall+=100;s.update(null,false,null,true);}
  assert.equal(interruptions,1);assert.equal(s.recovering,true);
  }
 }finally{globalThis.AudioContext=original;}
});
test('冷啟動永久不tick仍在10秒後提供手動恢復，不會永久等待',t=>{
 let wall=0;t.mock.method(performance,'now',()=>wall);
 const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
 s.ctx={state:'running',currentTime:0};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){}}};s.recovering=false;s.voiceReadyAt=.25;s.clockWall=s.clockSampleWall=s.clockTime=0;
 for(wall=100;wall<=10000;wall+=100)s.update(null,false,null,true);
 assert.equal(interruptions,0);s.update(null,false,null,true);
 assert.equal(interruptions,1);assert.equal(s.recovering,true);
});
test('冷啟動只零星前進也不能無限延長10秒啟動期限',t=>{
 let wall=0;t.mock.method(performance,'now',()=>wall);
 const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
 s.ctx={state:'running',currentTime:0};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){}}};s.recovering=false;s.voiceReadyAt=.25;s.clockWall=s.clockSampleWall=s.clockTime=0;
 for(wall=100;wall<=10000;wall+=100){s.ctx.currentTime+=.001;s.update(null,false,null,true);}
 assert.equal(interruptions,0);s.ctx.currentTime+=.001;s.update(null,false,null,true);
 assert.equal(interruptions,1);assert.equal(s.recovering,true);
});
test('手動恢復不重新取得冷啟動期限，仍在1秒後偵測停鐘',t=>{
 let wall=0;t.mock.method(performance,'now',()=>wall);
 const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
 s.ctx={state:'running',currentTime:0};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){}}};s.recovering=false;s.recovery=1;s.clockWall=s.clockSampleWall=s.clockTime=0;
 for(wall=100;wall<=1300;wall+=100)s.update(null,false,null,true);
 assert.equal(interruptions,1);assert.equal(s.recovering,true);
});
test('零配樂且恢復後首字淡入前時鐘停住，也要中斷並提供手動恢復',t=>{
 const original=globalThis.AudioContext;globalThis.AudioContext=class{}as typeof AudioContext;
 let wall=0;t.mock.method(performance,'now',()=>wall);
 try{
  const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
  s.ctx={state:'running',currentTime:.1};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){}}};s.recovering=false;s.recovery=1;s.voiceReadyAt=.25;s.volume=0;s.clockWall=s.clockSampleWall=0;s.clockTime=.1;
  assert.equal(sound.countdownReady,false);for(wall=100;wall<=2000;wall+=100)s.update(null,false,null,true);
  assert.equal(interruptions,1);assert.equal(s.recovering,true);assert.equal(sound.countdownReady,false);
 }finally{globalThis.AudioContext=original;}
});
test('啟動期限從非零牆上時間的restore起算，恰好完成淡入後恢復1秒保護',t=>{
 let wall=50000;t.mock.method(performance,'now',()=>wall);
 const sound=new Sound(),s=sound as any;let interruptions=0;sound.onInterruption=()=>interruptions++;
 s.ctx={state:'running',currentTime:0};s.master={gain:{cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}}};s.restore();
 assert.equal(s.startupWall,50000);assert.equal(s.voiceReadyAt,.25);
 for(wall=50100;wall<=60000;wall+=100)s.update(null,false,null,true);
 assert.equal(interruptions,0);s.ctx.currentTime=.25;s.update(null,false,null,true);
 const readyAt=wall;for(wall=readyAt+100;wall<=readyAt+1000;wall+=100)s.update(null,false,null,true);
 assert.equal(interruptions,0);s.update(null,false,null,true);assert.equal(interruptions,1);
});
