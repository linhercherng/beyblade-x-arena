import{test}from'node:test';import assert from'node:assert/strict';import{Sound}from'../src/audio.ts';

function clockRun(run:(sound:Sound,wall:(ms:number)=>void)=>void){
 let wall=0;Object.defineProperty(performance,'now',{configurable:true,value:()=>wall});
 const sound=new Sound();
 Object.assign(sound,{muted:false,ctx:{state:'running',currentTime:3},recovering:false,master:{gain:{cancelScheduledValues(){},setValueAtTime(){}}}});
 try{run(sound,ms=>wall=ms);}finally{delete(performance as any).now;}
}
test('長取樣空窗不能當作連續時鐘停滯的證據，時鐘前進後可處理下一次空窗',()=>{
 for(const gap of [1000,1600])clockRun((s,wall)=>{
  let interrupted=0;s.onInterruption=()=>interrupted++;
  s.update(null,true,null);wall(gap);s.update(null,true,null);
  assert.equal(interrupted,0);assert.equal(s.diagnostics().ready,true);
  wall(gap+16);Object.assign(s.ctx!,{currentTime:3.016});s.update(null,true,null);
  wall(gap+1616);s.update(null,true,null);assert.equal(interrupted,0);assert.equal(s.diagnostics().ready,true);
 });
});
test('連續取樣超過1秒仍未前進，保留真正停滯的靜音及暫停保護',()=>clockRun((s,wall)=>{
 let interrupted=0;s.onInterruption=()=>interrupted++;
 for(let ms=0;ms<=1300;ms+=100){wall(ms);s.update(null,true,null);}
 assert.equal(interrupted,1);assert.equal(s.diagnostics().ready,false);assert.ok(s.diagnostics().events.some(e=>e.kind==='clock-stalled'));
}));
test('持續低幀率不能反覆延長同一個停滯時鐘的寬限',()=>clockRun((s,wall)=>{
 let interrupted=0;s.onInterruption=()=>interrupted++;
 for(let ms=0;ms<=10000;ms+=1000){wall(ms);s.update(null,true,null);}
 assert.equal(interrupted,1);assert.equal(s.diagnostics().ready,false);
}));
