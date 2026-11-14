import{test}from'node:test';import assert from'node:assert/strict';
import{audioStatus}from'../src/audio-state.ts';
const base={available:true,muted:false,context:'running',sessionInterrupted:false,background:false,recovering:false,resumeAge:null as number|null,rejected:false,musicFailed:false};
test('音訊狀態區分正常、等待手勢、恢復中、逾時重試與中斷',()=>{
 assert.equal(audioStatus(base),'ready');assert.equal(audioStatus({...base,recovering:true}),'waiting');assert.equal(audioStatus({...base,recovering:true,resumeAge:500}),'recovering');assert.equal(audioStatus({...base,recovering:true,resumeAge:2000}),'retry');assert.equal(audioStatus({...base,recovering:true,resumeAge:1,rejected:true}),'retry');assert.equal(audioStatus({...base,sessionInterrupted:true}),'interrupted');
});
test('尊重靜音、缺少能力與已關閉狀態，配樂失敗不冒稱全部無聲',()=>{
 assert.equal(audioStatus({...base,muted:true}),'muted');assert.equal(audioStatus({...base,available:false}),'unavailable');assert.equal(audioStatus({...base,context:'closed'}),'closed');assert.equal(audioStatus({...base,context:null}),'waiting');assert.equal(audioStatus({...base,musicFailed:true}),'music-error');
});
