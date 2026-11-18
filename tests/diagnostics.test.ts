import {test} from 'node:test';import assert from 'node:assert/strict';
import {DeviceCheck} from '../src/diagnostics.ts';
import * as diagnostics from '../src/diagnostics.ts';
test('只計入連續有效對戰幀，背景與暫停不拉低FPS',()=>{
 const log=new DeviceCheck();log.start(0);log.frame(0,true);log.frame(20,true);log.frame(1000,false);log.frame(2000,true);log.frame(2020,true);log.stop(3000);
 const r=log.report(9000);assert.equal(r.elapsedMs,3000);assert.equal(r.frames,2);assert.equal(r.activeMs,40);assert.equal(r.fps,50);assert.equal(r.p95FrameMs,20);
});
test('未測試不會自動變通過，拒絕未知勾選值與原型欄位',()=>{
 const log=new DeviceCheck();log.start(0);for(let i=0;i<10000;i++)log.frame(i*16,true);
 assert.ok(Object.values(log.report(10000).checks).every(v=>v==='untested'));assert.equal(log.setCheck('__proto__','pass'),false);assert.equal(log.setCheck('bluetooth','bogus'),false);assert.equal(log.setCheck('bluetooth','pass'),true);assert.equal(log.report(10000).checks.bluetooth,'pass');
});
test('長時間紀錄採固定空間統計，資源峰值與停頓保留',()=>{
 const log=new DeviceCheck();log.start(0);for(let i=0;i<100000;i++)log.frame(i*20,true);
 log.sample({geometries:100,textures:4,programs:10,drawCalls:80,triangles:1000,pixels:500000},1000000);
 log.sample({geometries:80,textures:2,programs:8,drawCalls:70,triangles:800,pixels:400000},900000);
 const r=log.report(2000000);assert.equal(r.frames,99999);assert.equal(r.p95FrameMs,20);assert.equal(r.peakGpu?.geometries,100);assert.equal(r.gpu?.geometries,80);assert.equal(r.peakHeapBytes,1000000);assert.ok(JSON.stringify(r).length<4000);
});

test('超過直方圖上限的停頓保留原長度，不偽裝精確p95',()=>{
 const log=new DeviceCheck();log.start(0);log.frame(0,true);log.frame(2500,true);const r=log.report(3000);
 assert.equal(r.p95FrameMs,null);assert.equal(r.p95AtLeast1000Ms,true);assert.equal(r.maxFrameMs,2500);assert.equal(r.activeMs,2500);
 log.setCheck('call','pass');log.start(4000);assert.equal(log.report(4000).checks.call,'untested');assert.equal(log.report(4000).frames,0);
});

function drafts(){
 assert.equal(typeof diagnostics.DiagnosticDraft,'function','需提供有界診斷草稿保存');
 const entries=new Map<string,string>();const storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>entries.set(k,v),removeItem:(k:string)=>entries.delete(k)};
 return {entries,storage,make:()=>new diagnostics.DiagnosticDraft(()=>storage)};
}
function report(){const log=new DeviceCheck();log.start(0);log.frame(0,true);log.frame(20,true);log.setCheck('bluetooth','fail');return {...log.report(1000),userAgent:'test-browser',viewport:{width:390,height:844,pixelRatio:2},audio:{status:'muted',state:'running',ready:true,session:null,muted:true,musicVolume:.25,contextTime:1,sampleRate:48000,sources:0,music:null,buffers:2,rotors:0,friction:0,events:[{atMs:10,kind:'clock-stalled'}]}};}
test('診斷可跨實例保存，匯出保留原版本時間與人工結果但不繼續計時',()=>{
 const {make}=drafts(),a=make(),old=report();old.version='0.42.0';assert.equal(a.save(old,'2026-11-18T00:00:00.000Z'),true);
 const saved=make().load()!;assert.equal(saved.savedAt,'2026-11-18T00:00:00.000Z');assert.equal(saved.report.version,'0.42.0');assert.equal(saved.report.running,false);assert.equal(saved.interrupted,true);assert.equal(saved.report.activeMs,20);assert.equal(saved.report.checks.bluetooth,'fail');assert.equal(saved.report.checks.call,'untested');assert.equal(saved.report.audio.musicVolume,.25);
 assert.equal(make().clear(),true);assert.equal(make().load(),null);
});
test('拒絕損毀、過大、偽造戰績欄位和無效數值，不能污染匯出',()=>{
 const {entries,make}=drafts();const d=make();assert.equal(d.save(report()),true);const [key,raw]=[...entries][0];
 for(const bad of ['{', ' '.repeat(65537),JSON.stringify({...JSON.parse(raw),schema:9}),JSON.stringify({...JSON.parse(raw),report:{...report(),profile:{secret:true}}}),JSON.stringify({...JSON.parse(raw),report:{...report(),frames:-1}})]){entries.set(key,bad);assert.equal(make().load(),null);}
 const oversized=report();oversized.userAgent='a'.repeat(70000);assert.equal(d.save(oversized),false);
});
test('儲存空間或權限拒絕不影響遊戲，原草稿保持完整',()=>{
 const {entries,storage,make}=drafts();make().save(report());const before=[...entries];
 const d=new diagnostics.DiagnosticDraft(()=>({...storage,setItem:()=>{throw Error('quota');}}));assert.equal(d.save(report()),false);assert.deepEqual([...entries],before);
 const denied=new diagnostics.DiagnosticDraft(()=>{throw Error('SecurityError');});assert.equal(denied.load(),null);assert.equal(denied.save(report()),false);assert.equal(denied.clear(),false);
});
