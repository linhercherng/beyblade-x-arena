import {test,expect} from '@playwright/test';import{writeFileSync}from'node:fs';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
test('15分鐘合成交戰、150次換場與音訊恢復資源壓測',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/fixtures/p0-soak.html');await page.locator('#start').tap();const start=Date.now();
 const cdp=await page.context().newCDPSession(page);await page.waitForTimeout(30000);await cdp.send('HeapProfiler.collectGarbage');
 const baseline=await page.evaluate(()=>(window as any).soak.snapshot()),heapBefore=await cdp.send('Runtime.getHeapUsage'),samples=[];
 while(Date.now()-start<900000){
  await page.waitForTimeout(Math.min(15000,900000-(Date.now()-start)));
  if(samples.length%4===0)await page.locator('#recover').tap();
  const m=await page.evaluate(()=>(window as any).soak.snapshot());samples.push(m);
  writeFileSync('artifacts/p0-soak-progress-v0206.json',JSON.stringify({physicalIPhone:false,baseline,samples,errors},null,2));
  expect(m.geometry).toBeLessThanOrEqual(baseline.geometry+2);expect(m.textures).toBeLessThanOrEqual(baseline.textures+1);expect(m.programs).toBeLessThanOrEqual(baseline.programs+4);
  expect(m.audio.rotors).toBe(2);expect(m.audio.sources).toBeLessThanOrEqual(20);expect(m.audio.buffers).toBeLessThanOrEqual(2);expect(m.audio.events.length).toBeLessThanOrEqual(60);expect(m.particles).toBeLessThanOrEqual(360);
  if(samples.length%4===0)console.log(`SOAK ${Math.round((Date.now()-start)/1000)}s rounds=${m.rounds} geometries=${m.geometry} textures=${m.textures} voices=${m.audio.sources}`);
 }
 await cdp.send('HeapProfiler.collectGarbage');const heapAfter=await cdp.send('Runtime.getHeapUsage');
 expect(heapAfter.usedSize-heapBefore.usedSize).toBeLessThan(20000000);expect(errors).toEqual([]);
 const end=samples.at(-1);expect(end.rounds).toBeGreaterThanOrEqual(145);expect(Object.values(end.performance.checks).every(v=>v==='untested')).toBe(true);
 writeFileSync('artifacts/p0-soak-v0206.json',JSON.stringify({durationMs:Date.now()-start,physicalIPhone:false,syntheticEffects:true,heapBefore,heapAfter,baseline,end,samples,errors},null,2));await cdp.detach();
});
