import {test,expect} from '@playwright/test';import{writeFileSync}from'node:fs';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const sample=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).soak.snapshot());
test('同一組陀螺反覆重建後GPU資源回到相同數量',async({page})=>{
 await page.goto('/tests/fixtures/p0-soak.html');await page.locator('#start').tap();await page.waitForTimeout(1500);
 const initial=await sample(page);const snapshots=[];
 for(let i=0;i<12;i++){await page.evaluate(()=>(window as any).soak.reset());await page.waitForTimeout(400);snapshots.push(await sample(page));}
 const baselineBeforeWarm=await sample(page),baseline=await page.evaluate(()=>(window as any).soak.resourceSnapshot());
 for(let i=0;i<12;i++){await page.evaluate(()=>(window as any).soak.reset());await page.waitForTimeout(400);snapshots.push(await sample(page));}
 await page.waitForTimeout(1000);const endBeforeWarm=await sample(page),end=await page.evaluate(()=>(window as any).soak.resourceSnapshot());
 writeFileSync('artifacts/p0-resource-preflight-v0206.json',JSON.stringify({scope:'all-scene-geometries',initial,baselineBeforeWarm,baseline,endBeforeWarm,end,snapshots},null,2));
 expect(baseline.geometry).toBe(baseline.sceneGeometries);expect(end.geometry).toBe(end.sceneGeometries);expect(end.sceneGeometries).toBe(baseline.sceneGeometries);
 expect(end.geometry).toBe(baseline.geometry);expect(end.textures).toBe(baseline.textures);expect(end.programs).toBeLessThanOrEqual(baseline.programs+2);expect(end.audio.rotors).toBe(2);
});
