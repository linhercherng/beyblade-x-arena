import {test} from 'node:test';import assert from 'node:assert/strict';
import {DeviceCheck} from '../src/diagnostics.ts';
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
